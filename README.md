# Classroom-Management-App

# 📚 Hệ thống Quản Lý Lớp Học – Backend

Backend được xây dựng với **Node.js + TypeScript** và sử dụng **Firebase Firestore** làm cơ sở dữ liệu.

## 🚀 Yêu cầu môi trường

- Node.js >= 16
- Yarn hoặc npm
- Tài khoản Firebase với Firestore đã kích hoạt
- (Tùy chọn) Tài khoản [Vonage](https://www.vonage.com/) để gửi OTP qua SMS

---

## ⚙️ Cài đặt và chạy dự án

1. **Clone repository**
   ```bash
   git clone <link-repo>
   cd <tên-thư-mục-backend>

2. Cài đặt dependencies
npm install
# hoặc
yarn install

3.Tạo tài khoản vonage và lấy key sau đó thêm vào .env
# Nếu muốn dùng Vonage để gửi OTP
VONAGE_API_KEY=...
VONAGE_API_SECRET=...

4.Chạy dự án
npm run dev   # chạy development với nodemon

🔑 Lưu ý về OTP và Vonage
Hiện tại dự án sử dụng Vonage SMS API để gửi mã OTP xác thực số điện thoại.
⚠ Quan trọng:
Với tài khoản Vonage Free, SMS chỉ gửi được đến số điện thoại mà bạn đã đăng ký xác minh trong dashboard Vonage.
Vì vậy, nếu bạn test với số khác, OTP sẽ không nhận được.

🔹 Nếu muốn test nhanh bỏ qua xác thực OTP
Bạn có thể comment các phần code tạo & kiểm tra OTP trong 2 hàm:
1. requestCreateCode
const requestCreateCode = async (phoneNumber: string, role: "student" | "teacher" = "student") => {
  try {
    // ❌ Bỏ qua khi test:
    // const code = generateCode();
    // const expiresAt = Date.now() + 5 * 60 * 1000;
    // await db.collection("AccessCodes").doc(phoneNumber).set({...});
    // await vonage.sms.send({...});

    return { success: true, message: "Đã gửi mã xác thực qua SMS" };
  } catch (error) {
    console.error("Gửi mã SMS thất bại:", error);
    throw new Error("Không thể gửi mã SMS");
  }
2. validateAccessCode
const validateAccessCode = async (code: string, phoneNumber: string) => {
  try {
    // ❌ Bỏ qua kiểm tra OTP khi test:
    // const docRef = db.collection("AccessCodes").doc(phoneNumber);
    // const doc = await docRef.get();
    // if (!doc.exists) throw new Error("Không tìm thấy mã...");
    // if (Date.now() > expiresAt) throw new Error("Mã đã hết hạn");
    // if (code !== savedCode) throw new Error("Mã không đúng");
    // await docRef.delete();

    // Tìm hoặc tạo user luôn
    const result = await db.collection("Users").where("phone", "==", phoneNumber).limit(1).get();
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

    return { user, token: createToken(user), refreshToken: createRefreshToken(user) };
  } catch (error) {
    console.error("Xác minh mã OTP thất bại:", error);
    throw error;
  }
};


🔹 Nếu muốn test OTP thật
- Tạo tài khoản tại Vonage.
- Xác thực email và đăng nhập dashboard.
- Thêm số điện thoại test vào phần Numbers và Verify số này.
- Lấy VONAGE_API_KEY và VONAGE_API_SECRET chèn vào file .env.



