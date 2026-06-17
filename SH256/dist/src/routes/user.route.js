import express from "express";
import { registerUser, loginUser, getFeed, refreshToken, } from "../controllers/user.controller.js";
import { validateUser, authenticateToken, } from "../middlewares/auth.middleware.js";
// /user route
const userRouter = express.Router();
// user / register;
userRouter.post("/register", validateUser, registerUser);
//  user/signin
userRouter.post("/login", loginUser);
// get
userRouter.get("/feed", authenticateToken, getFeed);
//refresh
userRouter.get("/refresh", refreshToken);
export { userRouter };
//# sourceMappingURL=user.route.js.map