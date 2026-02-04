import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learnbridge';

async function verifyAccounts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check admin
    const admin = await User.findOne({ email: 'admin@learnbridge.com' });
    console.log('👤 Admin Account:');
    if (admin) {
      console.log('   ✅ Exists');
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   isVerified:', admin.isVerified);
      console.log('   Password hash exists:', !!admin.password);
    } else {
      console.log('   ❌ Does not exist');
    }

    // Check faculty
    const faculty = await User.findOne({ email: 'faculty@learnbridge.com' });
    console.log('\n👤 Faculty Account:');
    if (faculty) {
      console.log('   ✅ Exists');
      console.log('   Email:', faculty.email);
      console.log('   Role:', faculty.role);
      console.log('   isVerified:', faculty.isVerified);
      console.log('   Password hash exists:', !!faculty.password);
    } else {
      console.log('   ❌ Does not exist');
    }

    await mongoose.connection.close();
    console.log('\n✅ Verification complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verifyAccounts();
