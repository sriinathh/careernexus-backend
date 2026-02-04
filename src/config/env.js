import dotenv from 'dotenv';
dotenv.config();

export const {
  PORT = 5000,
  MONGO_URI,
  JWT_SECRET,
  CLIENT_URL,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  LLM_PROVIDER,
  OPENAI_API_KEY,
  GEMINI_API_KEY,
  MISTRAL_API_KEY
} = process.env;

if (!MONGO_URI) console.warn('MONGO_URI is not set');
if (!JWT_SECRET) console.warn('JWT_SECRET is not set');
