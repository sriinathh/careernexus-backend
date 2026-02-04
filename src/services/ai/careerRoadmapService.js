import { llmComplete } from './llmClient.js';
import { Roadmap } from '../../models/DomainModels.js';
import { ResumeData, SkillProfile } from '../../models/AIModels.js';

const ROADMAP_SYSTEM_PROMPT = `You are an expert technical career coach.
Your goal is to generate a HIGHLY SPECIFIC, ROLE-TAILORED career roadmap for the user's target role.

RULES:
1. NO GENERIC PHASES. Every phase title and skill must be directly relevant to the specific Target Role.
2. If Target Role is "DevOps Engineer", you MUST include Linux, Docker, Kubernetes, CI/CD, Terraform. DO NOT include detailed frontend frameworks (React/Vue) unless explicitly relevant.
3. If Target Role is "Data Engineer", you MUST include SQL, Python/Scala, ETL, Spark, Data Warehousing. DO NOT include web design/CSS.
4. If Target Role is "Full Stack Developer", include both Frontend and Backend.
5. Base the roadmap on the User's Missing Skills to bridge the gap.

Return STRICT JSON with:
{
  "targetRole": "string (Matches the requested role exactly)",
  "currentLevel": "beginner|intermediate|advanced",
  "timeline": "3 months|6 months|12 months",
  "milestones": [
    {
      "month": number,
      "title": "string (Role specific phase name)",
      "skills": ["string"],
      "projects": ["string"],
      "resources": ["string"],
      "checkpoints": ["string"]
    }
  ],
  "skillGaps": ["string"],
  "recommendedCourses": ["string"],
  "internshipRecommendations": ["string"],
  "jobReadinessScore": number,
  "nextSteps": ["string"]
}`;

export const generateCareerRoadmap = async (userId, targetRole) => {
  try {
    // Get user's resume and skill profile
    const [resume, skillProfile] = await Promise.all([
      ResumeData.findOne({ user: userId }),
      SkillProfile.findOne({ user: userId }),
    ]);

    const roleToGen = targetRole || 'Full Stack Developer';

    const userContext = {
      resume: resume?.parsed || {},
      skills: skillProfile?.currentSkills || [],
      missingSkills: skillProfile?.missingSkills || [],
      targetRole: roleToGen,
    };

    const userPrompt = `User context:\n${JSON.stringify(userContext, null, 2)}\n\nGenerate a detailed career roadmap for becoming a ${roleToGen}. Focus strictly on this role.`;

    const completion = await llmComplete({
      systemPrompt: ROADMAP_SYSTEM_PROMPT,
      userPrompt,
    });

    let roadmapData;
    try {
      roadmapData = JSON.parse(completion);
    } catch (err) {
      console.error("AI Roadmap Parsing Failed, using fallback for:", roleToGen);
      roadmapData = getRoleSpecificFallback(roleToGen);
    }

    // Save roadmap - scoped to the specific target role to avoid collisions
    const roadmap = await Roadmap.findOneAndUpdate(
      { user: userId, targetRole: roleToGen },
      {
        targetRole: roleToGen,
        roadmapJson: roadmapData,
      },
      { upsert: true, new: true }
    );

    return roadmap;
  } catch (err) {
    throw new Error(`Failed to generate career roadmap: ${err.message}`);
  }
};

function getRoleSpecificFallback(targetRole) {
  const roleLower = targetRole.toLowerCase();

  // DEVOPS FALLBACK
  if (roleLower.includes('devops') || roleLower.includes('cloud') || roleLower.includes('sre')) {
    return {
      targetRole: targetRole,
      currentLevel: 'beginner',
      timeline: '6 months',
      milestones: [
        {
          month: 1,
          title: 'Linux & Networking Basics',
          skills: ['Linux CLI', 'Bash Scripting', 'OSI Model', 'DNS/HTTP'],
          projects: ['Automated Backup Script', 'Local Web Server Setup'],
          resources: ['Linux Journey', 'OverTheWire'],
          checkpoints: ['Master Grep/Sed/Awk', 'Configure SSH Keys'],
        },
        {
          month: 2,
          title: 'Containerization & CI/CD',
          skills: ['Docker', 'Jenkins/GitHub Actions', 'YAML'],
          projects: ['Dockerize a Node App', 'Build CI Pipeline'],
          resources: ['Docker Documentation', 'GitHub Actions Guide'],
          checkpoints: ['Write multi-stage Dockerfile', 'Auto-deploy on commit'],
        },
        {
          month: 3,
          title: 'Orchestration & IaC',
          skills: ['Kubernetes', 'Terraform', 'AWS/Azure Basics'],
          projects: ['K8s Cluster Deployment', 'Terraform VPC'],
          resources: ['Kubernetes.io', 'HashiCorp Learn'],
          checkpoints: ['Deploy Helm Chart', 'Provision Cloud Infra'],
        }
      ],
      skillGaps: ['Kubernetes', 'Terraform', 'Monitoring'],
      jobReadinessScore: 40,
      nextSteps: ['Get AWS Certified', 'Learn Prometheus'],
    };
  }

  // DATA ENGINEER FALLBACK
  if (roleLower.includes('data') || roleLower.includes('etl') || roleLower.includes('analytics')) {
    return {
      targetRole: targetRole,
      currentLevel: 'beginner',
      timeline: '6 months',
      milestones: [
        {
          month: 1,
          title: 'Python & SQL Mastery',
          skills: ['Advanced SQL', 'Python for Data', 'Pandas'],
          projects: ['Sales Data Analysis', 'SQL Query Optimizer'],
          resources: ['LeetCode SQL', 'Kaggle'],
          checkpoints: ['Solve Hard SQL problems', 'Clean messy dataset'],
        },
        {
          month: 2,
          title: 'ETL & Data Modeling',
          skills: ['Airflow', 'Dimensional Modeling', 'PostgreSQL'],
          projects: ['Build ETL Pipeline', 'Star Schema Design'],
          resources: ['Data Engineering Zoomcamp'],
          checkpoints: ['Automate daily ingest', 'Design DB Schema'],
        },
        {
          month: 3,
          title: 'Big Data Frameworks',
          skills: ['Spark', 'Hadoop', 'Data Lakes'],
          projects: ['Spark Batch Processing', 'Parquet Optimization'],
          resources: ['Spark Documentation'],
          checkpoints: ['Process 1GB+ dataset', 'Optimize partition strategy'],
        }
      ],
      skillGaps: ['Spark', 'Airflow', 'System Design'],
      jobReadinessScore: 45,
      nextSteps: ['Build Portfolio', 'Learn Kafka'],
    };
  }

  // DEFAULT FULL STACK (Existing fallback logic)
  return {
    targetRole: targetRole,
    currentLevel: 'beginner',
    timeline: '6 months',
    milestones: [
      {
        month: 1,
        title: 'Foundation Building',
        skills: ['HTML/CSS', 'JavaScript Basics', 'Git'],
        projects: ['Personal Portfolio', 'Todo App'],
        resources: ['MDN Web Docs', 'FreeCodeCamp'],
        checkpoints: ['Complete basic HTML/CSS course', 'Build first project'],
      },
      {
        month: 2,
        title: 'Frontend Development',
        skills: ['React', 'State Management', 'API Integration'],
        projects: ['Weather App', 'E-commerce Frontend'],
        resources: ['React Documentation', 'YouTube Tutorials'],
        checkpoints: ['Build React app', 'Deploy to Vercel'],
      },
    ],
    skillGaps: ['Backend Development', 'Database Design'],
    recommendedCourses: ['Full Stack Bootcamp', 'Node.js Mastery'],
    internshipRecommendations: ['Frontend Developer Intern', 'Web Development Intern'],
    jobReadinessScore: 45,
    nextSteps: ['Complete foundational courses', 'Build portfolio projects'],
  };
}

