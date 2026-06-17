// ─── Imports ─────────────────────────────────────────────────────────────────
import {} from "express";
import { userSchema } from "../Schemas/user.schema.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
config();
// ─── Constants ───────────────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET;
// ─── Validate User Input ─────────────────────────────────────────────────────
// Validates the incoming request body against the user schema (Zod).
// If validation fails, returns a 400 response; otherwise passes to the next handler.
const validateUser = (req, res, next) => {
    try {
        const result = userSchema.safeParse(req.body);
        if (!result.success) {
            return res
                .status(400)
                .json({ message: "Invalid request data", error: "Invalid input" });
        }
        next();
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
// ─── Authentication Middleware ───────────────────────────────────────────────
// Extracts the JWT from the Authorization header (Bearer scheme), verifies it,
// and attaches the decoded payload to req.user. Returns 401 on missing or invalid tokens.
const authenticationMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Authorization header missing" });
    }
    // Extract the token from "Bearer <token>"
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token missing" });
    }
    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Invalid token", error });
    }
};
// ─── Exports ─────────────────────────────────────────────────────────────────
export { validateUser, authenticationMiddleware };
//# sourceMappingURL=user.middleware.js.map