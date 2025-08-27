import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

type Role = "student" | "teacher";

const verifyToken = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) return res.status(401).json({ error: "Bạn chưa đăng nhập!" });

            const payload = jwt.verify(token, JWT_SECRET as string) as any;
            console.log("payload", payload);
            (req as any).user = payload; // gắn user info vào req
            next();
        } catch (err) {
            return res.status(401).json({ error: "Token không hợp lệ!" });
        }
    };
};


export { verifyToken };