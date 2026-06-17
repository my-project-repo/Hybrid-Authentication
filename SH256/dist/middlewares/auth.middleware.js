import { UserSchema } from "../schema/user.schema.js";
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
//# sourceMappingURL=auth.middleware.js.map