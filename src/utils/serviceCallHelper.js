// ================================================
// SERVICE INTEGRATION HELPER
// ================================================
// File: backend/src/utils/serviceCallHelper.js
// Purpose: Centralized way to call Python microservices from Node.js backend

import fetch from 'node-fetch';
import { logger } from './logger.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
const CAREER_GUIDANCE_URL = process.env.CAREER_GUIDANCE_URL || 'http://localhost:5002';

/**
 * Call ai-service endpoints
 * @param {string} endpoint - Route (e.g., '/api/analyze-career')
 * @param {object} data - Request body
 * @param {string} method - HTTP method (GET, POST)
 */
export async function callAIService(endpoint, data = null, method = 'POST') {
  try {
    const url = `${AI_SERVICE_URL}${endpoint}`;
    logger.info(`Calling AI Service: ${method} ${url}`);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CareerNexusAI-Backend/1.0'
      },
      timeout: 30000 // 30 seconds
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`AI Service responded with ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info(`AI Service responded successfully`);
    return result;
  } catch (error) {
    logger.error(`AI Service error: ${error.message}`);
    throw new Error(`Failed to call AI Service: ${error.message}`);
  }
}

/**
 * Call career-guidance-service endpoints
 * @param {string} endpoint - Route (e.g., '/api/roadmap/Data%20Analyst')
 * @param {object} data - Request body
 * @param {string} method - HTTP method (GET, POST)
 */
export async function callCareerGuidanceService(endpoint, data = null, method = 'POST') {
  try {
    const url = `${CAREER_GUIDANCE_URL}${endpoint}`;
    logger.info(`Calling Career Guidance Service: ${method} ${url}`);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CareerNexusAI-Backend/1.0'
      },
      timeout: 60000 // 60 seconds (longer for PDF generation)
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Career Service responded with ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info(`Career Guidance Service responded successfully`);
    return result;
  } catch (error) {
    logger.error(`Career Guidance Service error: ${error.message}`);
    throw new Error(`Failed to call Career Guidance Service: ${error.message}`);
  }
}

/**
 * Health check all services
 */
export async function checkServicesHealth() {
  const health = {};

  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    health.ai_service = {
      status: aiResponse.ok ? 'healthy' : 'unhealthy',
      code: aiResponse.status
    };
  } catch (error) {
    health.ai_service = { status: 'unreachable', error: error.message };
  }

  try {
    const careerResponse = await fetch(`${CAREER_GUIDANCE_URL}/api/health`, { timeout: 5000 });
    health.career_guidance = {
      status: careerResponse.ok ? 'healthy' : 'unhealthy',
      code: careerResponse.status
    };
  } catch (error) {
    health.career_guidance = { status: 'unreachable', error: error.message };
  }

  return health;
}

export { AI_SERVICE_URL, CAREER_GUIDANCE_URL };
