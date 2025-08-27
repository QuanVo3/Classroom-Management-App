import { Vonage } from "@vonage/server-sdk";
import { VerifyWorkflows } from "@vonage/verify";
import dotenv from "dotenv";
import {
  createToken,
  createRefreshToken,
} from '../../utils'
import { db } from "../../config/firebase";
import { User } from "../../schema/user";
import { randomUUID } from "crypto";

dotenv.config();
const apiSecret = process.env.VONAGE_API_SECRET
const apiKey = process.env.NEXTMO_API_KEY
const vonage = new Vonage({
  apiKey: apiKey,
  apiSecret: apiSecret // if you want to manage your secret, please do so by visiting your API Settings page in your dashboard
});
//Dùng sdk nonage gửi sms
const requestCreateCode = async (phoneNumber: string) => {

  try {
    const res = await vonage?.verify?.start({
      number: phoneNumber,
      brand: "App Test",
      workflowId: VerifyWorkflows?.SMS_SMS,
      codeLength: 6,
    })
    if (!res || res.status !== "0") {
      // Vonage trả về lỗi
      throw new Error(`Gửi mã SMS thất bại`);
    }
    // trả req id về client
    console.log("res", res);
    return res?.request_id
  } catch (error) {
    console.error("Gửi mã SMS thất bại:", error);
    throw new Error("Không thể gửi mã SMS");
  }
};

const validateAccessCode = async (
  requestId: string,
  code: string,
  phoneNumber: string,

) => {
  try {
    // xác minh otp => kiểm tra sdt có trong db chưa?
    // nếu có thì gửi token + refresh token, thông tin user về
    // nếu không thì tạo r gửi tt trên về
    //await vonage.verify.check(requestId, code);

    const userRef = db.collection("Users").doc(phoneNumber);
    let user: User;
    const userDoc = await userRef.get();

    if (!userDoc?.exists) {
      user = { id: randomUUID(), phone: phoneNumber, name: "", role: "teacher", email: "", status: "active" };
      await userRef.set(user);
    } else {
      user = userDoc?.data() as User;
    }
    const accessToken = createToken(user);
    const refreshToken = createRefreshToken(user);
    return { user: { ...user }, token: accessToken, refreshToken: refreshToken };
  } catch (err) {
    console.error("Check OTP thất bại:", err);
    return false;
  }
};
export { requestCreateCode, validateAccessCode };
