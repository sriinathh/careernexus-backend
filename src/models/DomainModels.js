import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: String,
  type: { type: String, enum: ['video', 'pdf', 'practice'] },
  url: String,
  order: Number
});

const quizQuestionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctIndex: Number,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
});

const courseSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    tags: [String],
    lessons: [lessonSchema],
    quizQuestions: [quizQuestionSchema],
    approved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const xpLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    reason: String,
    meta: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

const forumPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    content: String,
    tags: [String],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    facultyVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const forumCommentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String
  },
  { timestamps: true }
);

const internshipSchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    description: String,
    skills: [String],
    stipend: String,
    location: String,
    mode: { type: String, enum: ['remote', 'onsite', 'hybrid'] },
    approved: { type: Boolean, default: false },
    applications: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        resumeUrl: String,
        status: { type: String, enum: ['applied', 'shortlisted', 'rejected'], default: 'applied' }
      }
    ]
  },
  { timestamps: true }
);

const roadmapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetRole: String,
    roadmapJson: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export const Course = mongoose.model('Course', courseSchema);
export const XPLog = mongoose.model('XPLog', xpLogSchema);
export const ForumPost = mongoose.model('ForumPost', forumPostSchema);
export const ForumComment = mongoose.model('ForumComment', forumCommentSchema);
export const Internship = mongoose.model('Internship', internshipSchema);
export const Roadmap = mongoose.model('Roadmap', roadmapSchema);
