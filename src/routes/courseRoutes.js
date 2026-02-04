import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  enrollCourse,
  submitQuiz,
} from '../controllers/courseController.js';

const router = express.Router();

// Public/Student routes
router.get('/', protect, listCourses);
router.get('/:id', protect, getCourse);
router.post('/:id/enroll', protect, enrollCourse);
router.post('/:id/quiz/submit', protect, submitQuiz);

// Faculty routes
router.post('/', protect, requireRole('faculty', 'admin'), createCourse);
router.put('/:id', protect, requireRole('faculty', 'admin'), updateCourse);

export default router;
