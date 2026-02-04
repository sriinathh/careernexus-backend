/**
 * INTERVIEW PREPARATION SERVICE
 * 
 * Core business logic:
 * - Profile-aware question generation
 * - Answer evaluation
 * - Readiness score calculation
 */

import { mistralClient } from '../mistral_client.js';

/**
 * COMPANY INTERVIEW PROFILES
 * Real interview patterns for target companies
 */
const COMPANY_PROFILES = {
  Google: {
    rounds: ['Coding (2-3 rounds)', 'System Design', 'Behavioral'],
    focusAreas: ['Algorithms', 'Data Structures', 'Scalability', 'Coding Expertise'],
    difficulty: 'Hard',
    style: 'Theoretical + Practical',
    timelineHours: 4,
    preparationDays: 30
  },
  Amazon: {
    rounds: ['Coding (2 rounds)', 'System Design', 'Behavioral (Leadership)'],
    focusAreas: ['Problem-solving', 'Scaling Systems', 'Customer Focus', 'Ownership'],
    difficulty: 'Hard',
    style: 'Practical + Leadership',
    timelineHours: 4,
    preparationDays: 28
  },
  Microsoft: {
    rounds: ['Coding (2 rounds)', 'Design', 'Behavioral'],
    focusAreas: ['Software Engineering', 'Problem Solving', 'Communication', 'Architecture'],
    difficulty: 'Medium-Hard',
    style: 'Balanced Technical + Soft Skills',
    timelineHours: 3,
    preparationDays: 21
  },
  Netflix: {
    rounds: ['Coding (1-2 rounds)', 'System Design', 'Culture Fit'],
    focusAreas: ['Performance', 'Streaming Tech', 'Innovation', 'Independence'],
    difficulty: 'Hard',
    style: 'Technical + Culture',
    timelineHours: 3,
    preparationDays: 25
  },
  Uber: {
    rounds: ['Coding (2 rounds)', 'System Design', 'Behavioral'],
    focusAreas: ['Scalability', 'Real-time Systems', 'Logistics', 'Product Thinking'],
    difficulty: 'Hard',
    style: 'Real-world Problem Solving',
    timelineHours: 4,
    preparationDays: 28
  },
  Infosys: {
    rounds: ['Coding (1 round)', 'Technical Discussion', 'HR'],
    focusAreas: ['Core Programming', 'Database Concepts', 'Soft Skills', 'Project Experience'],
    difficulty: 'Medium',
    style: 'Traditional + Experience-focused',
    timelineHours: 2,
    preparationDays: 14
  },
  TCS: {
    rounds: ['Coding (1 round)', 'Technical Q&A', 'HR'],
    focusAreas: ['Data Structures', 'OOPS', 'Database', 'Project Knowledge'],
    difficulty: 'Medium',
    style: 'Fundamentals-focused',
    timelineHours: 2,
    preparationDays: 14
  },
  Startup: {
    rounds: ['Coding (1 round)', 'Full-stack Discussion', 'Culture Fit'],
    focusAreas: ['Full-stack Skills', 'Product Sense', 'Ownership', 'Adaptability'],
    difficulty: 'Medium',
    style: 'Practical + Entrepreneurial',
    timelineHours: 2,
    preparationDays: 14
  }
};

/**
 * Generate interview questions based on student profile
 * - Uses missing skills as primary source
 * - Explains WHY each question matters
 * - Adapts to career role
 */
export async function generateInterviewQuestions({
  userId,
  profileSkills = [],
  strengthSkills = [],
  weakSkills = [],
  career = 'Software Developer',
  focusWeakAreas = false,
  company = null,
  academicBackground = 'Computer Science'
}) {
  try {
    // Build prompt that emphasizes weak areas
    const focusText = focusWeakAreas
      ? `IMPORTANT: Generate questions ONLY for these weak/missing skills: ${weakSkills.join(', ')}. 
         For each question, explicitly state which skill it's testing.`
      : `Generate diverse questions covering both: 
         Strengths: ${strengthSkills.join(', ')}
         Gaps to improve: ${weakSkills.join(', ')}`;

    const prompt = `
You are an expert interview coach for ${career} roles.

STUDENT PROFILE:
- Career Target: ${career}
- Strong Skills: ${strengthSkills.length > 0 ? strengthSkills.join(', ') : 'Not specified'}
- Skills to Develop: ${weakSkills.length > 0 ? weakSkills.join(', ') : 'None identified'}
- Academic Background: ${academicBackground}
${company ? `- Target Company: ${company}` : ''}

TASK: Generate 4-5 interview questions for this student.

${focusText}

For EACH question, provide:
1. "question" - The actual interview question
2. "type" - Either "technical", "behavioral", or "situational"
3. "whyAsked" - EXPLAIN WHY this question is asked in interviews (WHY this matters)
4. "whatItTests" - What skill/competency does it test
5. "skillGap" - Which weak skill does this target (if any)
6. "sampleAnswer" - A concise, role-appropriate sample answer (not expert-only, but solid)

Output as JSON array.
`;

    const response = await mistralClient.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // Parse response
    const content = response.message.content;
    let questions = [];

    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback to pre-built questions if parsing fails
        questions = generateFallbackQuestions(career, weakSkills, strengthSkills, company);
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response, using fallback questions');
      questions = generateFallbackQuestions(career, weakSkills, strengthSkills, company);
    }

    return questions;
  } catch (error) {
    console.error('Error generating questions:', error);
    // Return fallback questions on error
    return generateFallbackQuestions(career, weakSkills, strengthSkills, company);
  }
}

/**
 * Fallback questions if LLM fails
 */
function generateFallbackQuestions(career, weakSkills = [], strengthSkills = [], company = null) {
  const baseQuestions = [
    {
      question: `Tell me about your experience with ${weakSkills[0] || 'software development'}. What projects have you built?`,
      type: 'behavioral',
      whyAsked: `${weakSkills[0] || 'This skill'} is critical for this role. Interviewers want to see real-world application.`,
      whatItTests: 'Hands-on experience and problem-solving approach',
      skillGap: weakSkills[0] || null,
      sampleAnswer: `I've worked on several projects using ${weakSkills[0] || 'this technology'}. For example, I built [brief project description]. The key challenge was [problem], which I solved by [approach]. This improved [metric] by [percentage].`
    },
    {
      question: 'Walk me through how you would approach learning a new technology quickly.',
      type: 'behavioral',
      whyAsked: 'Technology evolves rapidly. Interviewers want to know if you can self-teach and adapt.',
      whatItTests: 'Learning ability and problem-solving mindset',
      skillGap: null,
      sampleAnswer: `I start by understanding the fundamentals through official documentation. Then I build a small project to apply what I learned. I also reference tutorials and community resources. This methodical approach helped me master [previous technology] in [timeframe].`
    },
    {
      question: `How would you handle a situation where ${weakSkills[1] || 'project requirements'} changed mid-project?`,
      type: 'situational',
      whyAsked: 'Adaptability is crucial. This reveals your problem-solving and communication skills.',
      whatItTests: 'Flexibility, communication, and project management',
      skillGap: weakSkills[1] || null,
      sampleAnswer: `I would first understand the new requirements clearly. Then I'd assess the impact on the existing timeline and communicate this to stakeholders. We'd prioritize features together and adjust the plan. Clear communication prevents misunderstandings and keeps everyone aligned.`
    },
    {
      question: 'Describe a time you debugged a complex problem. How did you approach it?',
      type: 'behavioral',
      whyAsked: 'Debugging is a daily skill. This shows your analytical and systematic thinking.',
      whatItTests: 'Technical troubleshooting and persistence',
      skillGap: null,
      sampleAnswer: `I encountered a performance issue where [problem]. I started by isolating the issue using [tools/methods]. I wrote tests to confirm my hypothesis, then implemented a fix. The solution improved performance by [metric]. Key lesson: systematic debugging saves time versus random changes.`
    }
  ];

  // Add company-specific question if provided
  if (company) {
    baseQuestions.push({
      question: `Why do you want to work at ${company}, and how do your skills align with their ${career} role?`,
      type: 'behavioral',
      whyAsked: `${company} wants to hire people who are genuinely interested in the company and its mission.`,
      whatItTests: 'Company research and self-awareness',
      skillGap: null,
      sampleAnswer: `I'm drawn to ${company} because [specific reason about their products/mission]. My experience with ${strengthSkills[0] || 'relevant technologies'} combined with my understanding of ${weakSkills[0] || 'emerging technologies'} makes me well-suited for this role. I'm excited to contribute to [specific project or goal].`
    });
  }

  return baseQuestions;
}

/**
 * Evaluate student's answer using AI
 */
export async function evaluateAnswer({
  answer,
  questionId,
  userId
}) {
  try {
    const prompt = `
You are an expert interview evaluator.

Student's Answer: "${answer}"

Evaluate this answer on:
1. Clarity - Is it easy to understand?
2. Completeness - Does it cover the key points?
3. Depth - Does it show real understanding or just surface-level knowledge?

Provide:
- score (0-100)
- feedback (2-3 sentences)
- improvementTips (2-3 specific suggestions)
- strengths (what was good about this answer)

Output as JSON.
`;

    const response = await mistralClient.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    const content = response.message.content;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Fallback evaluation
      return generateFallbackEvaluation(answer);
    }

    return generateFallbackEvaluation(answer);
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return generateFallbackEvaluation(answer);
  }
}

/**
 * Fallback evaluation if LLM fails
 */
function generateFallbackEvaluation(answer) {
  const wordCount = answer.split(' ').length;
  const hasDetails = answer.includes('project') || answer.includes('example') || answer.includes('experienced');
  const hasStructure = answer.includes('.') && answer.length > 50;

  let score = 50; // Base score
  if (hasStructure) score += 20;
  if (hasDetails) score += 15;
  if (wordCount > 50) score += 15;

  return {
    score: Math.min(100, score),
    feedback: `Your answer covers the topic. ${hasDetails ? 'Good use of specific examples.' : 'Consider adding concrete examples.'} ${hasStructure ? 'Clear structure.' : 'Could be better organized.'}`,
    improvementTips: [
      'Add a specific example or project from your experience',
      'Explain the impact or outcome of your work',
      'Keep answers concise but detailed'
    ],
    strengths: [
      hasDetails ? 'Includes real-world examples' : 'Shows understanding of the topic',
      hasStructure ? 'Well-structured response' : 'Covers the main points'
    ]
  };
}

/**
 * Calculate interview readiness score
 * Based on:
 * - Profile completeness
 * - Resume quality
 * - Skill alignment with career path
 */
export async function calculateReadinessScore({ userId, user, company = null }) {
  // Calculate based on available data
  let score = 50; // Base score

  // Profile completeness (0-20 points)
  if (user.skills?.length > 3) score += 5;
  if (user.academics) score += 5;
  if (user.interests?.length > 0) score += 5;
  if (user.profilePhoto) score += 5;

  // Resume quality (0-20 points)
  const resumeAnalysis = user.resumeAnalysis || {};
  if (resumeAnalysis.score >= 75) score += 10;
  else if (resumeAnalysis.score >= 60) score += 5;

  if (resumeAnalysis.strengths?.length > 2) score += 5;
  if (resumeAnalysis.gaps?.length === 0) score += 5; // No gaps = ready

  // Career alignment (0-20 points)
  const careerAnalysis = user.careerGuidance?.analysis || {};
  if (careerAnalysis.confidence >= 80) score += 10;
  if (user.skills?.length >= careerAnalysis.requiredSkills?.length || 0) score += 10;

  // Practice progress (0-20 points)
  // Would be set after answer evaluations
  const practiceScore = user.interviewProgress?.averageScore || 0;
  score += Math.min(20, (practiceScore / 5)); // Max 20 points from practice

  // Company-specific bonus (0-10 points)
  if (company && resumeAnalysis.strengths?.length > 0) {
    score += 5; // Researching specific company = motivated
  }

  score = Math.min(100, score);

  return {
    score: score,
    level: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work',
    profileCompletion: Math.min(100, (Object.keys(user).length / 10) * 100),
    resumeQuality: resumeAnalysis.score || 0,
    careerAlignment: careerAnalysis.confidence || 0,
    practiceProgress: practiceScore,
    nextSteps: getNextSteps(score, resumeAnalysis, careerAnalysis)
  };
}

/**
 * Generate personalized next steps based on readiness assessment
 */
function getNextSteps(score, resumeAnalysis, careerAnalysis) {
  const steps = [];

  if (score < 60) {
    steps.push('Complete your profile with all skills and experience');
    steps.push('Update your resume - focus on quantifying achievements');
  }

  if (resumeAnalysis?.gaps?.length > 0) {
    steps.push(`Work on key skill gaps: ${resumeAnalysis.gaps.slice(0, 2).join(', ')}`);
  }

  if (score < 80) {
    steps.push('Practice 3-5 mock interviews');
    steps.push('Get feedback from mentors or peers');
  }

  if (careerAnalysis?.confidence < 70) {
    steps.push('Spend time exploring your target career role');
  }

  return steps.length > 0 ? steps : ['You\'re well-prepared! Do final mock interviews before the actual interview.'];
}

/**
 * Get company-specific interview insights
 * Returns interview rounds, focus areas, difficulty, and timeline
 */
export function generateCompanyInterviewInsights(company, role) {
  if (!company) return null;

  const profile = COMPANY_PROFILES[company];
  if (!profile) return null;

  return {
    company,
    rounds: profile.rounds,
    focusAreas: profile.focusAreas,
    difficulty: profile.difficulty,
    style: profile.style,
    estimatedTimeline: `${profile.timelineHours} hours spread across rounds`,
    preparationTime: `${profile.preparationDays} days of focused practice`,
    tip: `${company} emphasizes ${profile.focusAreas.slice(0, 2).join(' and ')}. Focus your preparation on these areas.`
  };
}

/**
 * Calculate skill gap between user skills and company requirements
 */
export function calculateSkillGap(userSkills = [], weakSkills = [], company, role) {
  if (!company) return null;

  const profile = COMPANY_PROFILES[company];
  if (!profile) return null;

  const requiredSkills = profile.focusAreas;
  const hasSkill = (skill) => {
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
    return normalizedUserSkills.some(us => us.includes(skill.toLowerCase()));
  };

  const skillAnalysis = requiredSkills.map(skill => ({
    skill,
    mastered: hasSkill(skill),
    isGap: weakSkills.some(ws => ws.toLowerCase().includes(skill.toLowerCase()))
  }));

  const masteredCount = skillAnalysis.filter(s => s.mastered).length;
  const gapCount = skillAnalysis.filter(s => s.isGap).length;
  const skillGapPercentage = Math.round((gapCount / requiredSkills.length) * 100);

  return {
    company,
    role,
    requiredSkills: skillAnalysis,
    masteredSkillsCount: masteredCount,
    totalRequiredSkills: requiredSkills.length,
    skillGapPercentage,
    readinessFit: skillGapPercentage === 0 ? 'Perfect Fit' : skillGapPercentage <= 33 ? 'Good Fit' : skillGapPercentage <= 66 ? 'Fair Fit' : 'Needs Work',
    gapSkills: skillAnalysis.filter(s => s.isGap).map(s => s.skill),
    strengths: skillAnalysis.filter(s => s.mastered).map(s => s.skill)
  };
}


/**
 * Generate 7-Day Interview Preparation Plan
 */
export async function generateInterviewPreparationPlan({
  company,
  role,
  weakSkills = [],
  strengthSkills = []
}) {
  try {
    const prompt = `
You are an expert interview coach.

TASK: Create a 7-day interview preparation plan for a ${role} role at ${company}.
TARGET AUDIENCE: A student with:
- Strengths: ${strengthSkills.join(', ') || 'General CS fundamentals'}
- Weaknesses/Gaps: ${weakSkills.join(', ') || 'No specific gaps identified'}

REQUIREMENTS:
1. The plan must be 7 days long.
2. Each day must have a "topic" and a "focus".
3. Prioritize fixing the "Weaknesses" in the first 3 days.
4. Include company-specific culture/values prep.
5. Include specific technical topics relevant to ${company} and ${role}.

OUTPUT: JSON Array of objects with keys: "day" (number), "topic" (string), "focus" (string).
Example:
[
  { "day": 1, "topic": "Googleyness & Culture", "focus": "Research Google's core values..." },
  ...
]
`;

    const response = await mistralClient.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = response.message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return generateFallbackPrepPlan(company, role);

  } catch (error) {
    console.error('Error generating prep plan:', error);
    return generateFallbackPrepPlan(company, role);
  }
}

function generateFallbackPrepPlan(company, role) {
  return [
    {
      day: 1,
      topic: company ? `${company} Culture & Values` : 'Interview Preparation Basics',
      focus: 'Research company mission, values, and recent news'
    },
    {
      day: 2,
      topic: role ? `${role} Technical Deep Dive` : 'Core Technical Concepts',
      focus: 'Review key technical concepts for this role'
    },
    {
      day: 3,
      topic: 'Mock Interview - Technical',
      focus: 'Practice 3-4 technical interview questions'
    },
    {
      day: 4,
      topic: 'Project Case Study Prep',
      focus: 'Prepare 2-3 project stories to share'
    },
    {
      day: 5,
      topic: 'Behavioral Interview Practice',
      focus: 'Practice STAR method answers'
    },
    {
      day: 6,
      topic: 'Final Mock Interview',
      focus: 'Full mock interview (technical + behavioral)'
    },
    {
      day: 7,
      topic: 'Polish & Review',
      focus: 'Review answers, practice talking points, relax'
    }
  ];
}
