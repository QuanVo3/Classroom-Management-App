import nodemailer from "nodemailer";
import 'dotenv/config';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
if (!GMAIL_USER || !GMAIL_PASS || !GMAIL_USER) {
    throw new Error("Thiếu thông tiin email!");
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
    },
});
const sendStudentInvite = async (studentEmail: string, token: string): Promise<void> => {
    const verificationLink = `${BASE_URL}/api/users/verifyEmail/${token}`;

    const mailOptions = {
        from: GMAIL_USER,
        to: studentEmail,
        subject: "Xác nhận tài khoản học sinh",
        html: `
            <p>Xin chào,</p>
            <p>Bạn được mời tham gia lớp học. Vui lòng bấm vào link dưới đây để xác nhận tài khoản:</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>Nếu bạn không yêu cầu email này, vui lòng bỏ qua.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email xác nhận đã gửi tới: ${studentEmail}`);
    } catch (error) {
        console.error("Lỗi khi gửi email:", error);
        throw new Error("Không thể gửi email xác nhận. Vui lòng thử lại sau.");
    }
};

export { sendStudentInvite };