import mongoose from 'mongoose';

// Career Guidance Result - stores AI-generated career recommendation
const careerGuidanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    recommendedCareer: String,
    careerDescription: String,
    whyThisCareer: String,
    confidenceScore: { type: Number, min: 0, max: 100 },
    prioritySkills: [String],
    shortTermSteps: [String],
    inputData: {
      skills: [String],
      interests: [String],
      education: String,
      experience: String
    }
  },
  { timestamps: true }
);

// Resume Analysis Result
const resumeAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    careerGuidance: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerGuidance' },
    resumeText: String,
    strengths: [String],
    weaknesses: [String],
    missingSkills: [String],
    improvementSuggestions: [String],
    matchScore: { type: Number, min: 0, max: 100 }
  },
  { timestamps: true }
);

// Interview Preparation
const interviewPrepSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    careerGuidance: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerGuidance' },
    questions: [
      {
        question: String,
        sampleAnswer: String,
        tips: [String]
      }
    ],
    practiceTips: [String]
  },
  { timestamps: true }
);

// Learning Roadmap
const learningRoadmapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    careerGuidance: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerGuidance' },
    shortTerm: {
      duration: String,
      topics: [String],
      resources: [String]
    },
    mediumTerm: {
      duration: String,
      topics: [String],
      resources: [String]
    },
    estimatedCompletionTime: String,
    detailedPath: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

// Career Report (aggregates all data for PDF)
const careerReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    careerGuidance: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerGuidance' },
    resumeAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeAnalysis' },
    interviewPrep: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewPrep' },
    learningRoadmap: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningRoadmap' },
    generatedAt: Date,
    reportUrl: String
  },
  { timestamps: true }
);

export const CareerGuidance = mongoose.model('CareerGuidance', careerGuidanceSchema);
export const ResumeAnalysis = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
export const InterviewPrep = mongoose.model('InterviewPrep', interviewPrepSchema);
export const LearningRoadmap = mongoose.model('LearningRoadmap', learningRoadmapSchema);
export const CareerReport = mongoose.model('CareerReport', careerReportSchema);
