import express from "express";
import { userRouter } from "./routes/user.route.js";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
config();
const PORT = process.env.PORT || 3002;
const app = express();
// middlewares
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// routes
app.use("/user", userRouter);
// listening
app.listen(PORT, () => {
    console.log(`LISTENING AT ${PORT}`);
});
//# sourceMappingURL=server.js.map