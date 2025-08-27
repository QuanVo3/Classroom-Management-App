import { Request, Response } from "express";
import { db } from "../../config/firebase";
import { User } from "../../schema/user";
import { randomUUID } from "crypto";
import { sendStudentInvite } from "../nodemailer";
import { createToken } from "../../utils";


import 'dotenv/config'

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
    const { id, updateData } = req.body;

    if (!updateData) {
        return res.status(400).json({ error: "Thiếu thông tin cần cập nhật." });
    }

    try {
        if (user.role === "student") {
            if (user.id !== id) {
                return res.status(403).json({ error: "Không thể chỉnh sửa thông tin người khác." });
            }

            const allowedFields = ["name", "phone", "status"];
            const filteredData = Object.fromEntries(
                Object.entries(updateData).filter(([key]) => allowedFields.includes(key))
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
            if (!id) {
                return res.status(400).json({ error: "Thiếu ID người dùng cần cập nhật." });
            }

            await db.collection("Users").doc(id).update(updateData);
            const updatedUser = (await db.collection("Users").doc(id).get()).data();
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



export { addStudent, updateUserInfo };