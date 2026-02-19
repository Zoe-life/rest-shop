# Fix Summary: Product Fetching and OAuth Callback URL Issues

## Problems Identified

### 1. "Failed to fetch products" Error
**Symptom:** The frontend displays "failed to fetch products" when trying to load the products page.

**Root Cause:** 
- CORS configuration was not properly checking `process.env.ALLOWED_ORIGINS` for Node.js deployments
- The CORS middleware only checked `req.workerEnv.ALLOWED_ORIGINS` (Cloudflare Workers environment)
- Default fallback only included `http://localhost:3001`, missing the frontend origin `http://localhost:3000`

### 2. OAuth Redirect to localhost instead of configured callback URL
**Symptom:** When signing in with OAuth, the site redirects to `http://localhost:3001/auth/google` instead of using the callback URL configured in GitHub secrets.

**Root Cause:**
- OAuth callback URLs in `passport.js` used relative paths (e.g., `/auth/google/callback`)
- Passport converts relative paths to absolute URLs based on the current request
- This caused issues in production where the request might come from a different domain
- No fallback to `BACKEND_API_URL` environment variable

## Solutions Implemented

### 1. Fixed CORS Configuration (`api/app.js`)

**Change:**
```javascript
// Before
const allowedOrigins = req.workerEnv?.ALLOWED_ORIGINS 
    ? req.workerEnv.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3001'];

// After
const allowedOrigins = req.workerEnv?.ALLOWED_ORIGINS 
    ? req.workerEnv.ALLOWED_ORIGINS.split(',') 
    : (process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',') 
        : ['http://localhost:3001', 'http://localhost:3000']);
```

**Impact:**
- Now checks `process.env.ALLOWED_ORIGINS` for direct Node.js deployments (Render, local dev)
- Fallback includes both backend and frontend origins
- Maintains compatibility with Cloudflare Workers architecture

### 2. Fixed OAuth Callback URLs (`api/config/passport.js`)

**Changes for all OAuth providers (Google, Microsoft, Apple):**

```javascript
// Before
callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'

// After
callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_API_URL || 'http://localhost:3001'}/auth/google/callback`
```

**Impact:**
- Uses explicit `GOOGLE_CALLBACK_URL` if set (highest priority)
- Falls back to `BACKEND_API_URL` + path if callback URL not set
- Uses `http://localhost:3001` for local development
- Ensures absolute URLs are always used, preventing OAuth redirect issues

### 3. Updated Documentation

**README.md:**
- Corrected frontend environment variable from `REACT_APP_API_URL` to `VITE_BACKEND_URL`
- Added `BACKEND_API_URL` configuration instructions
- Added OAuth callback URL configuration details
- Included production deployment notes

**New Files:**
- `QUICK_START.md` - Step-by-step setup guide
- `docs/FIX_SUMMARY.md` - This document

## Configuration Requirements

### For Local Development

**`api/.env`:**
```env
MONGODB_URI=mongodb+srv://...
JWT_KEY=your_secret_key
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
FRONTEND_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3001
```

**`frontend/.env`:**
```env
VITE_BACKEND_URL=http://localhost:3001
```

### For Production Deployment

**Backend Environment Variables (Render):**
```env
MONGODB_URI=mongodb+srv://...
JWT_KEY=your_secret_key
BACKEND_API_URL=https://your-backend.onrender.com
ALLOWED_ORIGINS=https://your-backend.onrender.com,https://your-frontend.pages.dev
FRONTEND_URL=https://your-frontend.pages.dev

# OAuth Configuration
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/auth/google/callback
```

**Frontend Environment Variables (Cloudflare Pages):**
```env
VITE_BACKEND_URL=https://your-backend.onrender.com
```

**OAuth Provider Console Configuration:**
- Google Console: Add `https://your-backend.onrender.com/auth/google/callback` to authorized redirect URIs
- Microsoft Portal: Add `https://your-backend.onrender.com/auth/microsoft/callback` as redirect URI
- Apple Developer: Add `https://your-backend.onrender.com/auth/apple/callback` as return URL

## Testing

### Automated Tests
All existing tests pass:
```bash
cd api
npm test
# Result: 70 passing (278ms), 23 pending
```

### Manual Testing Checklist

1. **Product Fetching:**
   - [ ] Start backend: `cd api && npm start`
   - [ ] Start frontend: `cd frontend && npm run dev`
   - [ ] Visit http://localhost:3000
   - [ ] Verify products page loads without errors
   - [ ] Check browser console for CORS errors (should be none)

2. **OAuth Flow:**
   - [ ] Configure OAuth credentials in `api/.env`
   - [ ] Click "Continue with Google" on login page
   - [ ] Verify redirect to Google OAuth page
   - [ ] After authentication, verify redirect back to `http://localhost:3001/auth/google/callback`
   - [ ] Verify successful redirect to frontend at `http://localhost:3000/auth/success`

## Related Files Changed

- `api/config/passport.js` - OAuth callback URL configuration
- `api/app.js` - CORS configuration
- `README.md` - Documentation updates
- `QUICK_START.md` - New quick start guide
- `docs/FIX_SUMMARY.md` - This summary

## Migration Notes

If you're migrating from an older version:

1. Update your `.env` files to include:
   - `BACKEND_API_URL` (required for OAuth)
   - `ALLOWED_ORIGINS` (required for CORS)

2. Update OAuth provider consoles:
   - Ensure callback URLs are absolute (not relative)
   - Match the format: `{BACKEND_API_URL}/auth/{provider}/callback`

3. Frontend environment:
   - Rename `REACT_APP_API_URL` to `VITE_BACKEND_URL` (if migrating from Create React App)

## Backward Compatibility

These changes are **backward compatible**:
- Existing relative callback URLs still work via `BACKEND_API_URL` fallback
- CORS still works with Cloudflare Workers via `req.workerEnv`
- Local development defaults remain unchanged

## Security Considerations

1. **CORS Origins:** Only explicitly allowed origins can access the API
2. **OAuth Callbacks:** Must match provider console configuration
3. **Environment Variables:** Never commit `.env` files to git
4. **JWT Secrets:** Use long, random keys in production
