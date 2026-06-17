import express from "express";
import { config } from "dotenv";
import { userRouter } from "./Routes/user.route.js";
import cookieParser from "cookie-parser";
config();
const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
//routes

app.use("/users", userRouter);

//listening to the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
