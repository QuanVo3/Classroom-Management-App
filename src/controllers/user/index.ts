import { Request, Response } from "express";
import { db } from "../../config/firebase";
import { User } from "../../schema/user";
import { randomUUID } from "crypto";
import { sendStudentInvite } from "../nodemailer";
import { createToken } from "../../utils";


import 'dotenv/config'
const getAllStudents = async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Bạn không có quyền để thực hiện chức năng này." });
    }
    try {
        const result = await db
            .collection("Users")
            .where("role", "==", "student")
            .get();

        const students = result.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.json({ success: true, students });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách học sinh:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }

}
const addStudent = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { name, phone, email } = req.body;

    if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Bạn không có quyền thêm học sinh." });
    }

    if (!name || !phone || !email) {
        return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin." });
    }

    try {
        const existing = await db.collection("Users")
            .where("phone", "==", phone)
            .get();

        if (!existing.empty) {
            return res.status(400).json({ error: "Học sinh đã tồn tại." });
        }

        const id = randomUUID();
        const newStudent = {
            id: id,
            name: name,
            phone: phone,
            email: email,
            status: "pending",
            role: "student",
        } as User;

        const token = createToken(newStudent);

        await db.collection("Users").doc(id).set(newStudent);
        await sendStudentInvite(email, token);

        return res.json({ success: true, user: newStudent });
    } catch (error) {
        console.error("Lỗi khi thêm học sinh:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};


const updateUserInfo = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {  data } = req.body;
    console.log('data', data);
    if (!data) {
        return res.status(400).json({ error: "Thiếu thông tin cần cập nhật." });
    }

    try {
        if (user.role === "student") {
            if (user.id !== data?.id) {
                return res.status(403).json({ error: "Không thể chỉnh sửa thông tin người khác." });
            }

            const allowedFields = ["name", "phone", "status"];
            const filteredData = Object.fromEntries(
                Object.entries(data).filter(([key]) => allowedFields.includes(key))
            );

            await db.collection("Users").doc(user.id).update(filteredData);
            const updatedUser = (await db.collection("Users").doc(user.id).get()).data();
            return res.json({
                success: true,
                message: "Cập nhật thông tin học sinh thành công.",
                user: updatedUser,
            });
        }

        if (user.role === "teacher") {
            if (!data?.id) {
                return res.status(400).json({ error: "Thiếu ID người dùng cần cập nhật." });
            }

            await db.collection("Users").doc(data?.id).update(data);
            const updatedUser = (await db.collection("Users").doc(data?.id).get()).data();
            return res.json({
                success: true,
                message: "Cập nhật thông tin thành công.",
                user: updatedUser,
            });
        }

        return res.status(403).json({ error: "Vai trò không hợp lệ." });
    } catch (error) {
        console.error("Lỗi cập nhật thông tin:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};
const getStudentDetail = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const { id } = req.params;

    if (currentUser.role !== "teacher") {
        return res.status(403).json({ error: "Bạn không có quyền truy cập thông tin học sinh." });
    }

    if (!id) {
        return res.status(400).json({ error: "Thiếu ID học sinh." });
    }

    try {
        // Lấy thông tin học sinh
        const studentDoc = await db.collection("Users").doc(id).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ error: "Không tìm thấy học sinh." });
        }

        const studentData = studentDoc.data();
        if (studentData?.role !== "student") {
            return res.status(403).json({ error: "Người dùng này không phải học sinh." });
        }

        // Lấy danh sách bài học đã giao
        const assignmentsSnapshot = await db
            .collection("Assignments")
            .where("studentId", "==", id)
            .get();

        const assignments = await Promise.all(
            assignmentsSnapshot.docs.map(async doc => {
                const assignment = doc.data();
                const lessonDoc = await db.collection("Lessons").doc(assignment.lessonId).get();
                return {
                    ...assignment,
                    lesson: lessonDoc.exists ? lessonDoc.data() : null,
                };
            })
        );

        return res.json({
            success: true,
            student: studentData,
            lessons: assignments,
        });
    } catch (error) {
        console.error("Lỗi khi lấy thông tin học sinh:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};

const deleteStudent = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const { id } = req?.body;

    if (currentUser.role !== "teacher") {
        return res.status(403).json({ error: "Bạn không có quyền thực hiện chức năng này." });
    }

    if (!id) {
        return res.status(400).json({ error: "Thiếu ID học sinh cần xóa." });
    }

    try {
        const userRef = db.collection("Users").doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "Không tìm thấy học sinh." });
        }

        const userData = userDoc.data();
        if (userData?.role !== "student") {
            return res.status(403).json({ error: "Chỉ được phép xóa người dùng có vai trò học sinh." });
        }

        await userRef.delete();

        return res.json({ success: true, message: "Đã xóa học sinh thành công." });
    } catch (error) {
        console.error("Lỗi khi xóa học sinh:", error);
        return res.status(500).json({ error: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
};


export { addStudent, updateUserInfo, getAllStudents, deleteStudent, getStudentDetail };