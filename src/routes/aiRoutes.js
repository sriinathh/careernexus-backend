import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  uploadResumeController,
  analyzeResumeController,
  generateSkillGapsController,
  generateLearningPlanController,
  getLearningPlanController,
  generateCareerRoadmapController,
  getCareerRoadmapController,
  adaptiveEngineRecalculateController,
  chatbotController,
  getCareerGuidanceController,
  analyzeJobRoleMatchController,
  downloadCareerReportController,
  analyzeCareerRiskController,
  compareRolesController,
  generateCompanyInterviewController,
  evaluateHiringSignalController
} from '../controllers/aiController.js';


const router = express.Router();

router.post('/upload-resume', protect, upload.single('resume'), uploadResumeController);
router.post('/analyze-resume', protect, analyzeResumeController);
router.post('/generate-skill-gaps', protect, generateSkillGapsController);
router.post('/generate-learning-plan', protect, generateLearningPlanController);
router.get('/learning-plan', protect, getLearningPlanController);
router.post('/generate-career-roadmap', protect, generateCareerRoadmapController);
router.get('/career-roadmap', protect, getCareerRoadmapController);
router.post('/adaptive-engine-recalculate', protect, adaptiveEngineRecalculateController);
router.post('/chatbot', protect, chatbotController);
router.post('/career', protect, getCareerGuidanceController);
router.post('/career/match-role', protect, analyzeJobRoleMatchController);
router.post('/career/report', protect, downloadCareerReportController);
router.post('/career-risk', protect, analyzeCareerRiskController);
router.post('/compare-roles', protect, compareRolesController);
router.post('/interview/company-questions', protect, generateCompanyInterviewController);
router.post('/career/evaluate-signal', protect, evaluateHiringSignalController);

export default router;