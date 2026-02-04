import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔑 Google profile received:', profile.displayName, profile.emails?.[0]?.value);

        const email = profile.emails?.[0]?.value;
        if (!email) {
          console.error('❌ No email in Google profile');
          return done(new Error('No email provided by Google'), null);
        }

        let user = await User.findOne({ email });

        if (!user) {
          console.log('🆕 Creating new user from Google account');
          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            isVerified: true,
            role: "student",
          });
          console.log('✅ New user created:', user.email);
        } else {
          console.log('✅ Existing user found:', user.email);
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isVerified = true;
            await user.save();
            console.log('🔄 Updated user with Google ID');
          }
        }

        done(null, user);
      } catch (err) {
        console.error('❌ Google OAuth strategy error:', err.message);
        done(err, null);
      }
    }
  )
);

// required by passport
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

export default passport;
