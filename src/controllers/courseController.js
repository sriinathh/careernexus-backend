import { Course } from '../models/DomainModels.js';
import { QuizHistory, ProgressTracking } from '../models/AIModels.js';
import { User } from '../models/User.js';

// GET /api/courses
export const listCourses = async (req, res, next) => {
  try {
    const { level, tags, search } = req.query;
    const query = { approved: true };
    
    if (level) query.level = level;
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(courses);
  } catch (err) {
    next(err);
  }
};

// GET /api/courses/:id
export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    next(err);
  }
};

// POST /api/courses (Faculty only)
export const createCourse = async (req, res, next) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only faculty can create courses' });
    }

    const course = await Course.create({
      ...req.body,
      createdBy: req.user._id,
      approved: req.user.role === 'admin', // Auto-approve for admins
    });

    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
};

// PUT /api/courses/:id
export const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    if (course.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    Object.assign(course, req.body);
    await course.save();
    
    res.json(course);
  } catch (err) {
    next(err);
  }
};

// POST /api/courses/:id/enroll
export const enrollCourse = async (req, res, next) => {
  try {
    // Enrollment logic - can be stored in User model or separate Enrollment model
    res.json({ message: 'Enrolled successfully', courseId: req.params.id });
  } catch (err) {
    next(err);
  }
};

// POST /api/courses/:id/quiz/submit
export const submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body; // Array of { questionIndex, selectedIndex }
    const course = await Course.findById(req.params.id);
    
    if (!course) return res.status(404).json({ message: 'Course not found' });

    let correct = 0;
    const results = course.quizQuestions.map((q, idx) => {
      const answer = answers.find(a => a.questionIndex === idx);
      const isCorrect = answer && answer.selectedIndex === q.correctIndex;
      if (isCorrect) correct++;
      return { question: q.question, correct: isCorrect, selected: answer?.selectedIndex };
    });

    const score = Math.round((correct / course.quizQuestions.length) * 100);
    
    // Save quiz history
    await QuizHistory.create({
      user: req.user._id,
      course: course._id,
      score,
      difficulty: req.body.difficulty || 'medium',
    });

    // Award XP
    const xpEarned = Math.floor(score / 10) * 10; // 10 XP per 10% score
    const user = await User.findById(req.user._id);
    user.gamification.xp = (user.gamification.xp || 0) + xpEarned;
    user.gamification.level = Math.floor(user.gamification.xp / 1000) + 1;
    await user.save();

    res.json({ score, correct, total: course.quizQuestions.length, results, xpEarned });
  } catch (err) {
    next(err);
  }
};

