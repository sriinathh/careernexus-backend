import { User } from '../models/User.js';
import { Course } from '../models/DomainModels.js';
import { Internship } from '../models/DomainModels.js';
import { ForumPost } from '../models/DomainModels.js';

// GET /api/admin/overview
export const getAdminOverview = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student' });
    const faculty = await User.countDocuments({ role: 'faculty' });
    const admins = await User.countDocuments({ role: 'admin' });

    const pendingMentors = await User.countDocuments({
      role: 'faculty',
      isVerified: false,
    });

    const pendingCourses = await Course.countDocuments({ approved: false });
    const pendingInternships = await Internship.countDocuments({ approved: false });

    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: {
        totalUsers,
        students,
        faculty,
        admins,
        pendingMentors,
        pendingCourses,
        pendingInternships,
      },
      recentUsers,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
export const listUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const { role, isVerified } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (role) user.role = role;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();
    const cleanUser = user.toObject();
    delete cleanUser.password;

    res.json(cleanUser);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/courses/pending
export const getPendingCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ approved: false })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/courses/:id/approve
export const approveCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    course.approved = true;
    await course.save();

    res.json(course);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/internships/pending
export const getPendingInternships = async (req, res, next) => {
  try {
    const internships = await Internship.find({ approved: false })
      .sort({ createdAt: -1 });

    res.json(internships);
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/internships/:id/approve
export const approveInternship = async (req, res, next) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship) return res.status(404).json({ message: 'Internship not found' });

    internship.approved = true;
    await internship.save();

    res.json(internship);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/forum/moderate
export const getForumModeration = async (req, res, next) => {
  try {
    const posts = await ForumPost.find({})
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(posts);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/forum/posts/:id
export const deleteForumPost = async (req, res, next) => {
  try {
    await ForumPost.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};

