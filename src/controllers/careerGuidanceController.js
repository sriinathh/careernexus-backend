import {
  CareerGuidance,
  ResumeAnalysis,
  InterviewPrep,
  LearningRoadmap,
  CareerReport
} from '../models/CareerGuidanceModels.js';
import axios from 'axios';

import axios from 'axios';
import { chatComplete } from '../mistral_client.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// Generate Career Guidance
export const generateCareerGuidanceController = async (req, res, next) => {
  try {
    const { skills, interests, education, experience } = req.body;
    const userId = req.user._id;

    console.log('Calling AI service at:', AI_SERVICE_URL);

    // Call Python AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/career-guidance`, {
      skills: skills || req.user.profile?.skills || [],
      interests: interests || req.user.profile?.interests || [],
      education: education || req.user.profile?.year || 'Not provided',
      experience: experience || 'None'
    });

    console.log('AI Service Response:', aiResponse.data);

    console.log('AI Service Response:', aiResponse.data);

    const guidanceData = aiResponse.data;

    // ---------------------------------------------------------
    // GENERATE "WHY THIS ROLE" EXPLANATION USING MISTRAL
    // ---------------------------------------------------------
    try {
      const studentProfile = {
        skills: skills || req.user.profile?.skills || [],
        interests: interests || req.user.profile?.interests || [],
        academic_background: education || "Undergraduate Student",
        resume_summary: "Student interested in technology." // Can be improved if we have resume text
      };

      const recommendedRole = guidanceData.recommendedCareer;

      const explanationPrompt = `
You are an AI career advisor.

Context:
You already have a recommended career role for the student.
You also have the student’s:
- Skills: ${JSON.stringify(studentProfile.skills)}
- Interests: ${JSON.stringify(studentProfile.interests)}
- Academic background: ${studentProfile.academic_background}
- Resume summary: ${studentProfile.resume_summary}

Recommended Role: ${recommendedRole}

Task:
Explain WHY this career role is recommended.

Rules:
- Do NOT change the recommended role
- Do NOT suggest multiple roles
- Focus on reasoning and transparency

Your response must include:
1. Top 3 strengths from the student profile that support this role
2. 2 gaps or weaknesses limiting readiness
3. How much each strength contributed to the recommendation
4. Clear advice on how the student can improve the match score

Tone:
Professional, mentor-like, concise, non-generic.

Output format:
- Short bullet points
- Clear headings
- No long paragraphs
        `;

      console.log("Generating explanation with Mistral...");
      const aiExplanation = await chatComplete({
        messages: [{ role: 'user', content: explanationPrompt }],
        temperature: 0.7
      });

      if (aiExplanation && aiExplanation.choices && aiExplanation.choices[0]) {
        guidanceData.whyThisCareer = aiExplanation.choices[0].message.content;
        console.log("Explanation generated successfully.");
      }

    } catch (aiError) {
      console.error("Failed to generate AI explanation:", aiError.message);
      // Fallback or leave empty to let frontend show generic message
      guidanceData.whyThisCareer = null;
    }
    // ---------------------------------------------------------

    // Validate required fields
    if (!guidanceData.recommendedCareer) {
      console.error('Invalid AI response - missing recommendedCareer:', guidanceData);
      return res.status(400).json({
        success: false,
        error: 'Invalid AI response format'
      });
    }

    // Save to database
    const careerGuidance = await CareerGuidance.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        recommendedCareer: guidanceData.recommendedCareer,
        careerDescription: guidanceData.careerDescription,
        whyThisCareer: guidanceData.whyThisCareer,
        confidenceScore: guidanceData.confidenceScore,
        prioritySkills: guidanceData.prioritySkills,
        shortTermSteps: guidanceData.shortTermSteps,
        inputData: {
          skills: skills || req.user.profile?.skills || [],
          interests: interests || req.user.profile?.interests || [],
          education: education || req.user.profile?.year,
          experience: experience || 'None'
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: careerGuidance,
      message: 'Career guidance generated successfully'
    });
  } catch (err) {
    console.error('Career guidance error:', err.message);
    console.error('Full error:', err);
    next(err);
  }
};

// Analyze Resume against Career
export const analyzeResumeController = async (req, res, next) => {
  try {
    const { resumeText } = req.body;
    const userId = req.user._id;

    // Get user's career guidance first
    const careerGuidance = await CareerGuidance.findOne({ user: userId });
    if (!careerGuidance) {
      return res.status(400).json({
        success: false,
        error: 'Please complete career guidance first'
      });
    }

    // Call Python AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/resume-analysis`, {
      resumeText,
      career: careerGuidance.recommendedCareer
    });

    const analysisData = aiResponse.data;

    // Save to database
    const resumeAnalysis = await ResumeAnalysis.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        careerGuidance: careerGuidance._id,
        resumeText,
        strengths: analysisData.strengths,
        weaknesses: analysisData.weaknesses,
        missingSkills: analysisData.missingSkills,
        improvementSuggestions: analysisData.improvementSuggestions,
        matchScore: analysisData.matchScore
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: resumeAnalysis,
      message: 'Resume analysis completed'
    });
  } catch (err) {
    console.error('Resume analysis error:', err.message);
    next(err);
  }
};

// Generate Interview Preparation
export const generateInterviewPrepController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get career guidance and resume analysis
    const [careerGuidance, resumeAnalysis] = await Promise.all([
      CareerGuidance.findOne({ user: userId }),
      ResumeAnalysis.findOne({ user: userId })
    ]);

    if (!careerGuidance) {
      return res.status(400).json({
        success: false,
        error: 'Please complete career guidance first'
      });
    }

    // Call Python AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/interview-prep`, {
      career: careerGuidance.recommendedCareer,
      resumeHighlights: resumeAnalysis?.strengths?.join(', ') || careerGuidance.prioritySkills.join(', ')
    });

    const prepData = aiResponse.data;

    // Save to database
    const interviewPrep = await InterviewPrep.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        careerGuidance: careerGuidance._id,
        questions: prepData.questions,
        practiceTips: prepData.practiceTips
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: interviewPrep,
      message: 'Interview preparation generated'
    });
  } catch (err) {
    console.error('Interview prep error:', err.message);
    next(err);
  }
};

// Generate Learning Roadmap
export const generateLearningRoadmapController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get career guidance
    const careerGuidance = await CareerGuidance.findOne({ user: userId });
    if (!careerGuidance) {
      return res.status(400).json({
        success: false,
        error: 'Please complete career guidance first'
      });
    }

    // Call Python AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/learning-roadmap`, {
      career: careerGuidance.recommendedCareer,
      skillGaps: careerGuidance.prioritySkills
    });

    const roadmapData = aiResponse.data;

    // Save to database
    const learningRoadmap = await LearningRoadmap.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        careerGuidance: careerGuidance._id,
        shortTerm: roadmapData.shortTerm,
        mediumTerm: roadmapData.mediumTerm,
        estimatedCompletionTime: roadmapData.estimatedCompletionTime
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: learningRoadmap,
      message: 'Learning roadmap generated'
    });
  } catch (err) {
    console.error('Learning roadmap error:', err.message);
    next(err);
  }
};

// Generate Career Report
export const generateCareerReportController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get all career guidance data
    const [careerGuidance, resumeAnalysis, interviewPrep, learningRoadmap] = await Promise.all([
      CareerGuidance.findOne({ user: userId }),
      ResumeAnalysis.findOne({ user: userId }),
      InterviewPrep.findOne({ user: userId }),
      LearningRoadmap.findOne({ user: userId })
    ]);

    if (!careerGuidance) {
      return res.status(400).json({
        success: false,
        error: 'Please complete career guidance first'
      });
    }

    // Create report record
    const report = await CareerReport.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        careerGuidance: careerGuidance._id,
        resumeAnalysis: resumeAnalysis?._id,
        interviewPrep: interviewPrep?._id,
        learningRoadmap: learningRoadmap?._id,
        generatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Populate references for complete data
    await report.populate([
      'careerGuidance',
      'resumeAnalysis',
      'interviewPrep',
      'learningRoadmap'
    ]);

    res.json({
      success: true,
      data: report,
      message: 'Career report generated',
      summary: {
        career: careerGuidance.recommendedCareer,
        confidence: careerGuidance.confidenceScore,
        steps: [
          { name: 'Career Guidance', status: 'completed' },
          { name: 'Resume Analysis', status: resumeAnalysis ? 'completed' : 'pending' },
          { name: 'Interview Prep', status: interviewPrep ? 'completed' : 'pending' },
          { name: 'Learning Roadmap', status: learningRoadmap ? 'completed' : 'pending' }
        ]
      }
    });
  } catch (err) {
    console.error('Report generation error:', err.message);
    next(err);
  }
};

// Get Journey Status
export const getCareerGuidanceStatusController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [careerGuidance, resumeAnalysis, interviewPrep, learningRoadmap] = await Promise.all([
      CareerGuidance.findOne({ user: userId }),
      ResumeAnalysis.findOne({ user: userId }),
      InterviewPrep.findOne({ user: userId }),
      LearningRoadmap.findOne({ user: userId })
    ]);

    res.json({
      success: true,
      steps: [
        {
          name: 'Career Guidance',
          status: careerGuidance ? 'completed' : 'pending',
          data: careerGuidance
        },
        {
          name: 'Resume Analysis',
          status: resumeAnalysis ? 'completed' : 'pending',
          data: resumeAnalysis
        },
        {
          name: 'Interview Preparation',
          status: interviewPrep ? 'completed' : 'pending',
          data: interviewPrep
        },
        {
          name: 'Learning Roadmap',
          status: learningRoadmap ? 'completed' : 'pending',
          data: learningRoadmap
        }
      ],
      currentStep: careerGuidance && !resumeAnalysis ? 2 : careerGuidance && resumeAnalysis && !interviewPrep ? 3 : careerGuidance && resumeAnalysis && interviewPrep && !learningRoadmap ? 4 : careerGuidance && resumeAnalysis && interviewPrep && learningRoadmap ? 5 : 1
    });
  } catch (err) {
    console.error('Status check error:', err);
    next(err);
  }
};
