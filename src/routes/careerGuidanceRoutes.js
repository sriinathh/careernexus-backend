/**
 * Career Guidance Routes
 * Orchestrates calls between frontend, Node.js backend, and Python Flask AI service
 * Architecture: Frontend → Node.js (Orchestrator) → Flask (AI Service) → Mistral API
 */

import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware.js';
import { Mistral } from '@mistralai/mistralai';

const router = express.Router();

// Initialize Mistral AI
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistralClient = mistralApiKey ? new Mistral({ apiKey: mistralApiKey }) : null;

if (mistralClient) {
  console.log('[Career Guidance] Mistral AI initialized successfully');
} else {
  console.warn('[Career Guidance] Mistral API key not found - AI features will be limited');
}

// Flask AI Service URL (internal service)
const FLASK_AI_SERVICE_URL = process.env.FLASK_AI_SERVICE_URL || 'http://localhost:5000';

console.log(`[Career Guidance] Initialized with Flask service URL: ${FLASK_AI_SERVICE_URL}`);

// Helper function to make Flask AI service calls
async function callFlaskAIService(endpoint, data) {
  try {
    console.log(`[Career Guidance] Calling Flask service: ${endpoint}`);
    console.log(`[Career Guidance] Request data:`, data);

    const response = await axios.post(`${FLASK_AI_SERVICE_URL}${endpoint}`, data, {
      timeout: 60000, // 60 second timeout for AI processing
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[Career Guidance] Flask response status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`[Career Guidance] Flask service error for ${endpoint}:`, error.message);

    // Return graceful fallback if Flask service is unavailable
    if (error.code === 'ECONNREFUSED') {
      console.warn('[Career Guidance] Flask service unavailable, using fallback response');
      return null;
    }

    throw error;
  }
}

// POST /api/career-guidance/career-guidance - Generate career guidance using Mistral AI directly
router.post('/career-guidance', protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!mistralClient) {
      return res.status(503).json({ success: false, error: 'AI service not available' });
    }

    console.log(`[Career Guidance] Processing Mistral AI career guidance for user: ${userId}`);

    const { skills, interests, academics, goals, experience } = req.body;

    // Validate input
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ success: false, error: 'Skills array is required and cannot be empty' });
    }

    // Create comprehensive prompt for Mistral AI
    const prompt = `You are an expert career counselor. Analyze the following profile and provide comprehensive career guidance.

**User Profile:**
- Skills: ${skills.join(', ')}
- Interests: ${interests && interests.length > 0 ? interests.join(', ') : 'Not specified'}
- Academic Background: ${academics || 'Not specified'}
- Career Goals: ${goals || 'Not specified'}
- Experience: ${experience || 'Fresher'}

**Provide the following in a structured JSON format:**
1. recommendedCareer: The most suitable career path (job title)
2. careerDescription: A brief 2-3 sentence description of this career
3. whyThisCareer: Explain in 2-3 sentences why this career suits their profile
4. confidenceScore: A number between 0-100 indicating confidence in this recommendation
5. prioritySkills: An array of 6-9 specific skills they should learn/improve (technical and soft skills)
6. shortTermSteps: An array of 5-7 actionable steps they can take in the next 3 months
7. learningRoadmap: An array of 6 strings, each describing what to focus on in each of the next 6 months

Be specific, practical, and tailored to their profile. Focus on realistic, achievable goals.

Respond ONLY with valid JSON, no additional text.`;

    // Call Mistral AI
    const chatResponse = await mistralClient.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    const aiResponseText = chatResponse.choices[0].message.content;
    console.log('[Career Guidance] Mistral AI raw response:', aiResponseText);

    // Parse JSON response
    let careerGuidance;
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        careerGuidance = JSON.parse(jsonMatch[0]);
      } else {
        careerGuidance = JSON.parse(aiResponseText);
      }
    } catch (parseError) {
      console.error('[Career Guidance] JSON parse error:', parseError);
      // Fallback response
      careerGuidance = {
        recommendedCareer: 'Software Developer',
        careerDescription: 'Build and maintain software applications using programming languages and frameworks.',
        whyThisCareer: 'Based on your technical skills and interests, software development aligns well with your profile.',
        confidenceScore: 75,
        prioritySkills: ['Advanced JavaScript', 'System Design', 'Algorithms', 'Cloud Services', 'Testing', 'Git'],
        shortTermSteps: [
          'Build 2-3 portfolio projects',
          'Contribute to open source',
          'Practice coding challenges daily',
          'Learn a modern framework',
          'Network with developers',
        ],
        learningRoadmap: [
          'Master JavaScript fundamentals and ES6+ features',
          'Learn React/Vue and component-based architecture',
          'Build full-stack applications with Node.js',
          'Study data structures and algorithms',
          'Learn cloud deployment (AWS/Azure)',
          'Build portfolio projects and prepare for interviews',
        ],
      };
    }

    // Ensure all required fields exist
    const response = {
      recommendedCareer: careerGuidance.recommendedCareer || 'Software Developer',
      careerDescription: careerGuidance.careerDescription || 'A rewarding career path based on your skills.',
      whyThisCareer: careerGuidance.whyThisCareer || 'This career aligns with your profile.',
      confidenceScore: careerGuidance.confidenceScore || 75,
      prioritySkills: careerGuidance.prioritySkills || [],
      shortTermSteps: careerGuidance.shortTermSteps || [],
      learningRoadmap: careerGuidance.learningRoadmap || [],
    };

    console.log(`[Career Guidance] Successfully generated for user: ${userId}`);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[Career Guidance] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate career guidance',
    });
  }
});

// POST /api/career-guidance/career - Generate career guidance
router.post('/career', protect, async (req, res) => {
  try {
    const userId = req.user?.id; // Extract from JWT token

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    console.log(`[Career Guidance] Processing career guidance for user: ${userId}`);

    const { skills, interests, academics, goals } = req.body;

    // Validate input
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ success: false, error: 'Skills array is required and cannot be empty' });
    }

    // Call Flask AI service
    const aiResponse = await callFlaskAIService('/career-guidance', {
      skills,
      interests: interests || [],
      academics: academics || '',
      goals: goals || '',
    });

    if (!aiResponse || !aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse?.error || 'Failed to generate career guidance',
      });
    }

    // TODO: Save to MongoDB
    // const careerResult = new CareerResult({
    //   userId,
    //   ...aiResponse.data,
    //   createdAt: new Date(),
    // });
    // await careerResult.save();

    console.log(`[Career Guidance] Successfully generated for user: ${userId}`);

    res.json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    console.error('[Career Guidance] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate career guidance',
    });
  }
});

// POST /api/career-guidance/resume - Analyze resume
router.post('/resume', protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    console.log(`[Career Guidance] Processing resume analysis for user: ${userId}`);

    const { resumeText, targetCareer } = req.body;

    // Validate input
    if (!resumeText || typeof resumeText !== 'string') {
      return res.status(400).json({ success: false, error: 'Resume text is required' });
    }

    if (!targetCareer || typeof targetCareer !== 'string') {
      return res.status(400).json({ success: false, error: 'Target career is required' });
    }

    // Call Flask AI service
    const aiResponse = await callFlaskAIService('/resume-analysis', {
      resume_text: resumeText,
      target_career: targetCareer,
    });

    if (!aiResponse || !aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse?.error || 'Failed to analyze resume',
      });
    }

    // TODO: Save to MongoDB
    // const resumeAnalysis = new ResumeAnalysis({
    //   userId,
    //   ...aiResponse.data,
    //   createdAt: new Date(),
    // });
    // await resumeAnalysis.save();

    console.log(`[Career Guidance] Resume analysis completed for user: ${userId}`);

    res.json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    console.error('[Career Guidance] Resume analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze resume',
    });
  }
});

// POST /api/career-guidance/interview - Generate interview preparation
router.post('/interview', protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    console.log(`[Career Guidance] Processing interview prep for user: ${userId}`);

    const { career, skillGaps } = req.body;

    // Validate input
    if (!career || typeof career !== 'string') {
      return res.status(400).json({ success: false, error: 'Career field is required' });
    }

    // Call Flask AI service
    const aiResponse = await callFlaskAIService('/interview-prep', {
      career,
      skill_gaps: skillGaps || [],
    });

    if (!aiResponse || !aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse?.error || 'Failed to generate interview preparation',
      });
    }

    // TODO: Save to MongoDB
    // const interviewPrep = new InterviewPrep({
    //   userId,
    //   ...aiResponse.data,
    //   createdAt: new Date(),
    // });
    // await interviewPrep.save();

    console.log(`[Career Guidance] Interview prep generated for user: ${userId}`);

    res.json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    console.error('[Career Guidance] Interview prep error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate interview preparation',
    });
  }
});

// POST /api/career-guidance/learning-roadmap - Generate learning roadmap
router.post('/learning-roadmap', protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!mistralClient) {
      return res.status(503).json({ success: false, error: 'AI service not available' });
    }

    console.log(`[Career Guidance] Processing learning roadmap for user: ${userId}`);

    // Fetch user's career guidance to get context
    // We need the recommended career and identified skill gaps
    // We assume the user has a CareerGuidance record (if not, they should be redirected to creating one)
    // We can import the model here dynamically or assume it's available via mongoose
    const CareerGuidance = (await import('../models/CareerGuidanceModels.js')).CareerGuidance;
    const LearningRoadmap = (await import('../models/CareerGuidanceModels.js')).LearningRoadmap;

    // Find the most recent career guidance
    const careerGuidance = await CareerGuidance.findOne({ user: userId }).sort({ createdAt: -1 });

    if (!careerGuidance) {
      return res.status(400).json({ success: false, error: 'Please complete career guidance first to identify your target role and skill gaps.' });
    }

    const { recommendedCareer, prioritySkills } = careerGuidance;
    // Input skills from request or fallback to saved profile
    // The frontend might send specific inputs, but we should prioritize the holistic view from CareerGuidance

    console.log(`[Career Guidance] Generating path for: ${recommendedCareer}, Gaps: ${prioritySkills.join(', ')}`);

    // Create a precise prompt for the detailed structure
    const prompt = `
You are an expert technical curriculum designer.
Create a personalized, 3-phase learning path for a student aspiring to be a "${recommendedCareer}".

**Context:**
- Target Role: ${recommendedCareer}
- Identified Skill Gaps: ${prioritySkills.join(', ')}
- Goal: Go from current state to Job-Ready in 12 weeks.

**Requirement:**
Generate a JSON object with the EXACT following structure. Do NOT add any markdown formatting or extra text.

{
    "role": "${recommendedCareer}",
    "currentLevel": "Intermediate", 
    "totalTime": "12 Weeks",
    "weeklyCommitment": "15 hours/week",
    "phases": [
        {
            "phase": 1,
            "title": "Phase Title (e.g., Foundation Reinforcement)",
            "duration": "Weeks 1-4",
            "goal": "Specific goal for this phase",
            "outcome": "Tangible outcome",
            "skills": [
                { "name": "Skill Name", "type": "Gap", "time": "10h", "status": "Pending" },
                { "name": "Skill Name", "type": "Core", "time": "5h", "status": "Completed" }
            ]
        },
        {
            "phase": 2,
            "title": "Phase Title (e.g., Advanced Specialization)",
            "duration": "Weeks 5-8",
            "goal": "Specific goal for this phase",
            "outcome": "Tangible outcome",
            "skills": [
                 { "name": "Skill Name", "type": "Gap", "time": "12h", "status": "Pending" },
                 { "name": "Skill Name", "type": "Core", "time": "8h", "status": "Pending" }
            ]
        },
        {
             "phase": 3,
             "title": "Phase Title (e.g., Real-world Application)",
             "duration": "Weeks 9-12",
             "goal": "Specific goal for this phase",
             "outcome": "Tangible outcome",
             "skills": [
                 { "name": "Skill Name", "type": "Project", "time": "20h", "status": "Pending" },
                 { "name": "Skill Name", "type": "Interview", "time": "10h", "status": "Pending" }
             ]
        }
    ],
    "whyThisPath": "A 1-2 sentence explanation of why this specific path was generated for them, referencing their specific gaps."
}

**Rules:**
1. YOU MUST include valid skills from the "Identified Skill Gaps" list as "Gap" type skills in the JSON.
2. "type" can be: "Gap", "Core", "Project", "Interview".
3. "status" should be mostly "Pending" for Gaps, "Completed" for known strengths (if any known), or just "Pending" by default.
4. Make it realistic and actionable.
`;

    // Call Mistral AI
    const chatResponse = await mistralClient.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // Lower temperature for more structured output
      response_format: { type: "json_object" } // Force JSON mode if supported or helps valid JSON
    });

    const aiResponseText = chatResponse.choices[0].message.content;

    // Parse JSON
    let detailedPathData;
    try {
      // cleaned string in case of backticks
      const cleanJson = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      detailedPathData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse AI response as JSON", aiResponseText);
      throw new Error("AI generated invalid JSON structure");
    }

    // Save to Database
    const learningRoadmap = await LearningRoadmap.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        careerGuidance: careerGuidance._id,
        shortTerm: {
          duration: "3 Months",
          topics: detailedPathData.phases[0].skills.map(s => s.name),
          resources: []
        },
        mediumTerm: {
          duration: "6 Months",
          topics: detailedPathData.phases[1].skills.map(s => s.name),
          resources: []
        },
        estimatedCompletionTime: detailedPathData.totalTime,
        detailedPath: detailedPathData
      },
      { upsert: true, new: true }
    );

    console.log(`[Career Guidance] Learning roadmap generated for user: ${userId}`);

    res.json({
      success: true,
      data: detailedPathData,
      dbRecord: learningRoadmap // sending full record mostly for debug or future use
    });
  } catch (error) {
    console.error('[Career Guidance] Learning roadmap error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate learning roadmap',
    });
  }
});

// GET /api/career-guidance/report - Get combined career report
router.get('/report', protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    console.log(`[Career Guidance] Fetching report for user: ${userId}`);

    // TODO: Fetch from MongoDB
    // const report = await CareerResult.findOne({ userId })
    //   .sort({ createdAt: -1 })
    //   .lean();

    // For now, return success response
    res.json({
      success: true,
      data: {
        message: 'Career report endpoint ready. MongoDB integration pending.',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Career Guidance] Report fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch career report',
    });
  }
});

// POST /api/career-guidance/full-report - Generate comprehensive career report
router.post('/full-report', protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    console.log(`[Career Guidance] Processing full career report for user: ${userId}`);

    const { skills, interests, academics, goals, resumeText, skillGaps } = req.body;

    // Validate input
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ success: false, error: 'Skills array is required' });
    }

    // Call Flask AI service to generate comprehensive report
    const aiResponse = await callFlaskAIService('/career-report', {
      skills,
      interests: interests || [],
      academics: academics || '',
      goals: goals || '',
      resume_text: resumeText || '',
      skill_gaps: skillGaps || [],
    });

    if (!aiResponse || !aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse?.error || 'Failed to generate career report',
      });
    }

    // TODO: Save complete report to MongoDB
    // const report = new CareerReport({
    //   userId,
    //   ...aiResponse.data,
    //   createdAt: new Date(),
    // });
    // await report.save();

    console.log(`[Career Guidance] Full career report generated for user: ${userId}`);

    res.json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    console.error('[Career Guidance] Full report generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate comprehensive career report',
    });
  }
});

// Health check endpoint for Flask AI service
router.get('/health', async (req, res) => {
  try {
    const healthResponse = await axios.get(`${FLASK_AI_SERVICE_URL}/health`, {
      timeout: 5000,
    });

    res.json({
      success: true,
      aiService: healthResponse.data,
    });
  } catch (error) {
    console.warn('[Career Guidance] Flask AI service health check failed:', error.message);
    res.status(503).json({
      success: false,
      error: 'AI service unavailable',
    });
  }
});

export default router;
