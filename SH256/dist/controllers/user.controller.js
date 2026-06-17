import {} from "express";
import argon2 from "argon2";
const registerUser = async (req, res) => {
    const { email, password } = req.body;
    const hash = await argon2.hash(password);
    // store in db
};
//# sourceMappingURL=user.controller.js.map