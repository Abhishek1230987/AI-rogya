import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const register = async (req, res) => {
  try {
    console.log("📝 Registration request received:", { body: req.body });
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        message: "Missing required fields",
        error: "Name, email, and password are required",
      });
    }

    console.log("🔍 Checking if user exists:", email);
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log("❌ User already exists:", email);
      return res
        .status(400)
        .json({ message: "User already exists", error: "User already exists" });
    }

    console.log("✅ Creating new user:", email);
    // Create new user
    const user = await User.create({
      name,
      email,
      password,
    });

    console.log("✅ User created successfully:", user.id);
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    console.log("✅ Token generated, sending response");
    res.status(201).json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Google OAuth callback
export const googleCallback = async (req, res) => {
  try {
    const { user } = req;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token
    const frontendURL = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(
      `${frontendURL}/auth/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify(user.toJSON())
      )}`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    const frontendURL = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${frontendURL}/login?error=auth_failed`);
  }
};
