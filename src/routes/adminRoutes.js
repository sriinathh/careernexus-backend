import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Placeholder route for now
router.get('/', protect, (req, res) => {
    res.json({ message: 'Admin routes working' });
});

export default router;
