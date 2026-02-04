import dotenv from 'dotenv';
dotenv.config();

console.log('Environment variables:');
console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
console.log('MISTRAL_API_KEY:', process.env.MISTRAL_API_KEY ? '***' + process.env.MISTRAL_API_KEY.slice(-4) : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : 'NOT SET');

// Test Mistral API call
const testMistral = async () => {
  try {
    console.log('\nTesting Mistral API...');
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello, world!" in JSON format with key "message".' }
        ]
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('Error:', errText);
      return;
    }

    const data = await response.json();
    console.log('Success! Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testMistral();
