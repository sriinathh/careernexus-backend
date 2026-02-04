// backend/src/routes/googleRoutes.js
import express from "express";
import passport from "../auth/googleAuth.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Google OAuth start
router.get("/auth/google", (req, res, next) => {
  console.log('🔵 Google OAuth initiated');
  // "prompt: 'select_account'" forces the user to choose an account every time
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })(req, res, next);
});

// Callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/student`
  }),
  (req, res) => {
    try {
      console.log('✅ Google OAuth callback received for:', req.user?.email);

      if (!req.user) {
        console.error('❌ No user in request after authentication');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/student?error=auth_failed_no_user`);
      }

      const token = jwt.sign(
        { id: req.user._id, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      console.log('🎟️ JWT token generated, redirecting to frontend success page');

      // redirect back to React with token
      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/success?token=${token}`;
      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/student?error=token_generation_failed&details=${encodeURIComponent(error.message)}`);
    }
  }
);

export default router;
