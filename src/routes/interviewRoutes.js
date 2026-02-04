/**
 * INTERVIEW PREPARATION ROUTES
 * 
 * Endpoints:
 * - POST /api/interview/questions - Generate profile-aware interview questions
 * - POST /api/interview/evaluate - Evaluate student's answer
 * - GET  /api/interview/readiness - Calculate interview readiness score
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import PDFDocument from 'pdfkit';

import { User } from '../models/User.js';
import { QUESTION_BANK } from '../data/interviewQuestions.js';
import {
  generateInterviewQuestions,
  evaluateAnswer,
  calculateReadinessScore,
  generateCompanyInterviewInsights,
  calculateSkillGap,
  generateInterviewPreparationPlan
} from '../services/interviewService.js';

const router = express.Router();

/**
 * POST /api/interview/questions
 * Generate interview questions based on:
 * - Student profile (skills, interests, academics)
 * - Resume analysis results (strengths & gaps)
 * - Selected career path
 * - Focus mode (weak areas only)
 */
router.post('/questions', protect, async (req, res) => {
  try {
    const { focusWeakAreas, company, role } = req.body;
    const userId = req.user._id;

    // Fetch user profile & resume analysis
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get career analysis & resume analysis from user data
    const careerAnalysis = user.careerGuidance?.analysis || {};
    const resumeAnalysis = user.resumeAnalysis || {};

    // Generate questions using AI
    const questions = await generateInterviewQuestions({
      userId,
      profileSkills: user.skills || [],
      strengthSkills: resumeAnalysis.strengths || [],
      weakSkills: resumeAnalysis.gaps || [],
      career: careerAnalysis.primaryCareer || role || 'Software Developer',
      focusWeakAreas,
      company,
      academicBackground: user.academics || 'Bachelor in Computer Science'
    });

    // Add IDs to questions for tracking
    const questionsWithIds = questions.map((q, idx) => ({
      ...q,
      _id: `q-${Date.now()}-${idx}` // Generate unique ID for each question
    }));

    const sessionId = `session-${userId}-${Date.now()}`;

    // Get company-specific insights if company is provided
    const companyInsights = company ? generateCompanyInterviewInsights(company, role) : null;

    // Calculate skill gap if company is provided
    const skillGap = company ? calculateSkillGap(user.skills || [], resumeAnalysis.gaps || [], company, role) : null;

    return res.json({
      success: true,
      data: {
        session: {
          _id: sessionId,
          userId,
          createdAt: new Date(),
          questions: questionsWithIds
        },
        insights: companyInsights || {
          tip: `Interview questions tailored to ${role || careerAnalysis.primaryCareer}. Focus areas based on your ${resumeAnalysis.gaps?.length || 0} skill gaps.`,
          focusAreas: resumeAnalysis.gaps?.slice(0, 3) || []
        },
        skillGap
      }
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions'
    });
  }
});

/**
 * POST /api/interview/evaluate
 * Evaluate student's answer to interview question
 * 
 * Request:
 * {
 *   sessionId: string,
 *   questionId: string,
 *   answer: string
 * }
 */
router.post('/evaluate', protect, async (req, res) => {
  try {
    const { sessionId, questionId, answer } = req.body;
    const userId = req.user._id;

    if (!answer || answer.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Answer must be at least 10 characters'
      });
    }

    // Evaluate answer using AI
    const evaluation = await evaluateAnswer({
      answer,
      questionId,
      userId
    });

    return res.json({
      success: true,
      data: {
        score: evaluation.score, // 0-100
        feedback: evaluation.feedback,
        improvementTips: evaluation.improvementTips,
        strengths: evaluation.strengths
      }
    });
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to evaluate answer'
    });
  }
});

/**
 * GET /api/interview/readiness
 * Calculate interview readiness score based on:
 * - Profile skill alignment
 * - Resume quality
 * - Practice answer quality
 * - Company-specific skill gap (if company provided)
 */
router.get('/readiness', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const company = req.query.company;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const readinessScore = await calculateReadinessScore({
      userId,
      user,
      company
    });

    // Add skill gap analysis if company is provided
    const skillGap = company ? calculateSkillGap(user.skills || [], user.resumeAnalysis?.gaps || [], company) : null;

    return res.json({
      success: true,
      data: {
        ...readinessScore,
        skillGap
      }
    });
  } catch (error) {
    console.error('Error calculating readiness:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate readiness score'
    });
  }
});

/**
 * GET /api/interview/prep-plan
 * Generate 7-day prep plan for specific company/role
 */
router.post('/prep-plan', protect, async (req, res) => {
  try {
    const { company, role } = req.body;

    const userId = req.user._id;
    const user = await User.findById(userId);

    // Get weak skills from resume analysis
    const weakSkills = user?.resumeAnalysis?.gaps || [];
    const strengthSkills = user?.resumeAnalysis?.strengths || [];

    const prepPlan = await generateInterviewPreparationPlan({
      company,
      role,
      weakSkills,
      strengthSkills
    });

    return res.json({
      success: true,
      data: prepPlan
    });
  } catch (error) {
    console.error('Error generating prep plan:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/interview/answer-session
 * Store answer and evaluation for a session
 */
router.post('/answer-session', protect, async (req, res) => {
  try {
    const { sessionId, questionId, answer, evaluation } = req.body;
    const userId = req.user._id;

    // Store in user's interview progress
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.interviewProgress) {
      user.interviewProgress = {
        sessions: [],
        averageScore: 0,
        totalAnswered: 0
      };
    }

    // Add session to user data
    const sessionIndex = user.interviewProgress.sessions.findIndex(s => s.sessionId === sessionId);
    if (sessionIndex === -1) {
      user.interviewProgress.sessions.push({
        sessionId,
        answers: [{
          questionId,
          answer,
          evaluation,
          timestamp: new Date()
        }]
      });
    } else {
      user.interviewProgress.sessions[sessionIndex].answers.push({
        questionId,
        answer,
        evaluation,
        timestamp: new Date()
      });
    }

    // Update average score
    const allAnswers = user.interviewProgress.sessions.reduce((acc, s) => [...acc, ...s.answers], []);
    user.interviewProgress.averageScore = Math.round(
      allAnswers.reduce((sum, a) => sum + (a.evaluation?.score || 0), 0) / allAnswers.length
    );
    user.interviewProgress.totalAnswered = allAnswers.length;

    await user.save();

    return res.json({
      success: true,
      data: {
        score: evaluation.score,
        averageScore: user.interviewProgress.averageScore,
        totalAnswered: user.interviewProgress.totalAnswered
      }
    });
  } catch (error) {
    console.error('Error storing session:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/interview/materials
 * Get list of available PDF materials
 */
router.get('/materials', protect, (req, res) => {
  const { company, role } = req.query;

  const materials = [
    {
      id: 'guide',
      title: `${company || 'General'} Interview Guide`,
      type: 'Complete Guide',
      description: `Comprehensive preparation guide for ${company || 'tech'} interviews`,
      icon: '📚'
    },
    {
      id: 'technical',
      title: `${role || 'Technical'} Cheat Sheet`,
      type: 'Technical',
      description: 'Quick reference for key technical concepts and algorithms',
      icon: '⚡'
    },
    {
      id: 'behavioral',
      title: 'Behavioral Q&A Pack',
      type: 'Soft Skills',
      description: 'Top 20 behavioral questions with STAR method answers',
      icon: '🗣️'
    }
  ];

  return res.json({
    success: true,
    data: materials
  });
});

/**
 * GET /api/interview/pdf
 * Generate and download specific PDF
 */
router.get('/pdf', protect, (req, res) => {
  const { company, role, type } = req.query;

  try {
    const doc = new PDFDocument({ margin: 50 });

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${company}_${role}_${type}_Guide.pdf`);

    doc.pipe(res);

    // --- HELPER FUNCTIONS ---
    const drawHeader = (title, subtitle) => {
      doc.fontSize(26).font('Helvetica-Bold').fillColor('#2563EB').text(title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').fillColor('#4B5563').text(subtitle, { align: 'center' });
      doc.moveDown(1);
      doc.rect(50, doc.y, 500, 2).fill('#E5E7EB');
      doc.moveDown(2);
    };

    const drawSectionTitle = (title) => {
      doc.moveDown(1);
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#1F2937').text(title);
      doc.rect(doc.x, doc.y + 5, 500, 1).fill('#2563EB'); // Underline
      doc.moveDown(1);
      doc.fillColor('#374151'); // Reset color
    };

    const drawQuestion = (number, question, answer, tips) => {
      if (doc.y > 700) doc.addPage(); // Auto-page break check (simple)

      doc.fontSize(12).font('Helvetica-Bold').text(`Q${number}: ${question}`);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(answer, { align: 'justify' });

      if (tips) {
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#059669').text(`💡 Tip: ${tips}`);
        doc.fillColor('#374151'); // Reset
      }
      doc.moveDown(1.5);
    };



    // --- CONTENT GENERATION ---

    // 1. Header
    const title = type === 'technical' ? `${role} Technical Cheat Sheet`
      : type === 'behavioral' ? 'Behavioral Interview Masterclass'
        : `${company} Interview Success Guide`;

    drawHeader(title, `Prepared for ${company} Interview`);

    // 2. Content based on Type
    if (type === 'technical') {

      // A. Core Concepts
      drawSectionTitle('1. Foundational Questions (Must Know)');
      const coreQs = role?.toLowerCase().includes('frontend') ? QUESTION_BANK.frontend : QUESTION_BANK.backend;

      // Print first 10 core questions
      coreQs.slice(0, 10).forEach((q, i) => {
        drawQuestion(i + 1, q, 'Review the core documentation for a precise technical definition.', 'Focus on "Why" and "How", not just "What".');
      });

      // B. System Design
      if (role?.toLowerCase().includes('backend') || role?.toLowerCase().includes('full')) {
        drawSectionTitle('2. System Design Challenges');
        QUESTION_BANK.systemDesign.slice(0, 5).forEach((q, i) => {
          drawQuestion(i + 1, q, 'Start with requirements gathering, then high-level design, then deep dive into components.', 'Don\'t forget about Scalability and Reliability.');
        });
      }

      // C. Additional Technical Topics
      drawSectionTitle('3. Deep Dive Topics');
      const extraQs = role?.toLowerCase().includes('frontend') ? QUESTION_BANK.backend.slice(0, 5) : QUESTION_BANK.frontend.slice(0, 5); // Cross-domain knowledge
      extraQs.forEach((q, i) => {
        doc.fontSize(11).font('Helvetica').text(`• ${q}`);
        doc.moveDown(0.5);
      });

    } else if (type === 'behavioral') {
      drawSectionTitle('1. The STAR Method (Situation, Task, Action, Result)');
      doc.fontSize(11).font('Helvetica').text('Use this structure for every answer to ensure clarity and impact.');

      drawSectionTitle('2. Comprehensive Behavioral Questions');
      QUESTION_BANK.behavioral.forEach((item, i) => {
        // Auto-add new page every 4 questions
        if (i > 0 && i % 4 === 0) doc.addPage();
        drawQuestion(i + 1, item.q, `Strategy: ${item.a}`, 'Be specific and authentic.');
      });

      drawSectionTitle('3. Common HR Questions');
      QUESTION_BANK.hr.forEach((q, i) => {
        doc.fontSize(11).font('Helvetica').text(`• ${q}`);
        doc.moveDown(0.5);
      });

    } else {
      // General Guide - Mix of everything
      drawSectionTitle('1. The "Must Know" Checklist');
      doc.text('A curated mix of technical and behavioral readiness.');

      drawSectionTitle('2. Top 5 Behavioral');
      QUESTION_BANK.behavioral.slice(0, 5).forEach((item, i) => {
        drawQuestion(i + 1, item.q, item.a);
      });

      drawSectionTitle('3. Top 10 Technical (Mixed)');
      const mixedTechnical = [...QUESTION_BANK.frontend.slice(0, 5), ...QUESTION_BANK.backend.slice(0, 5)];
      mixedTechnical.forEach((q, i) => {
        doc.fontSize(11).font('Helvetica').text(`${i + 1}. ${q}`);
        doc.moveDown(0.5);
      });

      drawSectionTitle('4. System Design Warmups');
      QUESTION_BANK.systemDesign.slice(0, 3).forEach((q, i) => {
        doc.fontSize(11).font('Helvetica').text(`• ${q}`);
        doc.moveDown(0.5);
      });
    }

    // Footer
    doc.moveDown(2);
    const bottomY = doc.page.height - 50;
    doc.fontSize(10).fillColor('#9CA3AF').text('Generated by Interview Coach AI • 100+ Question Bank', 50, bottomY, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (!res.headersSent) res.status(500).end();
  }
});

export default router;
