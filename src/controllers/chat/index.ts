import { Request, Response } from "express";
import { db } from "../../config/firebase";

 const getConversation = async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const peerUserId = req.query.peerUserId as string;

    if (!peerUserId) {
        return res.status(400).json({ error: "Thiếu peerUserId" });
    }

    try {
        const messagesSnap = await db
            .collection("Messages")
            .where("from", "in", [currentUser.id, peerUserId])
            .where("to", "in", [currentUser.id, peerUserId])
            .orderBy("createdAt", "asc")
            .get();

        const messages = messagesSnap.docs.map((doc) => doc.data());

        return res.json({ success: true, messages });
    } catch (error) {
        console.error("Lỗi khi lấy tin nhắn:", error);
        return res.status(500).json({ error: "Lỗi máy chủ" });
    }
};

export { getConversation };