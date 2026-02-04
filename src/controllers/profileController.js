import { User } from '../models/User.js';

/**
 * GET /api/profile
 * Fetch complete profile data for logged-in user
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate profile completion percentage
    const profileCompletion = calculateProfileCompletion(user);

    res.json({
      profile: user.profile || {},
      education: user.profile?.education || {},
      skills: user.profile?.skills || [],
      certifications: user.profile?.certifications || [],
      internships: user.profile?.internships || [],
      socials: user.profile?.socials || {},
      gamification: user.gamification || {},
      profileCompletion,
      success: true
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

/**
 * PUT /api/profile
 * Update basic profile information
 */
export const updateProfile = async (req, res) => {
  try {
    const { careerGoal, year, branch } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize profile if not exists
    if (!user.profile) {
      user.profile = {};
    }
    if (!user.profile.education) {
      user.profile.education = {};
    }
    if (!user.profile.socials) {
      user.profile.socials = {};
    }

    // Update profile fields
    if (careerGoal !== undefined) user.profile.careerGoal = careerGoal;
    if (year !== undefined) user.profile.year = year;
    if (branch !== undefined) user.profile.branch = branch;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      profile: user.profile,
      success: true
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

/**
 * PUT /api/profile/education
 * Update education details
 */
export const updateEducation = async (req, res) => {
  try {
    const { university, degree, startYear, endYear, cgpa } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize profile and education if not exist
    if (!user.profile) {
      user.profile = {};
    }
    if (!user.profile.education) {
      user.profile.education = {};
    }
    if (!user.profile.socials) {
      user.profile.socials = {};
    }

    user.profile.education = {
      university: university || user.profile.education?.university,
      degree: degree || user.profile.education?.degree,
      startYear: startYear || user.profile.education?.startYear,
      endYear: endYear || user.profile.education?.endYear,
      cgpa: cgpa || user.profile.education?.cgpa
    };

    await user.save();

    res.json({
      message: 'Education updated successfully',
      education: user.profile.education,
      success: true
    });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({ message: 'Failed to update education', error: error.message });
  }
};

/**
 * PUT /api/profile/skills
 * Update skills
 */
export const updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert skills to strings, handle both string and object formats
    const formattedSkills = skills.map(skill => {
      if (typeof skill === 'string') {
        return skill;
      }
      // If it's an object, extract the name
      return skill.name || String(skill);
    }).filter(s => s && s.trim());

    user.profile.skills = formattedSkills;
    await user.save();

    res.json({
      message: 'Skills updated successfully',
      skills: user.profile.skills,
      success: true
    });
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({ message: 'Failed to update skills', error: error.message });
  }
};

/**
 * PUT /api/profile/certifications
 * Add or update certifications
 */
export const updateCertifications = async (req, res) => {
  try {
    const { certifications } = req.body;
    
    if (!Array.isArray(certifications)) {
      return res.status(400).json({ message: 'Certifications must be an array' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate certification structure
    const validCerts = certifications.filter(cert => cert.name && cert.organization);
    
    user.profile.certifications = validCerts;
    await user.save();

    res.json({
      message: 'Certifications updated successfully',
      certifications: user.profile.certifications,
      success: true
    });
  } catch (error) {
    console.error('Update certifications error:', error);
    res.status(500).json({ message: 'Failed to update certifications', error: error.message });
  }
};

/**
 * PUT /api/profile/internships
 * Add or update internships
 */
export const updateInternships = async (req, res) => {
  try {
    const { internships } = req.body;
    
    if (!Array.isArray(internships)) {
      return res.status(400).json({ message: 'Internships must be an array' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate internship structure
    const validInternships = internships.filter(int => int.company && int.role);
    
    user.profile.internships = validInternships;
    await user.save();

    res.json({
      message: 'Internships updated successfully',
      internships: user.profile.internships,
      success: true
    });
  } catch (error) {
    console.error('Update internships error:', error);
    res.status(500).json({ message: 'Failed to update internships', error: error.message });
  }
};

/**
 * PUT /api/profile/socials
 * Update social and portfolio links
 */
export const updateSocials = async (req, res) => {
  try {
    const { github, linkedin, portfolio, resume } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize profile and socials if not exist
    if (!user.profile) {
      user.profile = {};
    }
    if (!user.profile.education) {
      user.profile.education = {};
    }
    if (!user.profile.socials) {
      user.profile.socials = {};
    }

    // Validate URLs
    if (github && !isValidUrl(github)) {
      return res.status(400).json({ message: 'Invalid GitHub URL' });
    }
    if (linkedin && !isValidUrl(linkedin)) {
      return res.status(400).json({ message: 'Invalid LinkedIn URL' });
    }
    if (portfolio && !isValidUrl(portfolio)) {
      return res.status(400).json({ message: 'Invalid portfolio URL' });
    }
    if (resume && !isValidUrl(resume)) {
      return res.status(400).json({ message: 'Invalid resume URL' });
    }

    user.profile.socials = {
      github: github || user.profile.socials?.github,
      linkedin: linkedin || user.profile.socials?.linkedin,
      portfolio: portfolio || user.profile.socials?.portfolio,
      resume: resume || user.profile.socials?.resume
    };

    await user.save();

    res.json({
      message: 'Social links updated successfully',
      socials: user.profile.socials,
      success: true
    });
  } catch (error) {
    console.error('Update socials error:', error);
    res.status(500).json({ message: 'Failed to update socials', error: error.message });
  }
};

/**
 * GET /api/profile/analytics
 * Fetch career analytics and readiness scores
 */
export const getAnalytics = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate analytics
    const careerReadiness = calculateCareerReadiness(user);
    const skillStrength = calculateSkillStrength(user);
    const interestAlignment = calculateInterestAlignment(user);

    const analytics = {
      careerReadiness,
      skillStrength,
      interestAlignment,
      resumeScore: user.profile.resumeScore || 0
    };

    // Update analytics in database
    user.analytics = analytics;
    await user.save();

    res.json({
      ...analytics,
      success: true
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Calculate profile completion percentage
 */
const calculateProfileCompletion = (user) => {
  let completionScore = 0;
  const sections = 10;
  
  // Basic profile (20%)
  if (user.profile?.year) completionScore += 2;
  if (user.profile?.branch) completionScore += 2;
  if (user.profile?.careerGoal) completionScore += 2;
  
  // Education (15%)
  if (user.profile?.education?.university) completionScore += 3;
  if (user.profile?.education?.degree) completionScore += 3;
  if (user.profile?.education?.cgpa) completionScore += 3;
  
  // Skills (15%)
  if (user.profile?.skills?.length > 0) completionScore += 5;
  if (user.profile?.interests?.length > 0) completionScore += 5;
  
  // Certifications (10%)
  if (user.profile?.certifications?.length > 0) completionScore += 10;
  
  // Internships (10%)
  if (user.profile?.internships?.length > 0) completionScore += 10;
  
  // Social links (10%)
  if (user.profile?.socials?.github) completionScore += 2.5;
  if (user.profile?.socials?.linkedin) completionScore += 2.5;
  if (user.profile?.socials?.portfolio) completionScore += 2.5;
  if (user.profile?.socials?.resume) completionScore += 2.5;
  
  // Photo (5%)
  if (user.profile?.photoUrl) completionScore += 5;
  
  return Math.min(Math.round(completionScore), 100);
};

/**
 * Calculate career readiness score
 * Formula: (Education × 0.3) + (Experience × 0.3) + (Skills × 0.2) + (Academics × 0.2)
 */
const calculateCareerReadiness = (user) => {
  const educationScore = user.profile?.education ? 25 : 0;
  const experienceScore = (user.profile?.internships?.length || 0) * 15;
  const skillsScore = Math.min((user.profile?.skills?.length || 0) * 10, 25);
  const academicsScore = (user.profile?.education?.cgpa ? 20 : 0);
  
  const total = (educationScore * 0.3) + (experienceScore * 0.3) + (skillsScore * 0.2) + (academicsScore * 0.2);
  
  return Math.min(Math.round(total), 100);
};

/**
 * Calculate skill strength score
 */
const calculateSkillStrength = (user) => {
  const totalSkills = user.profile?.skills?.length || 0;
  const avgSkillLevel = user.profile?.skills?.reduce((sum, skill) => {
    return sum + (skill.level || 50);
  }, 0) / Math.max(totalSkills, 1);
  
  return Math.round(Math.min(avgSkillLevel, 100));
};

/**
 * Calculate interest alignment
 */
const calculateInterestAlignment = (user) => {
  const hasInterests = (user.profile?.interests?.length || 0) > 0;
  const hasCertifications = (user.profile?.certifications?.length || 0) > 0;
  const hasInternships = (user.profile?.internships?.length || 0) > 0;
  
  let score = 0;
  if (hasInterests) score += 40;
  if (hasCertifications) score += 30;
  if (hasInternships) score += 30;
  
  return score;
};

/**
 * Validate URL format
 */
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};
