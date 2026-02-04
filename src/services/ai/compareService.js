import { llmComplete } from './llmClient.js';
import { User } from '../../models/User.js';

const COMPARE_ROLES_PROMPT = `
You are an expert Career Strategist and Market Analyst. 
Perform a deep "Trade-off Analysis" between these two career paths for the specific user.

User Profile:
Skills: {skills}
Experience: {experience}
Interests: {interests}

Option A: {roleA}
Option B: {roleB}

TASK:
Compare them effectively to help the user choose. Be brutally honest about the effort vs reward.

METRICS TO COMPARE:
1. Salary Growth (Starting -> 5 Year Outlook)
2. Stability & Risk (Recession proof? AI risk?)
3. Learning Effort (Months/Years to master from CURRENT skill level)
4. Competition Level (Entry barrier)
5. Time-to-Job Readiness (How soon can they get hired?)

OUTPUT STRICT JSON:
{
  "comparison": [
    {
      "criteria": "Salary Growth",
      "roleA_val": "string (e.g. Starts $60k -> $120k)",
      "roleB_val": "string",
      "winner": "Role A/B/Tie",
      "insight": "Explain the financial trajectory difference."
    },
    {
      "criteria": "Stability & Risks",
      "roleA_val": "string (e.g. Stable, Low AI Risk)",
      "roleB_val": "string",
      "winner": "Role A/B/Tie",
      "insight": "Which is safer long-term?"
    },
    {
      "criteria": "Learning Effort",
      "roleA_val": "string (e.g. 6 Months intense study)",
      "roleB_val": "string",
      "winner": "Role A/B/Tie",
      "insight": "Which is easier to learn given their CURRENT skills?"
    },
    {
      "criteria": "Market Competition",
      "roleA_val": "string (e.g. Oversaturated / High)",
      "roleB_val": "string",
      "winner": "Role A/B/Tie",
      "insight": "Where is it easier to stand out?"
    },
    {
      "criteria": "Time-to-Job Readiness",
      "roleA_val": "string (e.g. 3 Months)",
      "roleB_val": "string",
      "winner": "Role A/B/Tie",
      "insight": "Which gets them a paycheck faster?"
    }
  ],
  "verdict": {
    "role": "Role A or B",
    "short_reason": "The decisive reason why.",
    "trade_off": "You choose this, but you give up X."
  }
}
`;

export const compareJobRoles = async (userId, roleA, roleB) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const profile = {
      skills: user.skills ? user.skills.join(', ') : 'None',
      experience: user.experienceLevel || 'Student',
      interests: user.interests ? user.interests.join(', ') : 'Tech',
    };

    const systemPrompt = COMPARE_ROLES_PROMPT
      .replace('{skills}', profile.skills)
      .replace('{experience}', profile.experience)
      .replace('{interests}', profile.interests)
      .replace(/{roleA}/g, roleA)
      .replace(/{roleB}/g, roleB);

    const completion = await llmComplete({
      systemPrompt: "You are a career analyst. Provide JSON only.",
      userPrompt: systemPrompt
    });

    const cleanJson = completion.replace(/^```json/g, '').replace(/```$/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Role Compare Error:', error);
    // Fallback
    return {
      comparison: [],
      recommendation: { role: roleA, reason: "AI Service Unavailable. Both are good options." }
    };
  }
};
