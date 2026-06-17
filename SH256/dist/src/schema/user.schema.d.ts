import { z } from "zod";
export declare const UserSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export type User = z.infer<typeof UserSchema>;
//# sourceMappingURL=user.schema.d.ts.map