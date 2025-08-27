import { Router } from "express";

import { requestCreateCode, validateAccessCode } from "../controllers";
import { verifyToken } from "../middlewares/jwt";
import { addStudent, updateUserInfo } from "../controllers/user";
import { verifyStudentEmail } from "../controllers/auth";

const router = Router();

//Auth routes
router.use("/auth", Router()

    .post("/createAccessCode/:phoneNumber", async (req, res) => {
        try {
            const phoneNumber = req?.params?.phoneNumber; // lấy từ parms
            if (!phoneNumber) {
                return res.status(400).json({ error: "Số điện thoại không hợp lệ!" });
            }
            const result = await requestCreateCode(phoneNumber);
            console.log("result", result, phoneNumber);
            return res.json({ message: "Đã gửi mã xác thực" });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    })
    .post("/verify-code", async (req, res) => {
        try {
            const { code, phoneNumber } = req.body;
            const result = await validateAccessCode(code, phoneNumber);
            if (!result) {
                return res.status(400).json({ success: false, error: "Mã OTP không hợp lệ" });
            }
            res.cookie("refreshToken", result?.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict"
            });
            return res.json({ user: { ...result?.user }, token: result?.token });
        } catch (error) {
            return res.status(400).json({ success: false, error: (error as Error).message });
        }
    })


);

router.use("/users", Router()
    .post("/addStudent", verifyToken(), addStudent
    )
    .post("/verifyEmail/:token", verifyStudentEmail)
    .put("/editStudent", verifyToken(), updateUserInfo)
    .put("/editProfile", verifyToken(), updateUserInfo)
)


export default router;
