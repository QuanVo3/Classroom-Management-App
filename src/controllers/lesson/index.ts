import { Request, Response } from "express";
import { db } from "../../config/firebase";
import { randomUUID } from "crypto";

const assignLesson = async (req: Request, res: Response) => {
    const teacher = (req as any).user;
    const { title, description, studentIds } = req.body;

    if (teacher.role !== "teacher") {
        return res.status(403).json({ error: "Bạn không có quyền giao bài học." });
    }

    if (!title || !description || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: "Thiếu thông tin bài học hoặc danh sách học sinh." });
    }

    try {
        const lessonId = randomUUID();
        const createdAt = Date.now();

        // Tạo bài học
        const lesson = {
            id: lessonId,
            title,
            description,
            createdBy: teacher.id,
            assignedTo: studentIds,
            createdAt,
        };

        await db.collection("Lessons").doc(lessonId).set(lesson);

        // Tạo bản ghi Assignments cho từng học sinh
        const batch = db.batch();
        studentIds.forEach(studentId => {
            const assignmentRef = db.collection("Assignments").doc();
            batch.set(assignmentRef, {
                id: assignmentRef.id,
                lessonId,
                studentId,
                status: "assigned",
                assignedAt: createdAt,
            });
        });

        await batch.commit();

        return res.json({ success: true, message: "Đã giao bài học thành công.", lesson });
    } catch (error) {
        console.error("Lỗi khi giao bài học:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};

const deleteLesson = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const { id } = req.body;

    if (currentUser.role !== "teacher") {
        return res.status(403).json({ error: "Bạn không có quyền xoá bài học." });
    }

    if (!id) {
        return res.status(400).json({ error: "Thiếu ID bài học." });
    }

    try {
        const lessonDoc = await db.collection("Lessons").doc(id).get();
        if (!lessonDoc.exists) {
            return res.status(404).json({ error: "Bài học không tồn tại." });
        }
        const lessonData = lessonDoc.data();
        if (lessonData?.createdBy !== currentUser.id) {
            return res.status(403).json({ error: "Bạn không thể xoá bài học của người khác." });
        }
        await db.collection("Lessons").doc(id).delete();
        const assignmentsSnap = await db
            .collection("Assignments")
            .where("lessonId", "==", id)
            .get();

        const batch = db.batch();
        assignmentsSnap.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        return res.json({ success: true, message: "Đã xoá bài học và các giao bài liên quan." });
    } catch (error) {
        console.error("Lỗi khi xoá bài học:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};

const updateLesson = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;

    const { id, title, description } = req.body;

    if (currentUser.role !== "teacher") {
        return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bài học." });
    }

    if (!id || !title || !description) {
        return res.status(400).json({ error: "Thiếu thông tin bài học." });
    }

    try {
        const lessonRef = db.collection("Lessons").doc(id);
        const lessonDoc = await lessonRef.get();

        if (!lessonDoc.exists) {
            return res.status(404).json({ error: "Bài học không tồn tại." });
        }

        const lessonData = lessonDoc.data();
        if (lessonData?.createdBy !== currentUser.id) {
            return res.status(403).json({ error: "Bạn không thể chỉnh sửa bài học của người khác." });
        }
        await lessonRef.update({
            title,
            description,
            updatedAt: Date.now(),
        });

        return res.json({ success: true, message: "Đã cập nhật bài học thành công." });
    } catch (error) {
        console.error("Lỗi khi cập nhật bài học:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};


const getUserLessons = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;

    try {
        if (currentUser.role === "student") {
            const assignmentsSnap = await db
                .collection("Assignments")
                .where("studentId", "==", currentUser.id)
                .get();

            const assignments = assignmentsSnap.docs.map((doc) => doc.data());

            const lessonPromises = assignments.map(async (assignment) => {
                const lessonDoc = await db
                    .collection("Lessons")
                    .doc(assignment.lessonId)
                    .get();

                let lessonData: any = null;
                let teacherName: string | null = null;
                let teacherEmail: string | null = null;

                if (lessonDoc.exists) {
                    lessonData = lessonDoc.data();

                    // 🔹 Lấy thông tin giáo viên
                    if (lessonData?.createdBy) {
                        const teacherDoc = await db
                            .collection("Users")
                            .doc(lessonData.createdBy)
                            .get();

                        if (teacherDoc.exists) {
                            const teacher = teacherDoc.data() as { name?: string; email?: string };
                            teacherName = teacher.name || null;
                            teacherEmail = teacher.email || null;
                        }
                    }
                }

                return {
                    ...assignment,
                    lesson: lessonData,
                    teacherName,
                    teacherEmail,
                };
            });

            const lessonsWithStatus = await Promise.all(lessonPromises);
            return res.json({ success: true, lessons: lessonsWithStatus });
        }

        if (currentUser.role === "teacher") {
            const lessonsSnap = await db
                .collection("Lessons")
                .where("createdBy", "==", currentUser.id)
                .get();

            const lessons = lessonsSnap.docs.map((doc) => doc.data());
            return res.json({ success: true, lessons });
        }

        return res.status(403).json({ error: "Vai trò không hợp lệ." });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bài học:", error);
        return res
            .status(500)
            .json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};

const markLessonDone = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const { lessonId } = req.body;

    if (currentUser.role !== "student") {
        return res.status(403).json({ error: "Chỉ học sinh mới được phép đánh dấu hoàn thành bài học." });
    }

    if (!lessonId) {
        return res.status(400).json({ error: "Thiếu Lesson Id." });
    }

    try {
        const result = await db
            .collection("Assignments")
            .where("lessonId", "==", lessonId)
            .where("studentId", "==", currentUser.id)
            .limit(1)
            .get();

        if (result.empty) {
            return res.status(404).json({ error: "Không tìm thấy bài học được giao cho bạn." });
        }

        const assignmentRef = result.docs[0].ref;
        await assignmentRef.update({
            status: "done",
            updatedAt: Date.now(),
        });

        return res.json({ success: true, message: "Đã đánh dấu hoàn thành bài học." });
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái bài học:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};


export { assignLesson, getUserLessons, markLessonDone, deleteLesson, updateLesson };