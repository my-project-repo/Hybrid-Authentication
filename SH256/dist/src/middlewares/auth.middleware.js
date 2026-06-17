import { UserSchema } from "../schema/user.schema.js";
import jwt from "jsonwebtoken";
export const validateUser = (req, res, next) => {
    const result = UserSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            errors: result.error.flatten(),
        });
        return;
    }
    req.body = result.data;
    next();
};
export const authenticateToken = (req, res, next) => {
    try {
        const accessToken = req.headers.authorization?.split(" ")[1];
        if (!accessToken) {
            return res.status(401).json({ message: "Token not found " });
        }
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Token could not be verified " });
    }
};
//# sourceMappingURL=auth.middleware.js.map