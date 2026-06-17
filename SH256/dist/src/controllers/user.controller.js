import {} from "express";
import { postgres } from "../config/db.config.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
config();
const registerUser = async (req, res) => {
    const { email, password } = req.body;
    // checking for existing mail
    const existing = await postgres.user.findUnique({
        where: {
            email: email,
        },
    });
    if (existing) {
        return res.status(404).json({
            error: "Email already exists",
        });
    }
    const hash = await argon2.hash(password);
    // store in db
    const user = await postgres.user.create({
        data: {
            email: email,
            password: hash,
        },
    });
    if (!user) {
        res.status(404).json({
            errors: "User couldn't be created",
        });
    }
    res.status(201).json({
        message: "User created",
    });
};
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const user = await postgres.user.findUnique({
        where: {
            email,
        },
    });
    if (!user) {
        return res.status(404).json({ error: "Wrong credentials " });
    }
    const validate = await argon2.verify(user.password, password);
    if (!validate) {
        return res.status(404).json({ error: "Invalid Password" });
    }
    const payload = { userId: user.userId, email: user.email };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "15m",
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
    // storing refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
        message: "Login successful",
        accessToken,
        user: payload,
    });
};
const getFeed = async (req, res) => {
    const { userId, email } = req.user;
    const user = await postgres.user.findUnique({
        where: {
            userId,
        },
    });
    if (!user) {
        return res.status(401).json({ message: "User doesn't exist " });
    }
    const { password, ...userWithoutPass } = user;
    res.status(201).json({
        data: userWithoutPass,
    });
};
const refreshToken = async (req, res) => {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
        return res.status(401).json({ error: "No refresh token" });
    }
    try {
        // Verify the old refresh token
        const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
        // Generate NEW refresh token (rotating!)
        const newRefreshToken = jwt.sign({ userId: decoded.userId, email: decoded.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
        // Generate new access token
        const newAccessToken = jwt.sign({ userId: decoded.userId, email: decoded.email }, process.env.JWT_SECRET, { expiresIn: "15m" });
        // Replace the old refresh token with the new one in cookie
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000, // New 30 days
        });
        res.status(200).json({ accessToken: newAccessToken });
    }
    catch (error) {
        res.status(401).json({ error: "Invalid refresh token" });
    }
};
export { registerUser, loginUser, getFeed, refreshToken };
//# sourceMappingURL=user.controller.js.map