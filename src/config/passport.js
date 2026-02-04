import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google OAuth callback received for:', profile.emails[0].value);
        
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // User exists, check if they have googleId
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          console.log('✅ Existing user logged in:', user.email);
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          role: 'student', // Default role for Google sign-ups
          isVerified: true, // Google accounts are pre-verified
          profile: {
            photoUrl: profile.photos[0]?.value || '',
          },
        });

        console.log('✅ New user created via Google:', user.email);
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
