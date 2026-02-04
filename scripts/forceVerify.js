import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learnbridge';

async function forceVerifyAccounts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Force update admin
    const adminResult = await User.updateOne(
      { email: 'admin@learnbridge.com' },
      { 
        $set: { 
          isVerified: true,
          otp: undefined,
          otpExpiresAt: undefined
        } 
      }
    );
    console.log('👤 Admin Account Updated:', adminResult.modifiedCount > 0 ? '✅' : '⚠️ Already verified');

    // Force update faculty
    const facultyResult = await User.updateOne(
      { email: 'faculty@learnbridge.com' },
      { 
        $set: { 
          isVerified: true,
          otp: undefined,
          otpExpiresAt: undefined
        } 
      }
    );
    console.log('👤 Faculty Account Updated:', facultyResult.modifiedCount > 0 ? '✅' : '⚠️ Already verified');

    // Verify the changes
    const admin = await User.findOne({ email: 'admin@learnbridge.com' });
    const faculty = await User.findOne({ email: 'faculty@learnbridge.com' });

    console.log('\n📋 Final Status:');
    console.log('─────────────────────────────────────');
    console.log('Admin:');
    console.log('  Email:', admin.email);
    console.log('  Role:', admin.role);
    console.log('  isVerified:', admin.isVerified);
    console.log('  Has password:', !!admin.password);
    console.log('\nFaculty:');
    console.log('  Email:', faculty.email);
    console.log('  Role:', faculty.role);
    console.log('  isVerified:', faculty.isVerified);
    console.log('  Has password:', !!faculty.password);
    console.log('─────────────────────────────────────');

    await mongoose.connection.close();
    console.log('\n✅ Force verification complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

forceVerifyAccounts();
