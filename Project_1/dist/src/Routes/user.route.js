// ─── Imports ─────────────────────────────────────────────────────────────────
import express from "express";
import { validateUser, authenticationMiddleware, } from "../Middlewares/user.middleware.js";
import { registerUser, loginUser, getUserProfile, refreshTokenHandler, logoutUser, } from "../Controllers/user.controller.js";
// ─── Router Setup ─────────────────────────────────────────────────────────────
const userRouter = express.Router();
// ─── Routes ──────────────────────────────────────────────────────────────────
// POST /register   — Validate input, then create a new user account
userRouter.post("/register", validateUser, registerUser);
// POST /login      — Validate input, then authenticate and issue tokens
userRouter.post("/login", validateUser, loginUser);
// GET  /profile    — Protected: requires a valid JWT; returns the user's profile
userRouter.get("/profile", authenticationMiddleware, getUserProfile);
// POST /refresh    — Accepts a refresh token cookie and issues a new access token
userRouter.post("/refresh", refreshTokenHandler);
// POST /logout     — Revokes the session and clears the refresh token cookie
userRouter.post("/logout", logoutUser);
// ─── Exports ─────────────────────────────────────────────────────────────────
export { userRouter };
//# sourceMappingURL=user.route.js.map