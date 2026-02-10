/**
 * @module config/passport
 * @description Passport OAuth 2.0 configuration for Google, Microsoft, and Apple
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple');
const User = require('../models/user');
const mongoose = require('mongoose');
const { logError, logInfo } = require('../utils/logger');
const { logOAuthLogin, logAuthFailure } = require('../utils/auditLogger');

/**
 * Build OAuth callback URL with fallbacks
 * @param {string} provider - OAuth provider name (google, microsoft, apple)
 * @param {string} [envVarValue] - Value from specific callback URL environment variable
 * @returns {string} Absolute callback URL
 * @throws {Error} In production if BACKEND_API_URL is not configured
 */
function buildCallbackUrl(provider, envVarValue) {
    if (envVarValue) {
        return envVarValue;
    }
    
    // In production, BACKEND_API_URL MUST be set
    if (!process.env.BACKEND_API_URL) {
        if (process.env.NODE_ENV === 'production') {
            const error = `CRITICAL: BACKEND_API_URL must be set in production for OAuth to work. Cannot use localhost callback URLs in production.`;
            logError(error);
            throw new Error(error);
        }
        // Development fallback only
        console.warn(`WARNING: BACKEND_API_URL not set. Using localhost fallback for ${provider} OAuth. This will NOT work in production!`);
        return `http://localhost:3001/auth/${provider}/callback`;
    }
    
    return `${process.env.BACKEND_API_URL}/auth/${provider}/callback`;
}

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
        callbackURL: buildCallbackUrl('google', process.env.GOOGLE_CALLBACK_URL),
        scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Validate that profile has required fields
            if (!profile || !profile.id) {
                logError('Google OAuth: Invalid profile data - missing profile ID');
                return done(new Error('Invalid profile data received from Google'), null);
            }

            // Safely extract email with null checks
            const email = profile.emails && profile.emails[0] && profile.emails[0].value;
            if (!email) {
                logError('Google OAuth: No email provided in profile', { profileId: profile.id });
                return done(new Error('Email not provided by Google'), null);
            }

            // Check if user already exists
            let user = await User.findOne({ 
                $or: [
                    { googleId: profile.id },
                    { email: email }
                ]
            });

            if (user) {
                // Update Google ID if not set
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
                
                // Log successful OAuth login
                logInfo('Google OAuth login successful', { userId: user._id, email: user.email });
                logOAuthLogin({
                    userId: user._id.toString(),
                    email: user.email,
                    outcome: 'success',
                    metadata: { provider: 'google', action: 'existing_user' }
                });
                
                return done(null, user);
            }

            // Create new user
            user = new User({
                _id: new mongoose.Types.ObjectId(),
                email: email,
                googleId: profile.id,
                displayName: profile.displayName || 'Google User',
                provider: 'google',
                emailVerified: profile.emails[0].verified || false,
                // No password for OAuth users
                password: null
            });

            await user.save();
            
            // Log successful OAuth signup
            logInfo('Google OAuth signup successful', { userId: user._id, email: user.email });
            logOAuthLogin({
                userId: user._id.toString(),
                email: user.email,
                outcome: 'success',
                metadata: { provider: 'google', action: 'new_user' }
            });
            
            done(null, user);
        } catch (error) {
            logError('Google OAuth error', error);
            logAuthFailure({
                outcome: 'failure',
                reason: 'OAuth error',
                metadata: { provider: 'google', error: error.message }
            });
            done(error, null);
        }
    }));
} else {
    console.warn('WARNING: Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.');
}

/**
 * Microsoft OAuth 2.0 Strategy
 * @see https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
 */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: buildCallbackUrl('microsoft', process.env.MICROSOFT_CALLBACK_URL),
        scope: ['user.read']
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Validate that profile has required fields
            if (!profile || !profile.id) {
                logError('Microsoft OAuth: Invalid profile data - missing profile ID');
                return done(new Error('Invalid profile data received from Microsoft'), null);
            }

            // Safely extract email with null checks
            const email = profile.emails && profile.emails[0] && profile.emails[0].value;
            if (!email) {
                logError('Microsoft OAuth: No email provided in profile', { profileId: profile.id });
                return done(new Error('Email not provided by Microsoft'), null);
            }

            // Check if user already exists
            let user = await User.findOne({ 
                $or: [
                    { microsoftId: profile.id },
                    { email: email }
                ]
            });

            if (user) {
                // Update Microsoft ID if not set
                if (!user.microsoftId) {
                    user.microsoftId = profile.id;
                    await user.save();
                }
                
                // Log successful OAuth login
                logInfo('Microsoft OAuth login successful', { userId: user._id, email: user.email });
                logOAuthLogin({
                    userId: user._id.toString(),
                    email: user.email,
                    outcome: 'success',
                    metadata: { provider: 'microsoft', action: 'existing_user' }
                });
                
                return done(null, user);
            }

            // Create new user
            user = new User({
                _id: new mongoose.Types.ObjectId(),
                email: email,
                microsoftId: profile.id,
                displayName: profile.displayName || 'Microsoft User',
                provider: 'microsoft',
                emailVerified: true,
                password: null
            });

            await user.save();
            
            // Log successful OAuth signup
            logInfo('Microsoft OAuth signup successful', { userId: user._id, email: user.email });
            logOAuthLogin({
                userId: user._id.toString(),
                email: user.email,
                outcome: 'success',
                metadata: { provider: 'microsoft', action: 'new_user' }
            });
            
            done(null, user);
        } catch (error) {
            logError('Microsoft OAuth error', error);
            logAuthFailure({
                outcome: 'failure',
                reason: 'OAuth error',
                metadata: { provider: 'microsoft', error: error.message }
            });
            done(error, null);
        }
    }));
} else {
    console.warn('WARNING: Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to enable.');
}

/**
 * Apple OAuth 2.0 Strategy
 * @see https://developer.apple.com/account/resources/identifiers/list/serviceId
 */
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
    passport.use(new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        callbackURL: buildCallbackUrl('apple', process.env.APPLE_CALLBACK_URL),
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY,
        scope: ['email', 'name']
    },
    async (accessToken, refreshToken, idToken, profile, done) => {
        try {
            // Validate that profile has required fields
            if (!profile || !profile.id) {
                logError('Apple OAuth: Invalid profile data - missing profile ID');
                return done(new Error('Invalid profile data received from Apple'), null);
            }

            // Safely extract email with null checks
            const email = profile.email;
            if (!email) {
                logError('Apple OAuth: No email provided in profile', { profileId: profile.id });
                return done(new Error('Email not provided by Apple'), null);
            }

            // Check if user already exists
            let user = await User.findOne({ 
                $or: [
                    { appleId: profile.id },
                    { email: email }
                ]
            });

            if (user) {
                // Update Apple ID if not set
                if (!user.appleId) {
                    user.appleId = profile.id;
                    await user.save();
                }
                
                // Log successful OAuth login
                logInfo('Apple OAuth login successful', { userId: user._id, email: user.email });
                logOAuthLogin({
                    userId: user._id.toString(),
                    email: user.email,
                    outcome: 'success',
                    metadata: { provider: 'apple', action: 'existing_user' }
                });
                
                return done(null, user);
            }

            // Create new user with safe name handling
            const nameParts = [
                profile.name?.firstName,
                profile.name?.lastName
            ].filter(Boolean);
            const displayName = nameParts.length > 0 ? nameParts.join(' ') : 'Apple User';

            user = new User({
                _id: new mongoose.Types.ObjectId(),
                email: email,
                appleId: profile.id,
                displayName: displayName,
                provider: 'apple',
                emailVerified: true,
                password: null
            });

            await user.save();
            
            // Log successful OAuth signup
            logInfo('Apple OAuth signup successful', { userId: user._id, email: user.email });
            logOAuthLogin({
                userId: user._id.toString(),
                email: user.email,
                outcome: 'success',
                metadata: { provider: 'apple', action: 'new_user' }
            });
            
            done(null, user);
        } catch (error) {
            logError('Apple OAuth error', error);
            logAuthFailure({
                outcome: 'failure',
                reason: 'OAuth error',
                metadata: { provider: 'apple', error: error.message }
            });
            done(error, null);
        }
    }));
} else {
    console.warn('WARNING: Apple OAuth not configured. Set APPLE_CLIENT_ID, APPLE_TEAM_ID, and APPLE_KEY_ID to enable.');
}

module.exports = passport;
