// resumeRoutes.js - Resume Analysis using Mistral AI
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { Mistral } from '@mistralai/mistralai';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Initialize Mistral client
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
});

/**
 * POST /api/resume/analyze
 * Analyzes uploaded resume PDF using Mistral AI
 */
router.post('/analyze', upload.single('resume'), async (req, res) => {
  let filePath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No resume file uploaded'
      });
    }

    filePath = req.file.path;

    // Extract text from PDF
    console.log('📄 Extracting text from PDF...');
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from PDF. Please ensure it is a text-based PDF.'
      });
    }

    console.log('🤖 Analyzing resume with Mistral AI...');

    // Analyze resume using Mistral AI
    const analysisPrompt = `You are an expert ATS (Applicant Tracking System) resume analyzer and career counselor.

Analyze the following resume and provide a comprehensive analysis in JSON format.

RESUME TEXT:
${resumeText}

IMPORTANT: You must respond with ONLY valid JSON. No markdown, no explanations, just pure JSON.

Provide the analysis in this exact JSON structure:
{
  "overall_score": <number 0-100>,
  "ats_status": "<Poor|Average|ATS-Optimized>",
  "ats_message": "<brief message about ATS compatibility>",
  "breakdown": {
    "skill_relevance": {
      "score": <number 0-100>,
      "weight": 40,
      "contribution": <calculated value>
    },
    "keywords_ats": {
      "score": <number 0-100>,
      "weight": 30,
      "contribution": <calculated value>
    },
    "projects_experience": {
      "score": <number 0-100>,
      "weight": 20,
      "contribution": <calculated value>
    },
    "structure": {
      "score": <number 0-100>,
      "weight": 10,
      "contribution": <calculated value>
    }
  },
  "skills": ["skill1", "skill2", ...],
  "skills_count": <number>,
  "keywords": ["keyword1", "keyword2", ...],
  "keywords_count": <number>,
  "education": ["degree/institution 1", ...],
  "projects": ["project description 1", ...],
  "experience": ["job/role 1", ...],
  "primary_career": {
    "role": "<career role name>",
    "match_percentage": <number 0-100>,
    "confidence": "<High|Medium|Low>",
    "confidence_message": "<brief message>"
  },
  "alternate_roles": ["role1", "role2", "role3"],
  "skill_gap": {
    "target_role": "<same as primary career role>",
    "matched_skills": ["skill1", ...],
    "matched_count": <number>,
    "missing_critical": ["missing skill 1", ...],
    "missing_nice_to_have": ["nice skill 1", ...],
    "missing_count": <number>,
    "gap_percentage": <number 0-100>,
    "skill_match_percentage": <number 0-100>,
    "strength_areas": ["strength 1", ...]
  },
  "improvement_suggestions": ["tip 1", "tip 2", "tip 3"]
}

SCORING GUIDELINES:
- Overall score = weighted average of breakdown scores
- ATS Status: <40 = Poor, 40-70 = Average, >70 = ATS-Optimized
- Extract 10-20 skills from resume
- Extract 8-15 action keywords (developed, implemented, achieved, etc.)
- Identify 1-3 education entries
- Identify 1-3 projects
- Identify 1-3 work experiences
- Match to best career role from: Data Analyst, ML Engineer, Full Stack Developer, Data Scientist, Frontend Developer, Backend Developer, Business Analyst, DevOps Engineer, Mobile Developer, Project Manager
- List 3-5 missing critical skills for that role
- Provide 3-5 actionable improvement tips

Respond with ONLY the JSON object, no other text.`;

    const chatResponse = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      maxTokens: 3000
    });

    const responseText = chatResponse.choices[0].message.content;
    
    // Parse JSON response
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      analysisResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse Mistral response:', responseText);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    // Generate unique analysis ID
    const analysisId = `A${Date.now().toString(36).toUpperCase()}`;

    // Add metadata
    const completeAnalysis = {
      success: true,
      analysis_id: analysisId,
      ...analysisResult,
      stats: {
        word_count: resumeText.split(/\s+/).length,
        skills_count: analysisResult.skills?.length || 0,
        keywords_count: analysisResult.keywords?.length || 0,
        has_contact_info: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(resumeText)
      },
      timestamp: new Date().toISOString()
    };

    // Store analysis for report generation (in-memory for now)
    global.resumeAnalysisCache = global.resumeAnalysisCache || {};
    global.resumeAnalysisCache[analysisId] = completeAnalysis;

    console.log(`✅ Analysis complete! ID: ${analysisId}`);
    console.log(`📊 Score: ${completeAnalysis.overall_score}/100 - ${completeAnalysis.ats_status}`);

    res.json(completeAnalysis);

  } catch (error) {
    console.error('❌ Resume analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze resume'
    });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Failed to delete temp file:', cleanupError);
      }
    }
  }
});

/**
 * GET /api/resume/report/:analysisId
 * Retrieves analysis data for report generation
 */
router.get('/report/:analysisId', (req, res) => {
  try {
    const { analysisId } = req.params;
    
    // Get from cache
    const analysis = global.resumeAnalysisCache?.[analysisId];
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found. Please analyze resume first.'
      });
    }

    // Return as JSON (frontend can display or convert to PDF)
    res.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * GET /api/resume/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Resume Analyzer',
    provider: 'Mistral AI',
    status: 'operational'
  });
});

export default router;
