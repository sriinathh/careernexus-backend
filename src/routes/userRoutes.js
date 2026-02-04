import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/authMiddleware.js';
import { User } from '../models/User.js';
import {
  getProfile,
  updateProfile,
  updateEducation,
  updateSkills,
  updateCertifications,
  updateInternships,
  updateSocials,
  getAnalytics
} from '../controllers/profileController.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-photos';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter
});

// GET /api/users/profile
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, profile } = req.body;
    if (name) user.name = name;
    if (profile) user.profile = { ...user.profile, ...profile };

    await user.save();
    const cleanUser = user.toObject();
    delete cleanUser.password;
    res.json(cleanUser);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/upload-photo
router.post('/upload-photo', protect, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old photo if exists
    if (user.profile?.photoUrl) {
      const oldPhotoPath = user.profile.photoUrl.replace('/uploads/', 'uploads/');
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Save new photo URL
    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;
    
    // Ensure profile object is initialized
    if (!user.profile) {
      user.profile = {};
    }
    
    // Initialize education and socials if they don't exist
    if (!user.profile.education) {
      user.profile.education = {};
    }
    if (!user.profile.socials) {
      user.profile.socials = {};
    }
    
    user.profile.photoUrl = photoUrl;
    await user.save();

    const cleanUser = user.toObject();
    delete cleanUser.password;
    res.json({
      message: 'Photo uploaded successfully',
      user: cleanUser,
      photoUrl
    });
  } catch (err) {
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
});

// DELETE /api/users/profile-photo
router.delete('/profile-photo', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete photo file if exists
    if (user.profile?.photoUrl) {
      const photoPath = user.profile.photoUrl.replace('/uploads/', 'uploads/');
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // Remove photoUrl from profile
    user.profile = { ...user.profile, photoUrl: null };
    await user.save();

    const cleanUser = user.toObject();
    delete cleanUser.password;
    res.json({
      message: 'Photo removed successfully',
      user: cleanUser
    });
  } catch (err) {
    next(err);
  }
});

// ===== NEW PROFILE MANAGEMENT ENDPOINTS =====

// GET /api/profile - Fetch complete profile
router.get('/', protect, getProfile);

// PUT /api/profile - Update basic profile
router.put('/', protect, updateProfile);

// PUT /api/profile/education - Update education details
router.put('/education', protect, updateEducation);

// PUT /api/profile/skills - Update skills
router.put('/skills', protect, updateSkills);

// PUT /api/profile/certifications - Update certifications
router.put('/certifications', protect, updateCertifications);

// PUT /api/profile/internships - Update internships
router.put('/internships', protect, updateInternships);

// PUT /api/profile/socials - Update social links
router.put('/socials', protect, updateSocials);

// GET /api/profile/analytics - Get career analytics
router.get('/analytics', protect, getAnalytics);

// ===== EXISTING PHOTO ENDPOINTS =====

export default router;

