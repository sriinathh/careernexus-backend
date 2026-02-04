import { LLM_PROVIDER, OPENAI_API_KEY, MISTRAL_API_KEY } from '../../config/env.js';
import OpenAI from 'openai';

let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

const callOpenAI = async ({ systemPrompt, userPrompt, model }) => {
  if (!openai) throw new Error('OpenAI API key not configured');
  const res = await openai.chat.completions.create({
    model: model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
  return res.choices[0].message.content;
};

const ensureFetch = () => {
  if (typeof fetch === 'function') return fetch;
  throw new Error('Global fetch is not available. Use Node.js 18+ or add a fetch polyfill.');
};

const callMistral = async ({ systemPrompt, userPrompt, model }) => {
  if (!MISTRAL_API_KEY) throw new Error('Mistral API key not configured');
  const fetchFn = ensureFetch();

  const response = await fetchFn('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: model || 'mistral-small-latest',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mistral API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Mistral API returned no content');
  return content;
};

export const llmComplete = async ({ systemPrompt, userPrompt, model }) => {
  const provider = (LLM_PROVIDER || 'openai').toLowerCase();
  console.log('LLM Provider:', provider);

  if (provider === 'openai') {
    return callOpenAI({ systemPrompt, userPrompt, model });
  }

  if (provider === 'mistral') {
    console.log('Calling Mistral API...');
    return callMistral({ systemPrompt, userPrompt, model });
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
};
