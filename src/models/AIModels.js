import mongoose from 'mongoose';

const resumeDataSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    rawText: String,
    parsed: {
      technicalSkills: [String],
      softSkills: [String],
      tools: [String],
      experience: [String],
      projects: [String],
      education: [String],
      certifications: [String]
    },
    filePath: String,
    atsAnalysis: {
      atsScore: Number,
      strengths: [String],
      weaknesses: [String],
      missingKeywords: [String],
      suggestions: [String]
    }
  },
  { timestamps: true }
);

const skillProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    targetRole: { type: String, default: 'Full Stack Developer' },
    readinessScore: { type: Number, default: 0 },
    strongSkills: [String],
    missingSkills: [
      {
        name: String,
        importance: String,
        timeToLearn: String,
        reason: String,
        category: String,
        learningPlan: {
          description: String,
          steps: [String]
        }
      }
    ],
    aiInsight: String,
    // Legacy fields (optional mostly)
    roleTarget: String, // Keep for backward compat if needed, or map to targetRole
    currentSkills: [{ name: String, level: Number }],
    weakAreas: [{ name: String, level: Number }],
    weakAreas: [{ name: String, level: Number }],
    comparisonSummary: String,
    dependencyGraph: [
      {
        skill: String,
        prerequisites: [String],
        unlocks: [String],
        reason: String,
        topics: [String],
        resources: [{ name: String, url: String }]
      }
    ]
  },
  { timestamps: true }
);

const weeklyPlanSchema = new mongoose.Schema({
  week: Number,
  topics: [String],
  projects: [String],
  practice: [String],
  quizzes: [String]
});

const learningPathSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    learningPath: [weeklyPlanSchema],
    skillLevels: mongoose.Schema.Types.Mixed,
    recommendedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    lastRecalculatedAt: Date
  },
  { timestamps: true }
);

const quizHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    score: Number,
    difficulty: String,
    takenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const progressTrackingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    totalStudyMinutesLastWeek: { type: Number, default: 0 },
    lastActiveAt: Date,
    learningSpeedLabel: {
      type: String,
      enum: ['slow', 'average', 'fast'],
      default: 'average'
    }
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'] },
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const chatbotHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    messages: [messageSchema]
  },
  { timestamps: true }
);

const interviewPracticeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    company: String,
    targetRole: String,
    focusWeakAreas: Boolean,
    questions: [
      {
        question: String,
        type: String, // technical, behavioral
        whyAsked: String,
        whatItTests: String,
        sampleAnswer: String,
        userAnswer: String,
        aiFeedback: String,
        score: Number,
        improvementTips: String
      }
    ],
    completedAt: Date
  },
  { timestamps: true }
);

export const ResumeData = mongoose.model('ResumeData', resumeDataSchema);
export const SkillProfile = mongoose.model('SkillProfile', skillProfileSchema);
export const LearningPath = mongoose.model('LearningPath', learningPathSchema);
export const QuizHistory = mongoose.model('QuizHistory', quizHistorySchema);
export const ProgressTracking = mongoose.model('ProgressTracking', progressTrackingSchema);
export const ChatbotHistory = mongoose.model('ChatbotHistory', chatbotHistorySchema);
export const InterviewPractice = mongoose.model('InterviewPractice', interviewPracticeSchema);
