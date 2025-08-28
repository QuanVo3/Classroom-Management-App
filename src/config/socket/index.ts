import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { db } from "../firebase";
import dotenv from "dotenv";

import 'dotenv/config'
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

export const setupSocket = (io: Server) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Thiếu token"));

        try {
            const user = jwt.verify(token, JWT_SECRET!);
            socket.data.user = user;
            next();
        } catch (err) {
            next(new Error("Token không hợp lệ"));
        }
    });

    io.on("connection", (socket) => {
        const user = socket.data.user;
        console.log(`🔌 ${user.id} đã kết nối`);

        socket.join(`user:${user.id}`);

        socket.on("send_message", async ({ toUserId, text }) => {
            const message = {
                from: user.id,
                to: toUserId,
                text,
                createdAt: Date.now(),
            };

            io.to(`user:${toUserId}`).emit("receive_message", message);

            await db.collection("Messages").add(message);
        });

        socket.on("disconnect", () => {
            console.log(`❌ ${user.id} đã ngắt kết nối`);
        });
    });
};