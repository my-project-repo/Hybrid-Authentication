import { z } from "zod";
export const UserSchema = z.object({
    email: z.email(),
    password: z
        .string()
        .min(7, { message: "Minimum 7 characters required " })
        .max(14, { message: "Maximum 14 characters are allowed" }),
});
//# sourceMappingURL=user.schema.js.map