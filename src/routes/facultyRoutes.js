import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  getFacultyOverview,
  getCourseStudents,
  createAnnouncement,
} from '../controllers/facultyController.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('faculty', 'admin'));

router.get('/overview', getFacultyOverview);
router.get('/courses/:id/students', getCourseStudents);
router.post('/announcements', createAnnouncement);

export default router;

