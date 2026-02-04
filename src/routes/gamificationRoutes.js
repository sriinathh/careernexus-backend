import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { User } from '../models/User.js';
import { XPLog } from '../models/DomainModels.js';

const router = express.Router();

// GET /api/gamification/stats
router.get('/stats', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('gamification');
    res.json(user.gamification || { xp: 0, level: 1, streakDays: 0, badges: [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/gamification/leaderboard
router.get('/leaderboard', protect, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const users = await User.find({ role: 'student' })
      .select('name gamification')
      .sort({ 'gamification.xp': -1 })
      .limit(parseInt(limit));

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      xp: user.gamification?.xp || 0,
      level: user.gamification?.level || 1,
      streakDays: user.gamification?.streakDays || 0,
      badges: user.gamification?.badges?.length || 0,
    }));

    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

// POST /api/gamification/add-xp
router.post('/add-xp', protect, async (req, res, next) => {
  try {
    const { amount, reason, meta } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const oldXP = user.gamification.xp || 0;
    const oldLevel = user.gamification.level || 1;
    
    user.gamification.xp = oldXP + (amount || 0);
    user.gamification.level = Math.floor(user.gamification.xp / 1000) + 1;
    
    // Check for level up
    const leveledUp = user.gamification.level > oldLevel;
    
    // Award badge for milestones
    const badges = user.gamification.badges || [];
    if (user.gamification.xp >= 10000 && !badges.includes('xp_master')) {
      badges.push('xp_master');
    }
    if (user.gamification.level >= 10 && !badges.includes('level_10')) {
      badges.push('level_10');
    }
    user.gamification.badges = badges;

    await user.save();

    // Log XP transaction
    await XPLog.create({
      user: user._id,
      amount: amount || 0,
      reason: reason || 'Manual',
      meta: meta || {},
    });

    res.json({
      xp: user.gamification.xp,
      level: user.gamification.level,
      leveledUp,
      newBadges: leveledUp ? badges.filter(b => !badges.includes(b)) : [],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/gamification/update-streak
router.post('/update-streak', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const lastActive = user.gamification?.lastActiveDate;
    const today = new Date().toDateString();
    
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastActive === yesterday.toDateString()) {
        // Continue streak
        user.gamification.streakDays = (user.gamification.streakDays || 0) + 1;
      } else {
        // Reset streak
        user.gamification.streakDays = 1;
      }
      
      user.gamification.lastActiveDate = today;
      await user.save();
    }

    res.json({ streakDays: user.gamification.streakDays });
  } catch (err) {
    next(err);
  }
});

// GET /api/gamification/badges
router.get('/badges', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('gamification.badges');
    res.json({ badges: user.gamification?.badges || [] });
  } catch (err) {
    next(err);
  }
});

export default router;
