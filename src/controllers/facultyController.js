import { Course } from '../models/DomainModels.js';
import { QuizHistory, ProgressTracking } from '../models/AIModels.js';
import { User } from '../models/User.js';

// GET /api/faculty/overview
export const getFacultyOverview = async (req, res, next) => {
  try {
    const courses = await Course.find({ createdBy: req.user._id })
      .populate('createdBy', 'name')
      .lean();

    const totalStudents = await User.countDocuments({ role: 'student' });
    
    // Get student progress across all courses
    const studentProgress = await ProgressTracking.find({})
      .populate('user', 'name')
      .limit(10);

    // Get quiz performance insights
    const recentQuizzes = await QuizHistory.find({})
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate average scores by course
    const courseStats = await QuizHistory.aggregate([
      {
        $group: {
          _id: '$course',
          avgScore: { $avg: '$score' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      courses: courses.map(c => ({
        ...c,
        students: totalStudents, // Approximate
      })),
      totalStudents,
      studentProgress: studentProgress.slice(0, 5),
      insights: generateInsights(recentQuizzes, courseStats),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/faculty/courses/:id/students
export const getCourseStudents = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course || course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get all students (in real app, track enrollments)
    const students = await User.find({ role: 'student' })
      .select('name email profile gamification')
      .limit(50);

    // Get quiz performance for each student
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        const quizzes = await QuizHistory.find({
          user: student._id,
          course: course._id,
        });
        const avgScore = quizzes.length > 0
          ? quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length
          : 0;

        return {
          ...student.toObject(),
          quizCount: quizzes.length,
          avgScore,
        };
      })
    );

    res.json(studentsWithProgress);
  } catch (err) {
    next(err);
  }
};

// POST /api/faculty/announcements
export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, courseId } = req.body;
    // Store in a separate Announcement model or add to Course
    res.json({ message: 'Announcement created', title, content });
  } catch (err) {
    next(err);
  }
};

function generateInsights(quizzes, courseStats) {
  const insights = [];
  
  if (quizzes.length > 0) {
    const avgScore = quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length;
    if (avgScore < 60) {
      insights.push(`Students are struggling with recent quizzes (avg score: ${avgScore.toFixed(0)}%)`);
    }
  }

  courseStats.forEach(stat => {
    if (stat.avgScore < 60) {
      insights.push(`Low performance detected in a course (avg: ${stat.avgScore.toFixed(0)}%)`);
    }
  });

  return insights.length > 0 ? insights : ['All students performing well!'];
}

