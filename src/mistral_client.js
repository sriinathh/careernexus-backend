/**
 * MISTRAL AI CLIENT
 * Wrapper around @mistralai/mistralai SDK
 * Handles API communication with Mistral Large model
 */

import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: MISTRAL_API_KEY environment variable not set. AI features will use fallbacks.');
}

// Initialize Mistral client with proper configuration
export const mistralClient = new Mistral({
  apiKey: apiKey || ''
});

/**
 * Chat completion wrapper
 * Handles common errors and provides fallback support
 */
export async function chatComplete({ model = 'mistral-large-latest', messages = [], temperature = 0.7, maxTokens = 1000 }) {
  try {
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    const response = await mistralClient.chat.complete({
      model,
      messages,
      temperature,
      maxTokens
    });

    return response;
  } catch (error) {
    console.error('Mistral API Error:', error.message);
    throw error;
  }
}

export default mistralClient;
