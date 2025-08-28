import express from "express";
import cors from "cors";
import router from "./routes"; import cookieParser from "cookie-parser";




const app = express();
app.use(cors({
  origin: "http://localhost:3000", // ✅ phải là origin cụ thể, không được dùng "*"
  credentials: true,               // ✅ bắt buộc nếu FE dùng withCredentials
})
);
app.use(cookieParser());
app.use(express.json());
app.use("/api", router);
export default app;