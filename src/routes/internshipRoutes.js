import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  listInternships,
  getInternship,
  applyInternship,
} from '../controllers/internshipController.js';

const router = express.Router();

router.get('/', protect, listInternships);
router.get('/:id', protect, getInternship);
router.post('/:id/apply', protect, applyInternship);

export default router;