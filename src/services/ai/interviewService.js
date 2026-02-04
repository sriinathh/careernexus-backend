import { llmComplete } from './llmClient.js';
import { User } from '../../models/User.js';
import { SkillProfile, ResumeData, InterviewPractice } from '../../models/AIModels.js';


// --- PROMPTS ---

const QUESTION_GENERATION_PROMPT = `
You are an expert technical interviewer for top tech companies.
Your goal is to generate interview questions tailored to a candidate's profile.

INPUT:
- Career Role: {targetRole}
- Candidate Skills: {skills}
- Missing/Weak Skills: {weakSkills}
- Focus on Weak Areas: {focusWeakAreas}

INSTRUCTIONS:
1. Generate 3 unique interview questions.
2. If "Focus on Weak Areas" is true, prioritize questions about the Missing/Weak Skills.
3. If not, provide a balanced mix (Technical, Behavioral, Problem Solving).
4. For EACH question, provide:
   - "question": The question text.
   - "type": technical / behavioral / scenario.
   - "whyAsked": A 1-sentence explanation of WHY this question is important for this role.
   - "whatItTests": What specific competency this tests.
   - "sampleAnswer": A concise, high-quality sample answer.

OUTPUT FORMAT (STRICT JSON ARRAY):
[
  {
    "question": "...",
    "type": "...",
    "whyAsked": "...",
    "whatItTests": "...",
    "sampleAnswer": "..."
  }
]
`;

const ANSWER_EVALUATION_PROMPT = `
You are an AI Interview Coach. Evaluate the candidate's answer.

Question: {question}
Candidate Answer: {userAnswer}
Role: {targetRole}

INSTRUCTIONS:
1. Rate the answer from 0-100 based on clarity, correctness, and depth.
2. Provide constructive feedback.
3. Suggest one specific improvement.

OUTPUT FORMAT (STRICT JSON):
{
  "score": number,
  "feedback": "...",
  "improvementTips": "..."
}
`;



const COMPANY_QUESTION_PROMPT = `
You are a hiring manager at { company } for the { role } role.
Generate interview questions that reflect { company } 's specific interview style, culture, and values.

INPUT:
- Company: { company }
- Role: { role }
- Candidate Skills: { skills }

INSTRUCTIONS:
1. Generate 3 interview questions specifically tailored to { company }.
2. For each question, explain WHY { company } asks this(Values / Culture).
3. Include "insights" about the company's interview process.

OUTPUT FORMAT(STRICT JSON):
{
    "questions": [
        {
            "question": "...",
            "type": "technical/behavioral",
            "whyAsked": "At {company}, we value...",
            "whatItTests": "...",
            "sampleAnswer": "..."
        }
    ],
        "insights": {
        "focusAreas": ["..."],
            "roundStructure": ["..."],
                "tip": "..."
    }
}
`;

const PREP_PLAN_PROMPT = `
Create a 7 - Day Interview Preparation Plan for { company } - { role }.
Candidate Skills: { skills }
Missing / Weak Skills: { weakSkills }

INSTRUCTIONS:
1. Design a day - by - day plan(Day 1 to Day 7).
2. Focus on closing skill gaps and mastering { company } specific topics.
3. Be actionable and specific.

OUTPUT FORMAT(STRICT JSON):
{
    "plan": [
        {
            "day": 1,
            "topic": "...",
            "activities": ["..."],
            "focus": "..."
        }
    ]
}
`;

// --- SERVICES ---

/**
 * Generate company-specific questions & insights
 */
export const generateCompanyInterviewQuestions = async (userId, { company, role }) => {
    const [user, skillProfile] = await Promise.all([
        User.findById(userId),
        SkillProfile.findOne({ user: userId })
    ]);

    const skills = user?.skills?.join(', ') || "";

    const systemPrompt = COMPANY_QUESTION_PROMPT
        .replace(/{company}/g, company)
        .replace(/{role}/g, role)
        .replace('{skills}', skills);

    let result = { questions: [], insights: {} };

    try {
        const response = await llmComplete({
            systemPrompt: "You are a specialized recruiter. Return valid JSON.",
            userPrompt: systemPrompt
        });


        // Clean and Parse
        const cleanJson = response.replace(/^```json/g, '').replace(/```$/g, '').trim();
        result = JSON.parse(cleanJson);
    } catch (error) {
        console.error('LLM Error generating company questions:', error);
        // Fallback
        result = {
            questions: [{
                question: `Why do you want to work at ${company}?`,
                type: "behavioral",
                whyAsked: "Cultural fit check",
                whatItTests: "Passion & Research",
                sampleAnswer: `I admire ${company}'s innovation in...`
            }],
            insights: { focusAreas: ["General Technical"], roundStructure: ["Standard"], tip: "Research values." }
        };
    }

    // Save session to DB
    const session = await InterviewPractice.create({
        user: userId,
        company,
        targetRole: role,
        focusWeakAreas: false, // Implicitly focused logic in prompt
        questions: result.questions.map(q => ({
            question: q.question,
            type: q.type,
            whyAsked: q.whyAsked,
            whatItTests: q.whatItTests,
            sampleAnswer: q.sampleAnswer
        }))
    });

    // Return session (with IDs) + specific insights
    return {
        session, // Frontend needs session._id and question._ids
        insights: result.insights
    };
};

/**
 * Generate 7-Day Prep Plan
 */
export const generatePrepPlan = async (userId, { company, role }) => {
    const [user, skillProfile] = await Promise.all([
        User.findById(userId),
        SkillProfile.findOne({ user: userId })
    ]);

    const skills = user?.skills?.join(', ') || "";
    const weakSkills = skillProfile?.missingSkills?.join(', ') || "";

    const systemPrompt = PREP_PLAN_PROMPT
        .replace(/{company}/g, company)
        .replace(/{role}/g, role)
        .replace('{skills}', skills)
        .replace('{weakSkills}', weakSkills);

    let plan = [];
    try {
        const response = await llmComplete({
            systemPrompt: "You are a career coach. Return valid JSON.",
            userPrompt: systemPrompt
        });
        const cleanJson = response.replace(/^```json/g, '').replace(/```$/g, '').trim();
        const data = JSON.parse(cleanJson);
        plan = data.plan;
    } catch (error) {
        console.error('LLM Error generating prep plan:', error);
        plan = Array(7).fill({ day: 0, topic: "General Prep", activities: ["Review fundamentals"], focus: "Basics" }).map((d, i) => ({ ...d, day: i + 1 }));
    }

    return plan;
};

/**
 * Generate interview questions based on user profile and preferences
 */
export const generateInterviewQuestions = async (userId, { targetRole, focusWeakAreas = false }) => {
    // 1. Fetch User Context
    const [user, skillProfile, resume] = await Promise.all([
        User.findById(userId),
        SkillProfile.findOne({ user: userId }),
        ResumeData.findOne({ user: userId })
    ]);

    const skills = user?.skills || [];
    const weakSkills = skillProfile?.missingSkills || [];

    // 2. Prepare Prompt
    const userPrompt = JSON.stringify({
        targetRole: targetRole || skillProfile?.roleTarget || 'Software Engineer',
        skills: skills.join(', '),
        weakSkills: weakSkills.join(', '),
        focusWeakAreas: String(focusWeakAreas)
    });

    const systemPrompt = QUESTION_GENERATION_PROMPT
        .replace('{targetRole}', targetRole || 'General')
        .replace('{skills}', skills.join(', '))
        .replace('{weakSkills}', weakSkills.join(', '))
        .replace('{focusWeakAreas}', String(focusWeakAreas));

    // 3. Call LLM
    console.log('Generating interview questions...');
    let questions = [];
    try {
        const response = await llmComplete({
            systemPrompt: "You are an interview question generator. valid JSON array output only.",
            userPrompt: systemPrompt
        });

        // Clean and Parse
        const cleanJson = response.replace(/^```json/g, '').replace(/```$/g, '').trim();
        questions = JSON.parse(cleanJson);
    } catch (error) {
        console.error('LLM Error generating questions:', error);
        // Fallback questions if LLM fails
        questions = [
            {
                question: "Describe a challenging project you've worked on.",
                type: "behavioral",
                whyAsked: "To assess problem-solving skills and resilience.",
                whatItTests: "Communication, grit, and project management.",
                sampleAnswer: "I built a scalable API..."
            }
        ];
    }

    // 4. Create Interview Session in DB
    const session = await InterviewPractice.create({
        user: userId,
        targetRole,
        focusWeakAreas,
        questions: questions.map(q => ({
            question: q.question,
            type: q.type,
            whyAsked: q.whyAsked,
            whatItTests: q.whatItTests,
            sampleAnswer: q.sampleAnswer
        }))
    });

    return session;
};

/**
 * Evaluate a single answer
 */
export const evaluateAnswer = async (sessionId, questionId, userAnswer) => {
    const session = await InterviewPractice.findById(sessionId);
    if (!session) throw new Error('Session not found');

    const question = session.questions.id(questionId);
    if (!question) throw new Error('Question not found');

    // Call LLM for evaluation
    const prompt = ANSWER_EVALUATION_PROMPT
        .replace('{question}', question.question)
        .replace('{userAnswer}', userAnswer)
        .replace('{targetRole}', session.targetRole);

    let evaluation = { score: 0, feedback: "Analysis failed", improvementTips: "Try again." };

    try {
        const response = await llmComplete({
            systemPrompt: "You are an expert interviewer. return valid JSON only.",
            userPrompt: prompt
        });
        const cleanJson = response.replace(/^```json/g, '').replace(/```$/g, '').trim();
        evaluation = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Evaluation error:", e);
    }

    // Update DB
    question.userAnswer = userAnswer;
    question.aiFeedback = evaluation.feedback;
    question.score = evaluation.score;
    question.improvementTips = evaluation.improvementTips;

    await session.save();

    return evaluation;
};

/**
 * Calculate readiness score based on history
 */
/**
 * Calculate readiness score based on history
 * Supports optional company filter
 */
export const getReadinessScore = async (userId, company = null) => {
    const query = { user: userId };
    if (company) {
        query.company = company;
    }

    const practices = await InterviewPractice.find(query).sort({ createdAt: -1 }).limit(10);

    if (!practices.length) return { score: 0, distinct: "Not yet started" };

    let totalScore = 0;
    let questionCount = 0;

    practices.forEach(p => {
        p.questions.forEach(q => {
            if (q.score !== undefined) {
                totalScore += q.score;
                questionCount++;
            }
        });
    });

    const averageScore = questionCount > 0 ? Math.round(totalScore / questionCount) : 0;

    return {
        score: averageScore,
        sessionsCompleted: practices.length,
        questionsAnswered: questionCount,
        distinct: averageScore > 80 ? "Interview Ready" : averageScore > 50 ? "Improving" : "Needs Practice"
    };
};


const PDF_CONTENT_PROMPT = `
    Target: { company } - { role }
Candidate Skills: { skills }

INSTRUCTIONS:
1. Create a structured guide.
2. Content Should include:
- "Overview": Brief description of the role at { company }.
- "Focus Areas": 3 - 4 bullet points on what { company } looks for.
   - "Technical Questions": 3 role - specific technical questions.
   - "Behavioral Questions": 2 behavioral questions aligned with { company } values.
   - "Tips": 3 preparation tips.

OUTPUT FORMAT(STRICT JSON):
{
    "overview": "...",
        "focusAreas": ["..."],
            "technicalQuestions": ["..."],
                "behavioralQuestions": ["..."],
                    "tips": ["..."]
}
`;

export const generateInterviewPDF = async (userId, { company, role }) => {
    const [user] = await Promise.all([User.findById(userId)]);
    const skills = user?.skills?.join(', ') || "";

    // 1. Get Content from LLM
    const systemPrompt = PDF_CONTENT_PROMPT
        .replace(/{company}/g, company || "General Company")
        .replace(/{role}/g, role)
        .replace('{skills}', skills);

    let content = { overview: "Could not generate.", focusAreas: [], technicalQuestions: [], behavioralQuestions: [], tips: [] };

    try {
        const response = await llmComplete({
            systemPrompt: "You are a professional career coach. Return valid JSON.",
            userPrompt: systemPrompt
        });
        const cleanJson = response.replace(/^```json/g, '').replace(/```$/g, '').trim();
        content = JSON.parse(cleanJson);
    } catch (e) {
        console.error("PDF Content Gen Error", e);
        content = {
            overview: `Preparation guide for ${role} at ${company}.`,
            focusAreas: ["Technical Depth", "Communication"],
            technicalQuestions: ["Describe a difficult API you built."],
            behavioralQuestions: ["Tell me about a time you failed."],
            tips: ["Review your resume.", "Practice coding."]
        };
    }

    // 2. Generate PDF
    try {
        // Dynamic import to prevent server crash if pdfkit is missing
        const { default: PDFDocument } = await import('pdfkit');

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (err) => reject(err));

            // --- Header ---
            doc.fillColor('#444444').fontSize(20).text('Interview Preparation Guide', { align: 'center' });
            doc.moveDown();
            doc.fillColor('#000000').fontSize(16).text(`${role}`, { align: 'center', bold: true });
            if (company) doc.text(`Target: ${company}`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`Generated by CareerNexus AI for ${user.name}`, { align: 'center' });
            doc.moveDown(2);

            // --- Overview ---
            doc.fillColor('#2c3e50').fontSize(14).text('Role Overview', { underline: true });
            doc.moveDown(0.5);
            doc.fillColor('#000000').fontSize(12).text(content.overview, { align: 'justify' });
            doc.moveDown(1.5);

            // --- Focus Areas ---
            doc.fillColor('#2c3e50').fontSize(14).text('Key Focus Areas', { underline: true });
            doc.moveDown(0.5);
            content.focusAreas.forEach(item => {
                doc.fillColor('#000000').fontSize(12).text(`• ${item}`, { indent: 20 });
            });
            doc.moveDown(1.5);

            // --- Technical Questions ---
            doc.fillColor('#2c3e50').fontSize(14).text('Technical Questions to Practice', { underline: true });
            doc.moveDown(0.5);
            content.technicalQuestions.forEach((q, i) => {
                doc.fillColor('#000000').fontSize(12).text(`${i + 1}. ${q}`);
                doc.moveDown(0.5);
            });
            doc.moveDown(1);

            // --- Behavioral Questions ---
            doc.fillColor('#2c3e50').fontSize(14).text('Behavioral & Culture Fit', { underline: true });
            doc.moveDown(0.5);
            content.behavioralQuestions.forEach((q, i) => {
                doc.fillColor('#000000').fontSize(12).text(`${i + 1}. ${q}`);
                doc.moveDown(0.5);
            });
            doc.moveDown(1);

            // --- Tips ---
            doc.rect(50, doc.y, 500, 100).fill('#f0f9ff').stroke();
            doc.fillColor('#2c3e50').fontSize(14).text('Success Tips', 60, doc.y + 10, { underline: true });
            doc.moveDown(0.5);
            content.tips.forEach(item => {
                doc.fillColor('#000000').fontSize(12).text(`• ${item}`, { indent: 20 });
            });

            doc.end();
        });
    } catch (error) {
        console.error("PDF Generation Error (pdfkit likely missing):", error);
        throw new Error("PDF generation failed. Please try again later.");
    }
};
