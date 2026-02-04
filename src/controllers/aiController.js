import { upload } from '../middleware/uploadMiddleware.js'; // used from routes
import {
  analyzeResume,
  generateSkillProfile,
  generateLearningPlan,
  recalculateAdaptivePlan,
  chatWithLearnBuddy,
  getCareerGuidance,
  getJobRoleMatch,
  generateCareerReport,
} from '../services/ai/services.js';
import { generateCareerRoadmap } from '../services/ai/careerRoadmapService.js';
import { ResumeData, SkillProfile, LearningPath } from '../models/AIModels.js';
import { Roadmap } from '../models/DomainModels.js';
import { compareJobRoles } from '../services/ai/compareService.js';
import { generateCompanyInterviewQuestions } from '../services/ai/interviewService.js';

// POST /api/ai/upload-resume (multipart)
export const uploadResumeController = async (req, res, next) => {
  try {
    console.log('Upload request received');
    const file = req.file;
    if (!file) {
      console.log('No file in request');
      return res.status(400).json({ message: 'No resume uploaded' });
    }
    console.log('File uploaded:', file.path);
    console.log('Analyzing resume for user:', req.user._id);
    const doc = await analyzeResume(req.user._id, file.path);
    console.log('Resume analyzed successfully');
    res.json(doc);
  } catch (err) {
    console.error('Upload controller error:', err);
    next(err);
  }
};

// POST /api/ai/analyze-resume
export const analyzeResumeController = async (req, res, next) => {
  try {
    const doc = await ResumeData.findOne({ user: req.user._id });
    if (!doc) return res.status(404).json({ message: 'No resume found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/generate-skill-gaps
export const generateSkillGapsController = async (req, res, next) => {
  try {
    const { targetRole } = req.body;
    const resume = await ResumeData.findOne({ user: req.user._id });
    if (!resume) return res.status(404).json({ message: 'No resume found' });

    const profile = await generateSkillProfile({
      userId: req.user._id,
      parsedResume: resume.parsed,
      roleTarget: targetRole || 'general',
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/generate-learning-plan
export const generateLearningPlanController = async (req, res, next) => {
  try {
    const sp = await SkillProfile.findOne({ user: req.user._id });
    if (!sp) return res.status(404).json({ message: 'No skill profile found. Please generate skill gaps first.' });

    const [resumeData, user] = await Promise.all([
      ResumeData.findOne({ user: req.user._id }),
      import('../../models/User.js').then(m => m.User.findById(req.user._id))
    ]);

    const plan = await generateLearningPlan({
      userId: req.user._id,
      skillProfile: sp,
      resumeData,
      userContext: {
        experience: user?.experienceLevel || 'Student',
        industry: user?.targetIndustry || 'Technology'
      }
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/learning-plan
export const getLearningPlanController = async (req, res, next) => {
  try {
    const plan = await LearningPath.findOne({ user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'No learning plan found' });
    res.json(plan);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/generate-career-roadmap
export const generateCareerRoadmapController = async (req, res, next) => {
  try {
    const { targetRole } = req.body;
    const roadmap = await generateCareerRoadmap(req.user._id, targetRole);
    res.json(roadmap);
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/career-roadmap
export const getCareerRoadmapController = async (req, res, next) => {
  try {
    const roadmap = await Roadmap.findOne({ user: req.user._id });
    if (!roadmap) return res.status(404).json({ message: 'No roadmap found' });
    res.json(roadmap);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/adaptive-engine-recalculate
export const adaptiveEngineRecalculateController = async (req, res, next) => {
  try {
    const result = await recalculateAdaptivePlan(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/chatbot
export const chatbotController = async (req, res, next) => {
  try {
    const { message } = req.body;
    const data = await chatWithLearnBuddy({ userId: req.user._id, message });
    res.json({ reply: data.reply });
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/career
export const getCareerGuidanceController = async (req, res, next) => {
  try {
    const result = await getCareerGuidance(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/career/match-role
export const analyzeJobRoleMatchController = async (req, res, next) => {
  try {
    const { targetRole } = req.body;
    if (!targetRole) return res.status(400).json({ message: 'Target role is required' });

    const result = await getJobRoleMatch(req.user._id, targetRole);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/career/report
export const downloadCareerReportController = async (req, res, next) => {
  try {
    const reportBuffer = await generateCareerReport(req.user._id);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="Career-Guidance-Report-${Date.now()}.pdf"`);
    res.send(reportBuffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    console.error('Stack:', err.stack);

    // Fallback PDF generation if the robust one fails
    try {
      const fallbackBuffer = Buffer.from(`ERROR GENERATING REPORT: ${err.message}\n\nPlease contact support.`, 'utf8');
      res.set('Content-Type', 'text/plain');
      res.set('Content-Disposition', `attachment; filename="Error-Log-${Date.now()}.txt"`);
      res.send(fallbackBuffer);
    } catch (finalError) {
      next(finalError);
    }
  }
};

// POST /api/ai/career-risk
export const analyzeCareerRiskController = async (req, res, next) => {
  try {
    const { targetRole } = req.body;
    if (!targetRole) return res.status(400).json({ message: 'Target role is required' });

    const { analyzeCareerRisk } = await import('../services/ai/services.js');
    const result = await analyzeCareerRisk(req.user._id, targetRole);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/compare-roles
export const compareRolesController = async (req, res, next) => {
  try {
    const { roleA, roleB } = req.body;
    if (!roleA || !roleB) return res.status(400).json({ message: 'Both roles are required' });

    const result = await compareJobRoles(req.user._id, roleA, roleB);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/interview/company-questions
export const generateCompanyInterviewController = async (req, res, next) => {
  try {
    const { company, role } = req.body;
    if (!company) return res.status(400).json({ message: 'Company name is required' });

    const result = await generateCompanyInterviewQuestions(req.user._id, {
      company,
      role: role || 'Software Engineer' // default role
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/career/evaluate-signal
export const evaluateHiringSignalController = async (req, res, next) => {
  try {
    const { targetRole } = req.body;
    if (!targetRole) return res.status(400).json({ message: 'Target role is required' });

    const { evaluateHiringSignal } = await import('../services/ai/services.js');
    const result = await evaluateHiringSignal(req.user._id, targetRole);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
