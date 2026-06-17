// ─── Imports ─────────────────────────────────────────────────────────────────
import { type RequestHandler } from "express";
import { postgres } from "../Schemas/db.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { randomUUID } from "crypto";
config();

// ─── Constants ───────────────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET as string;

// ─── Register User ───────────────────────────────────────────────────────────
// Handles new user registration. Validates that the email is not already taken,
// hashes the password with Argon2, and stores the user in the database.
const registerUser: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if a user with this email already exists
    const oldUser = await postgres.user.findUnique({ where: { email } });
    if (oldUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before storing it
    const passwordHash = await argon2.hash(password);

    // Create the new user record in the database
    const newUser = await postgres.user.create({
      data: { email, password: passwordHash },
    });

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// ─── Login User ──────────────────────────────────────────────────────────────
// Authenticates a user with email and password. On success, issues a short-lived
// access token (15 min) and a long-lived refresh token (30 days) stored as an
// httpOnly cookie. A session record is created to track the refresh token.
const loginUser: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Look up the user by email
    const user = await postgres.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) return res.status(401).json({ message: "User does not exist" });

    // Verify the provided password against the stored hash
    const verify = await argon2.verify(user.password, password);
    if (!verify) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // ── Credentials matched — generate tokens ──────────────────────────────
    const sessionId = randomUUID(); // Unique session identifier

    // Payload for the short-lived access token
    const payload = {
      id: user.id,
      email: user.email,
    };

    // Payload for the long-lived refresh token (includes sessionId for rotation)
    const payloadRefresh = {
      id: user.id,
      email: user.email,
      sessionId,
    };

    // Sign tokens with the secret and appropriate expiry
    const accessToken = jwt.sign(payload, SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(payloadRefresh, SECRET, {
      expiresIn: "30d",
    });

    // Hash the refresh token before persisting it
    const hashedRefreshToken = await argon2.hash(refreshToken);

    // Create a session record in the database
    const session = await postgres.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    // Set the refresh token as an httpOnly cookie
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
  } catch (error) {
    res.status(401).json({ message: "Wrong user credentials" });
  }
};

// ─── Get User Profile ────────────────────────────────────────────────────────
// Returns the authenticated user's profile. Relies on the auth middleware to
// attach the user object to the request (req.user).
const getUserProfile: RequestHandler = async (req: any, res) => {
  try {
    const userProfile = req.user;

    res.status(200).json({
      message: "User profile retrieved successfully",
      user: userProfile,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// ─── Refresh Token Handler ───────────────────────────────────────────────────
// Validates the refresh token from the httpOnly cookie, checks the session
// status (exists, not revoked, not expired), and issues a new access token
// along with a rotated refresh token (token rotation).
const refreshTokenHandler: RequestHandler = async (req, res) => {
  try {
    // Extract the refresh token from the cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token not found",
      });
    }

    // Verify and decode the refresh token
    const decoded = jwt.verify(refreshToken, SECRET) as {
      id: string;
      email: string;
      sessionId: string;
    };

    // Look up the corresponding session in the database
    const session = await postgres.session.findUnique({
      where: {
        id: decoded.sessionId,
      },
    });

    // ── Session validation checks ──────────────────────────────────────────
    if (!session) {
      return res.status(401).json({
        message: "Session not found",
      });
    }

    if (session.isRevoked) {
      return res.status(401).json({
        message: "Session revoked",
      });
    }

    if (session.expiresAt < new Date()) {
      return res.status(401).json({
        message: "Session expired",
      });
    }

    // Verify the refresh token hash matches the stored hash
    const isValidRefreshToken = await argon2.verify(
      session.refreshTokenHash,
      refreshToken,
    );

    if (!isValidRefreshToken) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    // ── Issue new tokens (token rotation) ──────────────────────────────────
    // New access token
    const accessToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
      },
      SECRET,
      {
        expiresIn: "15m",
      },
    );

    // New refresh token (same sessionId — keeps the session alive)
    const newRefreshToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        sessionId: decoded.sessionId,
      },
      SECRET,
      {
        expiresIn: "30d",
      },
    );

    // Hash and persist the new refresh token, update last-used timestamp
    const hashedRefreshToken = await argon2.hash(newRefreshToken);

    await postgres.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: hashedRefreshToken,
        lastUsedAt: new Date(),
      },
    });

    // Set the rotated refresh token as an httpOnly cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      message: "Invalid or expired refresh token",
    });
  }
};

// ─── Logout User ─────────────────────────────────────────────────────────────
// Revokes the user's session and clears the refresh token cookie. If the token
// is invalid or expired, the cookie is still cleared so the client is logged out.
const logoutUser: RequestHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Decode the refresh token to get the session ID
      const decoded = jwt.verify(refreshToken, SECRET) as {
        sessionId: string;
      };

      // Mark the session as revoked
      await postgres.session.update({
        where: {
          id: decoded.sessionId,
        },
        data: {
          isRevoked: true,
        },
      });
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    // Even if token verification fails, clear the cookie
    res.clearCookie("refreshToken");

    return res.status(200).json({
      message: "Logout successful",
    });
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────
export {
  registerUser,
  loginUser,
  getUserProfile,
  refreshTokenHandler,
  logoutUser,
};
