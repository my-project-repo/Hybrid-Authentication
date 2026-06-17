import { z } from "zod";
const userSchema = z.object({
    email: z.email(),
    password: z
        .string()
        .min(6, { message: "Minimum 6 letters required" })
        .max(100, { message: "Maximum 100 letters allowed" }),
});
export { userSchema };
//# sourceMappingURL=user.schema.js.map