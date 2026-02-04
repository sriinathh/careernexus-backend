// backend/scripts/testMongoConn.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;
console.log('Using MONGO_URI:', uri ? uri.replace(/:(.+)@/, ':*****@') : '<<missing>>');

async function run() {
  if (!uri) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.name === 'MongoNetworkError' || /whitelist|IP|auth/i.test(err.message)) {
      console.error('Hint: If using MongoDB Atlas, add your IP to Network Access (whitelist) or allow 0.0.0.0/0 for testing.');
    }
    process.exit(1);
  }
}

run();
