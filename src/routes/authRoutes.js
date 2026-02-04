import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerUser,
  resendOtp,
  verifyOtpController,
  loginUser,
  completeProfile,
  getMe,
  forgotPassword,
  resetPasswordController,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/send-otp', resendOtp);
router.post('/verify-otp', verifyOtpController);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordController);
router.post('/complete-profile', protect, completeProfile);
router.get('/me', protect, getMe);

// Admin/Faculty registration without OTP (for initial setup)
router.post('/create-admin-faculty', async (req, res, next) => {
  try {
    const { name, email, password, role, secretKey } = req.body;
    
    // Simple secret key check (you should use env variable)
    if (secretKey !== 'LEARNBRIDGE_ADMIN_SECRET_2024') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (!['admin', 'faculty'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or faculty' });
    }
    
    const existing = await import('../models/User.js').then(m => m.User.findOne({ email }));
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(password, 10);
    
    const { User } = await import('../models/User.js');
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      isVerified: true, // Pre-verified
    });
    
    console.log(`✅ ${role} user created:`, email);
    
    res.status(201).json({
      message: `${role} user created successfully`,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    next(err);
  }
});

export default router;
