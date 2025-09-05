import { Router } from "express";
import { requestCreateCode, validateAccessCode } from "../controllers";
import { verifyToken } from "../middlewares/jwt";
import {
    addStudent,
    updateUserInfo,
    deleteStudent,
    getStudentDetail,
    getAllStudents,
} from "../controllers/user";
import { refreshAccessToken, verifyStudentEmail } from "../controllers/auth";
import {
    assignLesson,

    deleteLesson,

    getUserLessons,
    markLessonDone,
    updateLesson,
} from "../controllers/lesson";
import { getConversation } from "../controllers/chat";

const router = Router();

// 🔐 Auth routes
router.use("/auth", Router()
    .post("/createAccessCode", async (req, res) => {
        try {
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                return res.status(400).json({ error: "Số điện thoại không hợp lệ!" });
            }
            await requestCreateCode(phoneNumber);
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
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict"
            });
            return res.json({ user: result.user, token: result.token });
        } catch (error) {
            return res.status(400).json({ success: false, error: (error as Error).message });
        }
    })
    .post("/refresh-token", async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            const result = await refreshAccessToken(refreshToken);
            if (!result) {
                return res.status(400).json({
                    success: false, error: "Refresh token không hợp lệ hoặc đã hết hạn"
                });
            }
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none"
            });
            return res.json({ user: result.user, token: result.token });
        } catch (error) {
            return res.status(400).json({ success: false, error: (error as Error).message });
        }
    })
);

// 👤 User routes
router.use("/users", Router()
    .post("/addStudent", verifyToken(), addStudent)
    .post("/verifyEmail/:token", verifyStudentEmail)
    .put("/editStudent", verifyToken(), updateUserInfo)
    .put("/editProfile", verifyToken(), updateUserInfo)
    .delete("/delete", verifyToken(), deleteStudent)
    .get("/students", verifyToken(), getStudentDetail)
    .get("/getAllStudents", verifyToken(), getAllStudents)
);

// 📚 Lesson routes
router.use("/lesson", Router()
    .post("/assignLesson", verifyToken(), assignLesson) // giáo viên giao bài
    .get("/myLessons", verifyToken(), getUserLessons) // học sinh xem bài
    .post("/markLessonDone", verifyToken(), markLessonDone) // học sinh đánh dấu hoàn thành
    .put("/updateLesson", verifyToken(), updateLesson)
    .delete("/deleteLesson", verifyToken(), deleteLesson) // giáo viên xoá bài

);

router.use("/chat", Router()
    .get("/messages", verifyToken(), getConversation) // lấy lịch sử tin nhắn
);


export default router;