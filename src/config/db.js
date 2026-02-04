import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

export const connectDB = async () => {
  if (!MONGO_URI) {
    console.error('MONGO_URI is not set. Set it in .env');
    process.exit(1);
  }

  try {
    // Use a short server selection timeout to fail fast during development
    const opts = { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 };
    await mongoose.connect(MONGO_URI, opts);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (err.name === 'MongoNetworkError' || /whitelist|IP|auth/i.test(err.message)) {
      console.error('Hint: If you are using MongoDB Atlas, ensure your current IP is whitelisted: https://www.mongodb.com/docs/atlas/security-whitelist/');
    }
    process.exit(1);
  }
};
