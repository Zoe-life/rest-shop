/**
 * @module config/passport
 * @description Passport OAuth 2.0 configuration for Google, Microsoft, and Apple
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple');
const User = require('../api/models/user');
const mongoose = require('mongoose');

/**
 * Serialize user for session
 */
passport.serializeUser((user, done) => {
    done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

/**
 * Google OAuth 2.0 Strategy
 * @see https://console.cloud.google.com/apis/credentials
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ 
                $or: [
                    { googleId: profile.id },
                    { email: profile.emails[0].value }
                ]
            });

            if (user) {
                // Update Google ID if not set
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
                return done(null, user);
            }

            // Create new user
            user = new User({
                _id: new mongoose.Types.ObjectId(),
                email: profile.emails[0].value,
                googleId: profile.id,
                displayName: profile.displayName,
                provider: 'google',
                emailVerified: profile.emails[0].verified,
                // No password for OAuth users
                password: null
            });

            await user.save();
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }));
}

/**
 * Microsoft OAuth 2.0 Strategy
 * @see https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
 */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || '/auth/microsoft/callback',
        scope: ['user.read']
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ 
                $or: [
                    { microsoftId: profile.id },
                    { email: profile.emails[0].value }
                ]
            });

            if (user) {
                // Update Microsoft ID if not set
                if (!user.microsoftId) {
                    user.microsoftId = profile.id;
                    await user.save();
                }
                return done(null, user);
            }

            // Create new user
            user = new User({
                _id: new mongoose.Types.ObjectId(),
                email: profile.emails[0].value,
                microsoftId: profile.id,
                displayName: profile.displayName,
                provider: 'microsoft',
                emailVerified: true,
                password: null
            });

            await user.save();
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }));
}

/**
 * Apple OAuth 2.0 Strategy
 * @see https://developer.apple.com/account/resources/identifiers/list/serviceId
 */
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
    passport.use(new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        callbackURL: process.env.APPLE_CALLBACK_URL || '/auth/apple/callback',
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY,
        scope: ['email', 'name']
    },
    async (accessToken, refreshToken, idToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ 
                $or: [
                    { appleId: profile.id },
                    { email: profile.email }
                ]
            });

            if (user) {
                // Update Apple ID if not set
                if (!user.appleId) {
                    user.appleId = profile.id;
                    await user.save();
                }
                return done(null, user);
            }

            // Create new user
            user = new User({
                _id: new mongoose.Types.ObjectId(),
                email: profile.email,
                appleId: profile.id,
                displayName: profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : 'Apple User',
                provider: 'apple',
                emailVerified: true,
                password: null
            });

            await user.save();
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }));
}

module.exports = passport;
