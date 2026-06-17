import express from "express";
import { userRouter } from "./routes/user.route.js";
import { config } from "dotenv";
config();
const PORT = process.env.PORT || 3002;
const app = express();
// middlewares
app.use(express.json());
// routes
app.use("/user", userRouter);
// listening
app.listen(PORT, () => {
    console.log(`LISTENING AT ${PORT}`);
});
//# sourceMappingURL=server.js.map