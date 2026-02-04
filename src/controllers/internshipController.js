import { Internship } from '../models/DomainModels.js';

// GET /api/internships
export const listInternships = async (req, res, next) => {
  try {
    const { q, mode } = req.query;
    const filter = { approved: true };
    if (mode) filter.mode = mode;
    if (q) {
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { company: new RegExp(q, 'i') },
        { skills: new RegExp(q, 'i') },
      ];
    }
    const internships = await Internship.find(filter).sort({ createdAt: -1 }).limit(50);
    // TODO: attach matchScore from AI if needed
    res.json(internships);
  } catch (err) {
    next(err);
  }
};

// GET /api/internships/:id
export const getInternship = async (req, res, next) => {
  try {
    const doc = await Internship.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Internship not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/internships/:id/apply
export const applyInternship = async (req, res, next) => {
  try {
    const { note } = req.body;
    const internship = await Internship.findById(req.params.id);
    if (!internship) return res.status(404).json({ message: 'Internship not found' });

    internship.applications.push({
      student: req.user._id,
      resumeUrl: '', // TODO: link to latest resume path
      status: 'applied',
      note,
    });

    await internship.save();
    res.json({ message: 'Application submitted' });
  } catch (err) {
    next(err);
  }
};