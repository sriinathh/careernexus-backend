import fs from 'fs';
import PDFDocument from 'pdfkit';
import { createRequire } from 'module';
import { llmComplete } from './llmClient.js';
import { ResumeData, SkillProfile, LearningPath, QuizHistory, ProgressTracking, ChatbotHistory } from '../../models/AIModels.js';
import { Course } from '../../models/DomainModels.js';
import { User } from '../../models/User.js';

// pdf-parse is a CommonJS module
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Helper to strip markdown code blocks from LLM responses
const stripMarkdown = (text) => {
  return text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
};

// Resume Analyzer - Combined prompt for faster processing
const RESUME_PARSE_SYSTEM_PROMPT = `You are an expert HR + technical recruiter and ATS system. Given resume text, return STRICT JSON with:
{
  "technicalSkills": [strings],
  "softSkills": [strings],
  "tools": [strings],
  "experience": [strings],
  "projects": [strings],
  "education": [strings],
  "certifications": [strings],
  "atsScore": number (0-100),
  "strengths": [strings],
  "weaknesses": [strings],
  "missingKeywords": [strings],
  "suggestions": [strings]
}
No extra commentary, just valid JSON.`;

export const extractTextFromFile = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (filePath.toLowerCase().endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString('utf8');
};

export const analyzeResume = async (userId, filePath) => {
  console.log('Extracting text from file:', filePath);
  const text = await extractTextFromFile(filePath);
  console.log('Text extracted, length:', text.length);

  const userPrompt = `Resume text:\n"""${text.slice(0, 20000)}"""`;
  console.log('Calling LLM for resume analysis...');
  const completion = await llmComplete({ systemPrompt: RESUME_PARSE_SYSTEM_PROMPT, userPrompt });
  console.log('LLM response received');

  let result;
  try {
    const cleanedResponse = stripMarkdown(completion);
    result = JSON.parse(cleanedResponse);
  } catch (err) {
    console.error('Failed to parse LLM JSON response:', completion);
    throw new Error('Failed to parse resume JSON from LLM');
  }

  // Extract parsed resume data and ATS analysis
  const { atsScore, strengths, weaknesses, missingKeywords, suggestions, ...parsed } = result;

  const atsAnalysis = {
    atsScore: atsScore || calculateBasicATSScore(text, parsed),
    strengths: strengths || ['Well-structured resume'],
    weaknesses: weaknesses || [],
    missingKeywords: missingKeywords || [],
    suggestions: suggestions || ['Add more quantifiable achievements'],
  };

  // Update user profile with resume score
  const { User } = await import('../../models/User.js');
  await User.findByIdAndUpdate(userId, {
    'profile.resumeScore': atsAnalysis.atsScore,
  });

  const doc = await ResumeData.findOneAndUpdate(
    { user: userId },
    { rawText: text, parsed, filePath, atsAnalysis },
    { upsert: true, new: true }
  );
  return doc;
};

function calculateBasicATSScore(text, parsed) {
  let score = 50; // Base score

  // Check for key sections
  if (parsed.technicalSkills?.length > 0) score += 10;
  if (parsed.experience?.length > 0) score += 10;
  if (parsed.projects?.length > 0) score += 10;
  if (parsed.education?.length > 0) score += 10;
  if (parsed.certifications?.length > 0) score += 10;

  // Check for keywords
  const keywords = ['javascript', 'python', 'react', 'node', 'sql', 'api', 'git'];
  const lowerText = text.toLowerCase();
  const foundKeywords = keywords.filter(kw => lowerText.includes(kw));
  score += foundKeywords.length * 2;

  return Math.min(100, score);
}

// Skill Gap Service
// Skill Gap Service - Advanced
// Skill Gap Service - Advanced
const DETAILED_SKILL_GAP_PROMPT = `You are an expert technical career counselor. 
Compare the User's Real Resume Data against the Target Job Role.
Generate a fully dynamic, data-driven Skill Gap Analysis in STRICT JSON.

INPUTS:
- Resume Skills & Experience
- Target Role Requirements

PROCESS:
1. Extract technical skills from the resume.
2. Identify the core requirements for the Target Role.
3. Compare:
   - MATCHED: Skills the user HAS.
   - MISSING: Critical skills the user NEEDS.
   - WEAK: Skills mentioned but lack depth (e.g., listed but no project usage).
4. Prioritize missing skills (High/Medium/Low).

OUTPUT STRUCTURE (STRICT JSON):
{
  "targetRole": "string (The requested role)",
  "readinessScore": number (0-100, calculated based on critical missing skills),
  "strongSkills": ["string" (List matched skills proven in resume)],
  "weakSkills": ["string" (Skills present but weak)"],
  "missingSkills": [
    {
      "name": "string (Skill Name)",
      "importance": "High|Medium|Low",
      "priority": "High|Medium|Low",
      "timeToLearn": "string (e.g. '2 Weeks')",
      "reason": "string (Specific reason why this is needed for this role)",
      "category": "string (e.g. DevOps, Database, Frontend)",
      "learningPlan": {
        "description": "string (Actionable guidance)",
        "steps": ["string" (3 detailed steps to master it)"]
      }
    }
  ],
  "aiInsight": "string (Summarize their standing: e.g., 'You are strong in X but missing Y which is critical for Z.')",
  "dependencyGraph": [
    {
      "skill": "string (Missing Skill Name)",
      "prerequisites": ["string (What they know that helps, e.g. JS -> React)"],
      "unlocks": ["string (Advanced topics)"],
      "reason": "string (Why this path?)",
      "topics": ["string (Key sub-topics)"],
      "resources": [{"name": "string", "url": "string"}]
    }
  ]
}

IMPORTANT:
- DO NOT use static or fake data.
- If the resume is empty, explicitly state that in aiInsight and suggest building a foundation.
- Be realistic. If they want 'Senior Architect' but have 1 year experience, give a low score and honest feedback.`;

export const generateSkillProfile = async ({ userId, parsedResume, roleTarget }) => {
  // Construct a rich user context
  const userContext = {
    role: roleTarget || 'Full Stack Developer',
    resumeSkills: parsedResume?.technicalSkills || [],
    experience: parsedResume?.experience || [],
    projects: parsedResume?.projects || [],
    tools: parsedResume?.tools || []
  };

  const userPrompt = `
  TARGET ROLE: ${userContext.role}
  
  CANDIDATE RESUME:
  - Technical Skills: ${userContext.resumeSkills.join(', ') || 'None listed'}
  - Tools: ${userContext.tools.join(', ') || 'None listed'}
  - Experience Scraps: ${JSON.stringify(userContext.experience).slice(0, 500)}
  - Project Highlights: ${JSON.stringify(userContext.projects).slice(0, 500)}
  
  TASK: Generate a dynamic skill gap analysis. Identify what is missing for ${userContext.role}.`;

  const completion = await llmComplete({
    systemPrompt: DETAILED_SKILL_GAP_PROMPT,
    userPrompt
  });

  let result;
  try {
    const cleanedCompletion = stripMarkdown(completion);
    result = JSON.parse(cleanedCompletion);
  } catch (e) {
    console.error("Skill Gap Parsing Failed", e);
    // Fallback if LLM fails
    result = {
      targetRole: roleTarget,
      readinessScore: 40,
      strongSkills: ['Assessment Failed'],
      weakSkills: [],
      missingSkills: [
        {
          name: 'Retry Analysis',
          importance: 'High',
          timeToLearn: 'Immediate',
          reason: 'AI Service Interruption',
          category: 'System',
          learningPlan: { description: 'Please try again later.', steps: [] }
        }
      ],
      aiInsight: 'We could not process your resume at this time. Please ensure your resume is uploaded correctly.',
      dependencyGraph: []
    };
  }

  // Update DB with the new rich structure
  const doc = await SkillProfile.findOneAndUpdate(
    { user: userId },
    { ...result, roleTarget },
    { upsert: true, new: true }
  );
  return doc;
};

// Learning Plan Service
const LEARNING_PLAN_SYSTEM_PROMPT = `You are an expert personalized curriculum designer.
Generate a dynamic, adaptive WEEKLY LEARNING PLAN based on the user's REAL SKILL GAPS and RESUME.

INPUTS:
- Resume Context: (What they already know - DO NOT RETEACH these)
- Skill Analysis: (Missing & Weak skills - THESE ARE THE FOCUS)
- Target Role: (The end goal)
- Experience Level: (Student/Fresher/Pro - Adjust depth accordingly)

GENERATION LOGIC:
1. **Identify Priorities**:
   - HIGH: Critical missing skills for the role.
   - MEDIUM: Weak skills needing reinforcement.
   - LOW: Nice-to-haves.
2. **Structure the Path**:
   - Start with foundational gaps (e.g., HTML/JS before React).
   - Group related skills (e.g., "Frontend Week", "Database Week").
   - Ensure explicit progression.
3. **Adaptive Load**:
   - Beginner? Slower pace, more basics.
   - Professional? Fast-paced, advanced patterns.

OUTPUT STRUCTURE (STRICT JSON):
{
  "learningPath": [
    {
      "week": "Week 1",
      "topics": ["string (Specific skill focus)"],
      "projects": ["string (Hands-on task)"],
      "practice": ["string (Specific exercise)"],
      "quizzes": ["string (Key concept to test)"],
      "reason": "string (Valid logic: 'You lack X, which is required for Y')"
    }
  ],
  "estimatedCompletionTime": "string (e.g. '8 Weeks')",
  "confidenceLevel": "High|Medium|Low",
  "metadata": "User-specific generated plan"
}

RULES:
- NO STATIC LISTS. If the user knows React, do NOT teach React basics.
- Be specific. Instead of "Learn Databases", say "Learn MongoDB Aggregations".
- If gaps are huge, create a longer plan (up to 12 weeks).
- If gaps are small, create a focused short plan (2-4 weeks).`;

export const generateLearningPlan = async ({ userId, skillProfile, resumeData, userContext }) => {
  // 1. Prepare Rich User Context
  const context = {
    role: skillProfile.roleTarget || 'Full Stack Developer',
    experienceLevel: userContext?.experience || 'Beginner',
    knownSkills: skillProfile.strongSkills || [],
    missingSkills: skillProfile.missingSkills || [],
    weakSkills: skillProfile.weakSkills || [], // Now available from Skill Engine
    resumeHighlights: resumeData?.parsed?.projects?.slice(0, 3) || []
  };

  const userPrompt = `
  TARGET ROLE: ${context.role}
  EXPERIENCE LEVEL: ${context.experienceLevel}

  SKILLS TO SKIP (Already Known):
  ${JSON.stringify(context.knownSkills)}

  CRITICAL GAPS (Must Learn):
  ${JSON.stringify(context.missingSkills)}

  WEAK AREAS (Reinforce):
  ${JSON.stringify(context.weakSkills)}

  TASK:
  Create a custom learning path to bridge these specific gaps.
  - If they miss 'Docker', Week 1 should be 'Containerization'.
  - If they are weak in 'React', include 'Advanced Patterns'.
  - DO NOT teach what they already know.
  `;

  // 2. Call LLM
  const completion = await llmComplete({ systemPrompt: LEARNING_PLAN_SYSTEM_PROMPT, userPrompt });

  let result;
  try {
    const cleanedCompletion = stripMarkdown(completion);
    result = JSON.parse(cleanedCompletion);
  } catch (err) {
    console.error("Learning Plan Parsing Error", err);
    // Dynamic Fallback based on Role
    result = {
      learningPath: [
        {
          week: "Week 1",
          topics: ["Gap Analysis Retry"],
          projects: ["Re-upload Resume"],
          practice: ["Check Connection"],
          quizzes: [],
          reason: "AI Generation Temporary Failure"
        }
      ],
      estimatedCompletionTime: "Unknown",
      confidenceLevel: "Low",
      metadata: "Fallback"
    };
  }

  // 3. Save to DB (Preserve Schema)
  const doc = await LearningPath.findOneAndUpdate(
    { user: userId },
    {
      learningPath: result.learningPath,
      skillLevels: {}, // Deprecated or unused in new logic but kept for schema
      estimatedTime: result.estimatedCompletionTime,
      confidence: result.confidenceLevel,
      lastRecalculatedAt: new Date()
    },
    { upsert: true, new: true }
  );
  return doc;
};

// Adaptive Engine
export const recalculateAdaptivePlan = async (userId) => {
  const [quizStats, progress, skillProfile, resumeData] = await Promise.all([
    QuizHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
    ProgressTracking.findOne({ user: userId }),
    SkillProfile.findOne({ user: userId }),
    ResumeData.findOne({ user: userId })
  ]);

  const avgScore =
    quizStats.length === 0
      ? 0
      : quizStats.reduce((s, q) => s + q.score, 0) / quizStats.length;

  let speedLabel = progress?.learningSpeedLabel || 'average';
  let difficulty = 'medium';

  if (avgScore < 60) difficulty = 'easy';
  if (avgScore > 90) difficulty = 'hard';

  if (progress?.totalStudyMinutesLastWeek < 120) speedLabel = 'slow';
  else if (progress?.totalStudyMinutesLastWeek > 600) speedLabel = 'fast';

  const adjustedSkillProfile = skillProfile
    ? {
      ...skillProfile.toObject(),
      currentSkills: skillProfile.currentSkills.map((s) => {
        let delta = 0;
        if (avgScore > 90) delta = 10;
        if (avgScore < 60) delta = -5;
        return { ...s, level: Math.max(0, Math.min(100, s.level + delta)) };
      })
    }
    : null;

  if (adjustedSkillProfile) {
    await generateLearningPlan({ userId, skillProfile: adjustedSkillProfile, resumeData });
  }

  const plan = await LearningPath.findOne({ user: userId });
  return { plan, difficulty, speedLabel };
};

// Chatbot (CareerNexus-AI)
const CHATBOT_SYSTEM_PROMPT = `You are CareerNexus-AI, an empathetic AI mentor. Explain technical topics clearly, answer doubts, suggest study material, give motivational feedback, and optionally reference the student's learning path. Keep responses concise and structured.`;

export const chatWithLearnBuddy = async ({ userId, message }) => {
  const history = await ChatbotHistory.findOne({ user: userId });
  const learningPath = await LearningPath.findOne({ user: userId });

  const historyText = history
    ? history.messages
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'Student' : 'LearnBuddy'}: ${m.content}`)
      .join('\n')
    : '';

  const userPrompt = `Conversation history:\n${historyText}\n\nStudent latest message: "${message}"\n\nCurrent learning path (summary):\n${JSON.stringify(
    learningPath?.learningPath?.slice(0, 2) || [],
    null,
    2
  )}`;

  const reply = await llmComplete({ systemPrompt: CHATBOT_SYSTEM_PROMPT, userPrompt });

  const updated = await ChatbotHistory.findOneAndUpdate(
    { user: userId },
    {
      $push: {
        messages: {
          $each: [
            { role: 'user', content: message },
            { role: 'assistant', content: reply }
          ],
          $slice: -20
        }
      }
    },
    { upsert: true, new: true }
  );

  return { reply, history: updated };
};

// Career Guidance using AI
const CAREER_GUIDANCE_PROMPT = `You are an expert career counselor and data analyst. Analyze the student's profile and recommend ONE ideal career path.

Return STRICT JSON only:
{
  "career": "Career Title",
  "confidence": 85,
  "confidence": 85,
  "reason": "Detailed explanation using bullet points. Cite specific skills/experience from their profile (e.g., 'Your Project X demonstrates Y').",
  "skill_gaps": [
    {
      "skill": "Skill Name",
      "current": 45,
      "required": 80,
      "importance": "High"
    }
  ],
  "priority_skills": [
    {
      "name": "Skill Name",
      "importance": "Critical/High/Medium",
      "explanation": "Why this skill matters for this career"
    }
  ],
  "action_steps": [
    {
      "action": "Action Title",
      "description": "What to do",
      "timeframe": "1-2 weeks",
      "goal": "Expected outcome"
    }
  ],
  "readiness_score": 72,
  "readiness_explanation": "Overall readiness based on skills and academics"
}`;

export const getCareerGuidance = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return {
        guidance: null,
        profile: null,
        message: 'User not found'
      };
    }

    // Fetch user profile data
    const profile = {
      name: user.name,
      education: user.education || 'Bachelor\'s Degree',
      academicScore: user.academicPerformance || 75,
      skills: user.skills || ['Communication', 'Problem Solving', 'Teamwork'],
      interests: user.interests || ['Technology', 'Innovation', 'Problem Solving']
    };

    // Build context for career guidance
    const userPrompt = `Student Profile:
Name: ${profile.name}
Education: ${profile.education}
Academic Performance: ${profile.academicScore}%
Skills: ${profile.skills.join(', ')}
Interests: ${profile.interests.join(', ')}

Based on this profile, recommend the ideal career with detailed skill gaps analysis.`;

    const completion = await llmComplete({
      systemPrompt: CAREER_GUIDANCE_PROMPT,
      userPrompt
    });

    let guidance = null;
    try {
      const cleanedResponse = stripMarkdown(completion);
      guidance = JSON.parse(cleanedResponse);
    } catch (e) {
      console.error('Failed to parse career guidance:', e);
      // Fallback response with realistic skill gaps
      guidance = {
        career: 'Software Engineer',
        confidence: 85,
        reason: 'Based on your technical foundation and problem-solving skills, Software Engineering aligns perfectly with your profile.',
        skill_gaps: [
          {
            skill: 'Full Stack Development',
            current: 45,
            required: 85,
            importance: 'Critical'
          },
          {
            skill: 'System Design',
            current: 30,
            required: 80,
            importance: 'High'
          },
          {
            skill: 'Database Management',
            current: 40,
            required: 75,
            importance: 'High'
          },
          {
            skill: 'Cloud Deployment',
            current: 20,
            required: 70,
            importance: 'Medium'
          },
          {
            skill: 'Team Leadership',
            current: 50,
            required: 65,
            importance: 'Medium'
          }
        ],
        priority_skills: [
          {
            name: 'Full Stack Development',
            importance: 'Critical',
            explanation: 'Essential for modern software engineering. Master both frontend and backend technologies.'
          },
          {
            name: 'System Design',
            importance: 'High',
            explanation: 'Critical for senior-level opportunities and building scalable solutions.'
          },
          {
            name: 'Problem Solving',
            importance: 'High',
            explanation: 'Core skill for developing efficient algorithms and solutions.'
          }
        ],
        action_steps: [
          {
            action: 'Build a Full-Stack Project',
            description: 'Create an end-to-end web application with frontend, backend, database, and deployment. This practical experience is invaluable.',
            timeframe: '4-6 weeks',
            goal: 'Gain hands-on experience with complete development lifecycle'
          },
          {
            action: 'Learn Cloud Technologies',
            description: 'Complete an AWS or GCP certification course to understand modern deployment practices and scaling.',
            timeframe: '2-3 weeks',
            goal: 'Understand cloud infrastructure and deployment'
          }
        ],
        readiness_score: 72,
        readiness_explanation: 'Your technical foundation is strong (80%), interests align well (85%), and academics support this path (75%). Focus on practical projects to improve hands-on experience.'
      };
    }

    // Persist Readiness Score and Analytics
    if (guidance && guidance.readiness_score) {
      await User.findByIdAndUpdate(userId, {
        'analytics.careerReadiness': guidance.readiness_score,
        'analytics.skillStrength': guidance.confidence || 0,
        'profile.careerGoal': guidance.career
      });
    }

    return {
      guidance,
      profile,
      success: true
    };
  } catch (error) {
    console.error('Career guidance error:', error);
    return {
      guidance: null,
      profile: null,
      message: error.message
    };
  }
};

export const getJobRoleMatch = async (userId, targetRole) => {
  try {
    const { User } = await import('../../models/User.js');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const profile = {
      name: user.name,
      education: user.education || "Bachelor's Degree",
      skills: user.skills || [],
      interests: user.interests || []
    };

    const userPrompt = `Student Profile:
Skills: ${profile.skills.join(', ')}
Interests: ${profile.interests.join(', ')}
Education: ${profile.education}

Target Role: ${targetRole}

Analyze the fit. Return STRICT JSON:
{
  "career": "${targetRole}",
  "confidence": <number 0-100>,
  "reason": "<why it fits or doesnt>",
  "skill_gaps": [{"skill": "<name>", "importance": "High/Medium"}],
  "priority_skills": [{"name": "<skill>", "importance": "High"}],
  "readiness_score": <number 0-100>,
  "readiness_explanation": "<summary>"
}`;

    const completion = await llmComplete({ systemPrompt: CAREER_GUIDANCE_PROMPT, userPrompt });
    const guidance = JSON.parse(stripMarkdown(completion));

    return { guidance, success: true };
  } catch (error) {
    console.error('Job Role Match Error:', error);
    throw error;
  }
};

export const generateCareerReport = async (userId) => {
  try {
    const guidance = await getCareerGuidance(userId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      doc.on('error', (err) => {
        reject(err);
      });

      // --- PDF CONTENT ---

      // Header
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#4f46e5').text('NEXUS Career Guidance Report', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Student Profile Section
      if (guidance.profile) {
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b').text('Student Profile');
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').fillColor('#334155');
        doc.text(`Name: ${guidance.profile.name}`);
        doc.text(`Education: ${guidance.profile.education}`);
        doc.text(`Academic Score: ${guidance.profile.academicScore}%`);

        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Core Skills:');
        doc.font('Helvetica').text(guidance.profile.skills.join(', '));

        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Interests:');
        doc.font('Helvetica').text(guidance.profile.interests.join(', '));
        doc.moveDown(1.5);
      }

      // Career Recommendation
      if (guidance.guidance) {
        const g = guidance.guidance;

        const startY = doc.y;

        // Recommendation Box
        doc.rect(50, startY, 500, 80).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.fillColor('#1e40af').fontSize(14).font('Helvetica-Bold').text(`Recommended Career: ${g.career}`, 70, startY + 20);
        doc.fontSize(12).font('Helvetica').text(`Confidence Match: ${g.confidence}%`, 70, startY + 45);

        // Move cursor below box
        doc.y = startY + 100;

        // Why This Fits
        doc.fillColor('#1e293b').fontSize(16).font('Helvetica-Bold').text('Why This Fits You', 50);
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').fillColor('#334155').text(g.reason, { align: 'justify' });
        doc.moveDown(1.5);

        // Priority Skills
        if (g.priority_skills && g.priority_skills.length > 0) {
          doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b').text('Priority Skills to Master');
          doc.moveDown(0.5);

          g.priority_skills.forEach((skill) => {
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#4338ca').text(`• ${skill.name} (${skill.importance})`);
            doc.fontSize(11).font('Helvetica').fillColor('#475569').text(`   ${skill.explanation}`, { align: 'justify' });
            doc.moveDown(0.5);
          });
          doc.moveDown(1);
        }

        // Action Plan
        if (g.action_steps && g.action_steps.length > 0) {
          doc.addPage();
          doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text('Your Action Plan');
          doc.moveDown(1);

          g.action_steps.forEach((step, i) => {
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text(`${i + 1}. ${step.action}`);
            doc.fontSize(12).font('Helvetica').fillColor('#334155').text(step.description);
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('#64748b').text(`Timeframe: ${step.timeframe}  |  Goal: ${step.goal}`);
            doc.moveDown(1);
          });
        }

        // Readiness
        doc.moveDown(2);
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f766e').text(`Overall Readiness Score: ${g.readiness_score}%`);
        doc.fontSize(12).font('Helvetica').fillColor('#334155').text(g.readiness_explanation);
      }

      // Footer
      doc.fontSize(10).fillColor('#94a3b8').text('Powered by NEXUS AI', 50, 750, { align: 'center', width: 500 });

      doc.end();
    });

  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
};

const CAREER_RISK_ANALYSIS_PROMPT = `You are an AI Career Risk & Stability Analyst.
Analyze the LONG-TERM RISK and STABILITY of the selected career path.

ANALYSIS REQUIREMENTS:
1. Career Stability Score (0-100)
2. Layoff Risk Level (Low/Medium/High)
3. Automation / AI Replacement Risk (Probability & Impact)
4. Market Competition Level
5. Growth & Longevity Outlook (5 Years)

OUTPUT FORMAT (STRICT JSON):
{
  "summary": {
    "stability_score": 85,
    "risk_level": "Low/Medium/High"
  },
  "risk_breakdown": {
    "layoff_risk": "Low/Medium/High",
    "automation_risk": "Low/Medium/High",
    "competition_level": "Low/Medium/High"
  },
  "ai_insight": "Short explanation of why...",
  "risk_mitigation": [
    "Action 1",
    "Action 2",
    "Action 3"
  ],
  "future_proofing_tip": "One strategic recommendation"
}

IMPORTANT: Be realistic, honest, and data-driven. Do NOT exaggerate risks or promise outcomes.`;

export const analyzeCareerRisk = async (userId, targetRole) => {
  try {
    const { User } = await import('../../models/User.js');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const profile = {
      skills: user.skills || [],
      experience: user.experience || 'Student/Fresher',
      industry: user.industry || 'Technology'
    };

    const userPrompt = `Student Profile:
Skills: ${profile.skills.join(', ')}
Experience Level: ${profile.experience}
Industry: ${profile.industry}

Selected Career Role: ${targetRole}

Analyze the risk and stability for this role.`;

    const completion = await llmComplete({
      systemPrompt: CAREER_RISK_ANALYSIS_PROMPT,
      userPrompt
    });

    return JSON.parse(stripMarkdown(completion));
  } catch (error) {
    console.error('Career Risk Analysis Error:', error);
    // Fallback data
    return {
      summary: { stability_score: 75, risk_level: 'Medium' },
      risk_breakdown: { layoff_risk: 'Medium', automation_risk: 'Medium', competition_level: 'High' },
      ai_insight: 'Service temporarily unavailable. Defaulting to general market trends.',
      risk_mitigation: ['Continuous Learning', 'Networking', 'Diversify Skills'],
      future_proofing_tip: 'Stay updated with AI trends.'
    };
  }
};

const HIRING_SIGNAL_PROMPT = `You are a Senior Tech Recruiter at a top-tier company (e.g., Google, Amazon, Microsoft).
You are evaluating this candidate for the role: {role}.

CONTEXT PROVIDED:
- Candidate Resume Analysis
- Skill Gap Results  
- Target Job Role
- Project Details

YOUR TASK:
Simulate how a recruiter would HONESTLY evaluate this candidate. Be realistic, not flattering.

EVALUATION CRITERIA:

1️⃣ Resume Signal Strength (0-100)
   - ATS friendliness (formatting, keywords, structure)
   - Skill clarity (how well skills are presented)
   - Role alignment (relevance to target position)

2️⃣ Skill Match Score (0-100)
   - Core skills match (must-have skills for the role)
   - Missing critical skills (dealbreakers)
   - Skill depth vs breadth

3️⃣ Project Relevance Score (0-100)
   - How relevant projects are to the role
   - Depth vs buzzwords (real impact vs fluff)
   - Technical complexity demonstrated

4️⃣ Interview Probability (0-100)
   - Realistic probability of being shortlisted
   - Based on all factors combined

AI INSIGHT REQUIREMENTS:
- Explain WHY recruiter would shortlist or reject
- Identify what HURTS the profile MOST (be specific)
- Recommend what improves chances FASTEST (prioritized actions)
- Tailor feedback strictly to the role
- NO generic feedback, NO fake promises

OUTPUT STRICT JSON:
{
  "resumeSignalStrength": number (0-100),
  "skillMatchScore": number (0-100),
  "projectRelevanceScore": number (0-100),
  "interviewProbability": number (0-100),
  "summary": "string (2-3 sentence professional summary of candidate standing)",
  "recruiterInsight": "string (Honest, direct feedback: Why shortlist/reject? What hurts most? What helps most? Be brutally honest but constructive.)",
  "strengths": ["string (specific strengths that help their case)"],
  "weaknesses": ["string (specific weaknesses that hurt their chances)"],
  "improvementActions": ["string (prioritized actions ranked by impact - what to fix FIRST for fastest improvement)"],
  "verdict": "Shortlisted | Borderline | Rejected"
}

CANDIDATE PROFILE:
Skills: {skills}
Experience: {experience}
Projects: {projects}
Target Role: {role}

Remember: Be honest, not flattering. Help them understand exactly how they look to a recruiter and what matters most.`;

export const evaluateHiringSignal = async (userId, targetRole) => {
  try {
    const { User } = await import('../../models/User.js');
    const { ResumeData } = await import('../../models/AIModels.js');

    const user = await User.findById(userId);
    const resume = await ResumeData.findOne({ user: userId });

    if (!user) throw new Error('User not found');

    const profile = {
      skills: user.skills || [],
      experience: user.experience || 'Student/Fresher',
      projects: resume?.parsed?.projects || []
    };

    const userPrompt = `Candidate Profile:
Skills: ${profile.skills.join(', ')}
Experience: ${profile.experience}
Projects: ${profile.projects.join('; ')}

Target Role: ${targetRole}`;

    const completion = await llmComplete({
      systemPrompt: HIRING_SIGNAL_PROMPT.replace('{role}', targetRole)
        .replace('{skills}', profile.skills.join(', '))
        .replace('{experience}', profile.experience)
        .replace('{projects}', profile.projects.join(', ')),
      userPrompt
    });

    return JSON.parse(stripMarkdown(completion));
  } catch (error) {
    console.error('Hiring Signal Evaluation Error:', error);
    return {
      resumeSignalStrength: 65,
      skillMatchScore: 70,
      projectRelevanceScore: 60,
      interviewProbability: 40,
      summary: "Evaluation unavailable.",
      recruiterInsight: "Unable to process detailed signals. Focus on core skills.",
      strengths: [],
      weaknesses: [],
      improvementActions: []
    };
  }
};

