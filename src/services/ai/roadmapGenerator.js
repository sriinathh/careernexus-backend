/**
 * CAREER ROADMAP GENERATOR
 * 
 * Converts career guidance analysis into actionable, phase-based roadmaps.
 * Uses rule-based logic to generate skill-gap-driven tasks.
 * 
 * Features:
 * - Phase-based roadmap structure (Foundation → Portfolio → Industry → Execution)
 * - Multiple execution paths (Internship, Placement, Higher Studies)
 * - Skill-gap-driven tasks with explainability
 * - Health indicator based on completion metrics
 * - Impact preview showing expected outcomes
 */

/**
 * Roadmap Data Structure
 * 
 * {
 *   career: string,
 *   confidence: number,
 *   path: string (internship|placement|studies),
 *   phases: [
 *     {
 *       id: string,
 *       name: string,
 *       duration: string,
 *       description: string,
 *       tasks: [
 *         {
 *           id: string,
 *           title: string,
 *           description: string,
 *           priority: 'High' | 'Medium' | 'Low',
 *           reason: string (WHY this task),
 *           impact: string (HOW it improves readiness),
 *           metric: string (resume|readiness|interview|portfolio),
 *           estimatedDays: number,
 *           resources: [string],
 *           status: 'pending' | 'completed' | 'locked'
 *         }
 *       ]
 *     }
 *   ],
 *   health: {
 *     status: 'on-track' | 'needs-attention' | 'off-track',
 *     completionRate: number,
 *     reason: string
 *   },
 *   impactPreview: {
 *     resumeScoreImprovement: number,
 *     readinessImprovement: number,
 *     interviewReadiness: string
 *   }
 * }
 */

/**
 * Generate personalized roadmap from career guidance analysis
 * @param {Object} careerAnalysis - Career guidance data with scores and skills
 * @param {string} path - Execution path: 'internship', 'placement', or 'studies'
 * @returns {Object} Complete roadmap with phases, tasks, and metrics
 */
function generateRoadmap(careerAnalysis, path = 'placement') {
  if (!careerAnalysis || !careerAnalysis.primaryCareer) {
    throw new Error('Invalid career analysis data');
  }

  const {
    primaryCareer,
    confidence = 0,
    resumeScore = 0,
    readinessScore = 0,
    strengthSkills = [],
    missingSkills = [],
    experienceLevel = 'Student'
  } = careerAnalysis;

  // Generate skill-gap-driven tasks
  const skillGapTasks = generateSkillGapTasks(
    primaryCareer,
    missingSkills,
    strengthSkills,
    experienceLevel
  );

  // Organize tasks into phases based on execution path
  const phases = organizeIntoPhases(
    skillGapTasks,
    path,
    experienceLevel,
    readinessScore
  );

  // Calculate health status
  const health = calculateHealth(readinessScore, confidence);

  // Generate impact preview
  const impactPreview = generateImpactPreview(
    missingSkills.length,
    resumeScore,
    readinessScore
  );

  return {
    career: primaryCareer,
    confidence,
    path,
    phase: 'Foundation', // Current phase
    completedTasks: 0,
    totalTasks: phases.reduce((sum, p) => sum + p.tasks.length, 0),
    phases,
    health,
    impactPreview,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate tasks driven by skill gaps and weaknesses
 * Only creates tasks because of actual gaps, not generic steps
 */
function generateSkillGapTasks(career, missingSkills, strengthSkills, experienceLevel) {
  const tasks = [];

  // MISSING SKILLS TASKS - Highest priority
  missingSkills.forEach((skill) => {
    const skillTasks = getSkillLearningTasks(skill, career);
    tasks.push(...skillTasks);
  });

  // PORTFOLIO/PROJECT TASKS - Build real-world evidence
  tasks.push({
    id: 'portfolio-project',
    title: `Build ${career} Portfolio Project`,
    description: `Create 2-3 end-to-end projects demonstrating ${career} skills. Examples: Data analysis project, ML pipeline, dashboard, etc.`,
    priority: 'High',
    reason: 'Portfolio projects are the strongest signal for ${career} roles. Demonstrates practical capability to employers.',
    impact: 'Increases resume score by 15-20%. Provides concrete examples for interviews.',
    metric: 'resume',
    estimatedDays: 21,
    resources: [
      'GitHub for code hosting',
      'Kaggle/Towards Data Science for project ideas',
      'Medium for documentation'
    ],
    xpReward: 500,
    status: 'pending'
  });

  // RESUME OPTIMIZATION TASK
  tasks.push({
    id: 'resume-optimization',
    title: `Optimize Resume for ${career}`,
    description: 'Update resume with projects, quantified achievements, and relevant keywords for ${career} roles.',
    priority: 'High',
    reason: 'Resume is first impression. ATS keywords directly impact interview opportunities.',
    impact: 'Resume passes ATS filters. Increases interview callback rate.',
    metric: 'resume',
    estimatedDays: 5,
    resources: ['Overleaf resume templates', 'LinkedIn job postings for keywords'],
    xpReward: 200,
    status: 'pending'
  });

  // EXPERIENCE TASKS - Based on current level
  if (experienceLevel === 'Student' || experienceLevel === 'Fresher') {
    tasks.push({
      id: 'internship-target',
      title: `Secure ${career} Internship`,
      description: `Target internships in ${career} roles at companies like Google, Amazon, startups, etc.`,
      priority: 'High',
      reason: 'Internship experience is the bridge between academics and jobs. Adds real-world credibility.',
      impact: 'Readiness score +25%. Interview readiness becomes "High".',
      metric: 'readiness',
      estimatedDays: 60,
      resources: ['LinkedIn, Internshala, AngelList'],
      xpReward: 1000,
      status: 'pending'
    });
  }

  // INTERVIEW PREPARATION TASK
  tasks.push({
    id: 'interview-prep',
    title: `${career} Interview Preparation`,
    description: `Practice technical interviews, case studies, and behavioral questions for ${career} roles.`,
    priority: 'High',
    reason: 'Interview skills directly determine job offers. Technical + behavioral both matter.',
    impact: 'Interview readiness: High. Success rate in interviews increases.',
    metric: 'interview',
    estimatedDays: 30,
    resources: ['LeetCode, HackerRank for coding', 'STAR method for behavioral', 'Mock interviews'],
    xpReward: 400,
    status: 'pending'
  });

  return tasks;
}

/**
 * Map specific missing skill to actionable learning tasks
 */
function getSkillLearningTasks(skill, career) {
  const skillMap = {
    'Power BI': {
      title: 'Master Power BI for Data Visualization',
      description: 'Complete Power BI fundamentals course and build 2 interactive dashboards.',
      estimatedDays: 21,
      resources: ['Microsoft Learn Power BI', 'Udemy course', 'kaggle datasets'],
      reason: 'Power BI is critical for ${career} roles. Most job postings require it.',
      impact: 'Resume score +10%. Direct match with job requirements.',
      xpReward: 300
    },
    'Advanced Excel': {
      title: 'Advanced Excel for Data Analysis',
      description: 'Learn VLOOKUP, Pivot Tables, complex formulas. Build analysis dashboards.',
      estimatedDays: 14,
      resources: ['ExcelIsFun YouTube series', 'LinkedIn Learning'],
      reason: 'Excel is foundation tool for ${career}. Required in 80% of analyst roles.',
      impact: 'Resume score +8%. Interview confidence for technical questions.',
      xpReward: 250
    },
    'Machine Learning': {
      title: 'Machine Learning Fundamentals',
      description: 'Learn ML algorithms, scikit-learn, build 2 ML projects.',
      estimatedDays: 28,
      resources: ['Andrew Ng ML course', 'Fast.ai', 'Kaggle competitions'],
      reason: 'ML is differentiator for senior analyst and data science roles.',
      impact: 'Positions for higher roles. Resume score +15%.',
      xpReward: 400
    },
    'SQL': {
      title: 'Advanced SQL Mastery',
      description: 'Complex joins, window functions, query optimization.',
      estimatedDays: 21,
      resources: ['LeetCode Database', 'Mode Analytics SQL tutorial'],
      reason: 'SQL is backbone of data work. Deep knowledge sets you apart.',
      impact: 'Interview readiness for technical interviews. Resume score +10%.',
      xpReward: 300
    },
    'Python': {
      title: 'Python for Data Analysis',
      description: 'Pandas, NumPy, data manipulation, automation projects.',
      estimatedDays: 28,
      resources: ['DataCamp', 'Real Python', 'Kaggle projects'],
      reason: 'Python is most in-demand skill for modern ${career} roles.',
      impact: 'Enables portfolio projects. Resume score +12%.',
      xpReward: 350
    }
  };

  const skillConfig = skillMap[skill] || {
    title: `Master ${skill} Skill`,
    description: `Complete comprehensive course in ${skill} and build practical projects.`,
    estimatedDays: 21,
    resources: ['Udemy', 'Coursera', 'LinkedIn Learning'],
    reason: `${skill} is required skill for ${career} roles.`,
    impact: `Resume score +10%. Direct match with job requirements.`,
    xpReward: 300
  };

  return [{
    id: `skill-${skill.toLowerCase().replace(/\s+/g, '-')}`,
    title: skillConfig.title,
    description: skillConfig.description,
    priority: 'High',
    reason: skillConfig.reason,
    impact: skillConfig.impact,
    metric: 'resume',
    estimatedDays: skillConfig.estimatedDays,
    resources: skillConfig.resources,
    xpReward: skillConfig.xpReward,
    status: 'pending'
  }];
}

/**
 * Organize tasks into career phases based on path and priorities
 */
function organizeIntoPhases(tasks, path, experienceLevel, readinessScore) {
  const phases = [];

  // FOUNDATION PHASE - Learn basics
  phases.push({
    id: 'foundation',
    name: '📚 Foundation Phase',
    duration: '4-6 weeks',
    description: 'Master core skills and knowledge needed for this career path.',
    icon: '📚',
    tasks: tasks
      .filter(t => t.metric === 'resume' && (t.priority === 'High' || t.id.startsWith('skill-')))
      .slice(0, 4),
    completedTasks: 0
  });

  // PORTFOLIO PHASE - Build projects
  phases.push({
    id: 'portfolio',
    name: '🎯 Portfolio Phase',
    duration: '3-4 weeks',
    description: 'Build real-world projects to demonstrate capabilities.',
    icon: '🎯',
    tasks: [
      tasks.find(t => t.id === 'portfolio-project'),
      tasks.find(t => t.id === 'resume-optimization')
    ].filter(Boolean),
    completedTasks: 0
  });

  // INDUSTRY READINESS PHASE
  let industryTasks = [tasks.find(t => t.id === 'interview-prep')];
  
  if (path === 'internship' && (experienceLevel === 'Student' || experienceLevel === 'Fresher')) {
    industryTasks.unshift(tasks.find(t => t.id === 'internship-target'));
  }

  phases.push({
    id: 'industry',
    name: '🚀 Industry Readiness Phase',
    duration: '4-6 weeks',
    description: path === 'internship' 
      ? 'Land internship and prepare for on-the-job success.'
      : 'Prepare for job applications and interviews.',
    icon: '🚀',
    tasks: industryTasks.filter(Boolean),
    completedTasks: 0
  });

  // EXECUTION PHASE - Based on path
  let executionName, executionDesc;
  
  if (path === 'internship') {
    executionName = '💼 Internship Execution Phase';
    executionDesc = 'Execute internship, gain experience, network, and transition to placement.';
  } else if (path === 'placement') {
    executionName = '💼 Placement Execution Phase';
    executionDesc = 'Execute job applications, interview successfully, and secure offer.';
  } else {
    executionName = '🎓 Higher Studies Preparation Phase';
    executionDesc = 'Build strong application portfolio, achieve competitive scores, and secure admission.';
  }

  phases.push({
    id: 'execution',
    name: executionName,
    duration: '8-12 weeks',
    description: executionDesc,
    icon: '💼',
    tasks: [
      {
        id: 'execution-main',
        title: path === 'placement' 
          ? 'Apply & Interview for ${career} Roles'
          : path === 'internship'
          ? 'Secure Internship & Excel'
          : 'Apply to Masters Programs',
        description: path === 'placement'
          ? 'Apply to 20-30 relevant companies, practice interviews, negotiate offers.'
          : path === 'internship'
          ? 'Apply to internships, attend interviews, excel in role, build network.'
          : 'Prepare GRE/GMAT, apply to programs, secure admission.',
        priority: 'High',
        reason: 'This is the execution phase. All preparation leads to this.',
        impact: 'Direct path to goal: ${path}.',
        metric: 'readiness',
        estimatedDays: path === 'placement' ? 90 : path === 'internship' ? 60 : 120,
        resources: path === 'placement' 
          ? ['LinkedIn, Company careers pages', 'Interview prep']
          : path === 'internship'
          ? ['Internship platforms', 'Company websites']
          : ['GRE books', 'University websites'],
        xpReward: path === 'placement' ? 2000 : 1500,
        status: 'pending'
      }
    ],
    completedTasks: 0
  });

  return phases;
}

/**
 * Calculate health status based on readiness and completion metrics
 */
function calculateHealth(readinessScore, confidence) {
  let status = 'on-track';
  let reason = 'All metrics are healthy. Keep pushing!';

  if (readinessScore < 40 && confidence < 50) {
    status = 'off-track';
    reason = 'Readiness is low. Start with foundation phase immediately.';
  } else if (readinessScore < 60 || confidence < 70) {
    status = 'needs-attention';
    reason = 'Some gaps detected. Focus on high-priority tasks.';
  }

  return {
    status,
    completionRate: 0,
    reason
  };
}

/**
 * Generate impact preview showing expected outcomes
 */
function generateImpactPreview(skillGapCount, resumeScore, readinessScore) {
  const currentResume = resumeScore || 50;
  const currentReadiness = readinessScore || 40;
  
  // Estimate improvements based on skill gaps and missing pieces
  const resumeImprovement = Math.min(20, skillGapCount * 5 + 5);
  const readinessImprovement = Math.min(25, 15 + (skillGapCount * 3));

  return {
    resumeScoreImprovement: resumeImprovement,
    estimatedResumeScore: Math.min(100, currentResume + resumeImprovement),
    readinessImprovement: readinessImprovement,
    estimatedReadinessScore: Math.min(100, currentReadiness + readinessImprovement),
    interviewReadiness: 'High',
    jobReadiness: 'High',
    timelineMonths: Math.ceil((skillGapCount * 3 + 12) / 4)
  };
}

module.exports = {
  generateRoadmap,
  generateSkillGapTasks,
  getSkillLearningTasks,
  organizeIntoPhases,
  calculateHealth,
  generateImpactPreview
};
