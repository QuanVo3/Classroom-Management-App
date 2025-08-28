import { Vonage } from "@vonage/server-sdk";
import { VerifyWorkflows } from "@vonage/verify";
import dotenv from "dotenv";
import {
  createToken,
  createRefreshToken,
  generateCode,
} from '../../utils'
import { db } from "../../config/firebase";
import { User } from "../../schema/user";
import { randomUUID } from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import 'dotenv/config'
const JWT_SECRET_REFRESH_TOKEN = process.env.JWT_SECRET_REFRESH_TOKEN
const JWT_SECRET = process.env.JWT_SECRET;
dotenv.config();
const apiSecret = process.env.VONAGE_API_SECRET
const apiKey = process.env.NEXTMO_API_KEY
const vonage = new Vonage({
  apiKey: apiKey,
  apiSecret: apiSecret // if you want to manage your secret, please do so by visiting your API Settings page in your dashboard
});
//Dùng sdk nonage gửi sms
// Gửi mã OTP qua SMS và lưu vào Firestore
const requestCreateCode = async (phoneNumber: string, role: "student" | "teacher" = "student") => {
  try {
    // const code = generateCode();
    // const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    // // Lưu vào Firestore
    // await db.collection("AccessCodes").doc(phoneNumber).set({
    //   code,
    //   expiresAt,
    //   createdAt: Date.now(),
    //   role, // lưu role để khi validate biết tạo user loại gì
    // });

    // // Gửi SMS qua Vonage
    // await vonage.sms.send({
    //   to: phoneNumber,
    //   from: "App Test",
    //   text: `Mã xác thực của bạn là: ${code}. Có hiệu lực trong 5 phút.`,
    // });

    return { success: true, message: "Đã gửi mã xác thực qua SMS" };
  } catch (error) {
    console.error("Gửi mã SMS thất bại:", error);
    throw new Error("Không thể gửi mã SMS");
  }
};

// Xác minh OTP và trả token
const validateAccessCode = async (code: string, phoneNumber: string) => {
  try {
    // const docRef = db.collection("AccessCodes").doc(phoneNumber);
    // const doc = await docRef.get();

    // if (!doc.exists) {
    //   throw new Error("Không tìm thấy mã cho số điện thoại này");
    // }

    // const { code: savedCode, expiresAt, role } = doc.data() as {
    //   code: string;
    //   expiresAt: number;
    //   role: "student" | "teacher";
    // };

    // if (Date.now() > expiresAt) {
    //   throw new Error("Mã đã hết hạn");
    // }

    // if (code !== savedCode) {
    //   throw new Error("Mã không đúng");
    // }

    // // Xóa code sau khi dùng
    // await docRef.delete();

    // Tìm hoặc tạo user
    const result = await db
      .collection("Users")
      .where("phone", "==", phoneNumber)
      .limit(1)
      .get();

    let user: User;
    if (!result.empty) {
      user = result.docs[0].data() as User;
    } else {
      user = {
        id: randomUUID(),
        phone: phoneNumber,
        name: "",
        role: "student",
        email: "",
        status: "active",
      };
      await db.collection("Users").doc(user.id as string).set(user);
    }

    return {
      user,
      token: createToken(user),
      refreshToken: createRefreshToken(user),
    };
  } catch (error) {
    console.error("Xác minh mã OTP thất bại:", error);
    throw error; // để FE nhận được thông báo lỗi cụ thể
  }
};
const refreshAccessToken = async (refreshToken: string) => {
  try {


    if (!refreshToken) {
      throw new Error("Thiếu refreshToken");
    }

    // Xác minh refresh token
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET_REFRESH_TOKEN as string);
    } catch (err) {
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
    }

    const userId = payload.id;
    if (!userId) {
      throw new Error("Refresh token không chứa thông tin id");
    }

    // Lấy thông tin người dùng mới nhất từ DB
    const userDoc = await db.collection("Users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error("Không tìm thấy người dùng");
    }

    const user = userDoc.data() as User;
    if (user.status !== "active") {
      throw new Error("Tài khoản đã bị khoá hoặc chưa kích hoạt");
    }



    return ({
      token: createToken(user),
      user, // gửi kèm để FE update nếu cần
      refreshToken: createRefreshToken(user),
    });
  } catch (error) {
    console.error("Lỗi refresh token:", error);
    throw new Error("Lỗi máy chủ, vui lòng thử lại sau.");
  }
};


const verifyStudentEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) return res.status(400).json({ error: "Thiếu token." });

    let userData: any;
    try {
      userData = jwt.verify(token, JWT_SECRET as string);
    } catch (err) {
      return res.status(400).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
    }

    const userRef = db.collection("Users").doc(userData.id);

    // cập nhật trạng thái pending -> active
    await userRef.update({ status: "active" });

    const updatedUser = (await userRef.get()).data();

    return res.json({
      success: true,
      message: "Xác thực email thành công.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Lỗi verify email:", err);
    return res.status(500).json({ error: "Lỗi server." });
  }
};
export { requestCreateCode, validateAccessCode, verifyStudentEmail, refreshAccessToken };
