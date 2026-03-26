import express from "express";
import passport from "../config/passport.js";
import {
  register,
  login,
  doctorLogin,
  doctorRegister,
  googleCallback,
} from "../controllers/auth.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Regular authentication routes
router.post("/register", register);
router.post("/login", login);
router.post("/doctor/login", doctorLogin);
router.post("/doctor/register", doctorRegister);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  googleCallback,
);

// Get current user (validate token)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        googleId: req.user.googleId,
        role: req.user.role || "patient",
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
