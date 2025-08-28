import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { setupSocket } from "./config/socket";
import cookieParser from "cookie-parser";

app.use(cookieParser());
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // hoặc FE origin của bạn
        methods: ["GET", "POST"],
        credentials: true,
    },
});

setupSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});