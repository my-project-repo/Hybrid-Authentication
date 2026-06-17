import { z } from "zod";
declare const userSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export { userSchema };
//# sourceMappingURL=user.schema.d.ts.map