import express from "express";
import cors from "cors";
import { db } from "./config/firebase";
import router from "./routes";


const app = express();
app.use(cors());
app.use(express.json());



app.use("/api", router);
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
