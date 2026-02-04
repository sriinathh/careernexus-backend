import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { generateOTP } from '../utils/generateOTP.js';
import { sendOtpEmail } from '../services/emailService.js';


// POST /api/auth/register
export const registerUser = async (req, res, next) => {
  try {
    console.log('📝 Registration attempt:', req.body.email);
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    console.log('🔑 Generated OTP:', otp);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      otp,
      otpExpiresAt,
      isVerified: false, // Require email verification
    });
    
    console.log('✅ User created:', user.email);

    // Send OTP email
    console.log('📧 Sending OTP email to:', email);
    await sendOtpEmail(email, otp);
    console.log('✅ OTP email sent successfully');

    res.status(201).json({
      message: 'Registration successful! Please check your email for OTP verification.',
      email: email,
    });
  } catch (err) {
    console.error('❌ Registration error:', err.message);
    next(err);
  }
};

// POST /api/auth/send-otp
export const resendOtp = async (req, res, next) => {
  try {
    console.log('🔄 Resend OTP request for:', req.body.email);
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    
    console.log('🔑 New OTP generated:', otp);
    console.log('📧 Sending OTP email to:', email);

    await sendOtpEmail(email, otp);
    console.log('✅ OTP resent successfully');
    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    console.error('❌ Resend OTP error:', err.message);
    next(err);
  }
};

// POST /api/auth/verify-otp
export const verifyOtpController = async (req, res, next) => {
  try {
    console.log('🔐 OTP verification attempt for:', req.body.email);
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otpExpiresAt) {
      console.log('❌ Invalid OTP request');
      return res.status(400).json({ message: 'Invalid OTP request' });
    }
    console.log('Stored OTP:', user.otp, 'Provided OTP:', otp);
    console.log('OTP expires at:', user.otpExpiresAt, 'Current time:', new Date());
    if (user.otp !== otp || user.otpExpiresAt < new Date()) {
      console.log('❌ OTP invalid or expired');
      return res.status(400).json({ message: 'OTP invalid or expired' });
    }
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    console.log('✅ Email verified successfully for:', email);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('❌ Verification error:', err.message);
    next(err);
  }
};

// POST /api/auth/login
export const loginUser = async (req, res, next) => {
  try {
    console.log('🔑 Login attempt for:', req.body.email);
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      console.log('⚠️ Email not verified for:', email);
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email first.',
        needsVerification: true,
        email: email
      });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('❌ Invalid password');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    const cleanUser = user.toObject();
    delete cleanUser.password;
    
    console.log('✅ Login successful for:', email);

    res.json({ token, user: cleanUser });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    next(err);
  }
};

// POST /api/auth/complete-profile
export const completeProfile = async (req, res, next) => {
  try {
    const { year, branch, skills, interests } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profile = {
      ...user.profile,
      year: year ?? user.profile.year,
      branch: branch ?? user.profile.branch,
      skills: skills ?? user.profile.skills,
      interests: interests ?? user.profile.interests,
    };

    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    res.json(req.user);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    console.log('🔐 Forgot password request for:', req.body.email);
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    
    console.log('🔑 Password reset OTP generated:', otp);
    console.log('📧 Sending OTP email to:', email);

    await sendOtpEmail(email, otp, 'reset');
    console.log('✅ Password reset OTP sent successfully');
    res.json({ message: 'OTP sent to your email for password reset', email });
  } catch (err) {
    console.error('❌ Forgot password error:', err.message);
    next(err);
  }
};

// POST /api/auth/reset-password
export const resetPasswordController = async (req, res, next) => {
  try {
    console.log('🔄 Reset password attempt for:', req.body.email);
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otpExpiresAt) {
      console.log('❌ Invalid reset request');
      return res.status(400).json({ message: 'Invalid password reset request' });
    }
    
    console.log('Stored OTP:', user.otp, 'Provided OTP:', otp);
    console.log('OTP expires at:', user.otpExpiresAt, 'Current time:', new Date());
    
    if (user.otp !== otp || user.otpExpiresAt < new Date()) {
      console.log('❌ OTP invalid or expired');
      return res.status(400).json({ message: 'OTP invalid or expired' });
    }
    
    // Hash new password and update in MongoDB
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    
    console.log('✅ Password reset successful for:', email);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('❌ Reset password error:', err.message);
    next(err);
  }
};
