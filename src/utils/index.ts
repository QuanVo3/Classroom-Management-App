import jwt from "jsonwebtoken";
import 'dotenv/config'
import { User } from "../schema/user";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET_REFRESH_TOKEN = process.env.JWT_SECRET_REFRESH_TOKEN;

//sinh mã 6 số ngẫu nhiên


//hàm tạo token
const createToken = (user: User) => {
  return jwt.sign({ id: user?.id, phone: user?.phone, role: user?.role }, JWT_SECRET as string, {
    expiresIn: "30m",
  });
};

//Hàm tạo refresh token
const createRefreshToken = (user: User) => {
  return jwt.sign({ id: user.id, phone: user?.phone, role: user?.role }, JWT_SECRET_REFRESH_TOKEN as string, {
    expiresIn: "7d",
  });
};

export {

  createToken,
  createRefreshToken,
};
