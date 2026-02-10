# PRODUCTION DEPLOYMENT CHECKLIST

## ⚠️ CRITICAL: OAuth Configuration Requirements

**OAuth will NOT work in production unless you properly configure these environment variables!**

### Required Environment Variables for Production

#### 1. BACKEND_API_URL (REQUIRED)
```env
# Set this to your actual production backend URL
BACKEND_API_URL=https://your-backend.railway.app
```

**Why it's required:**
- OAuth callback URLs are constructed using this value
- Without it, callbacks will default to localhost (which fails in production)
- The system will throw an error in production if this is not set

#### 2. OAuth Callback URLs (Highly Recommended)
While these can fall back to `BACKEND_API_URL`, it's better to set them explicitly:

```env
# Google OAuth
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/auth/google/callback

# Microsoft OAuth
MICROSOFT_CALLBACK_URL=https://your-backend.railway.app/auth/microsoft/callback

# Apple OAuth
APPLE_CALLBACK_URL=https://your-backend.railway.app/auth/apple/callback
```

### Deployment Platforms

#### Railway
1. Go to your project → Variables
2. Add each environment variable
3. Ensure `NODE_ENV=production`
4. **MUST set `BACKEND_API_URL`** to your Railway URL (e.g., `https://rest-shop-production.up.railway.app`)

#### Render
1. Go to Environment section
2. Add each environment variable
3. Ensure `NODE_ENV=production`
4. **MUST set `BACKEND_API_URL`** to your Render URL (e.g., `https://rest-shop.onrender.com`)

#### Other Platforms (Heroku, Fly.io, etc.)
Follow similar steps to set environment variables in your platform's dashboard.

---

## Complete Production Environment Variables

```env
# CRITICAL - MUST BE SET
NODE_ENV=production
BACKEND_API_URL=https://your-backend.railway.app
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_KEY=your_long_random_production_jwt_key

# CORS Configuration
ALLOWED_ORIGINS=https://your-backend.railway.app,https://your-frontend.pages.dev
FRONTEND_URL=https://your-frontend.pages.dev

# OAuth Credentials (if using OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/auth/google/callback

MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_CALLBACK_URL=https://your-backend.railway.app/auth/microsoft/callback

APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=https://your-backend.railway.app/auth/apple/callback

# Optional but Recommended
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## OAuth Provider Console Configuration

After setting environment variables, update your OAuth provider consoles:

### Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   https://your-backend.railway.app/auth/google/callback
   ```
4. Save changes

### Microsoft Azure Portal
1. Go to https://portal.azure.com
2. Navigate to App registrations → Your App
3. Under "Authentication", add redirect URI:
   ```
   https://your-backend.railway.app/auth/microsoft/callback
   ```
4. Save configuration

### Apple Developer Console
1. Go to https://developer.apple.com/account/resources/identifiers
2. Select your Service ID
3. Under "Return URLs", add:
   ```
   https://your-backend.railway.app/auth/apple/callback
   ```
4. Save configuration

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] `NODE_ENV` set to `production`
- [ ] `BACKEND_API_URL` set to actual production backend URL (NOT localhost)
- [ ] `MONGODB_URI` set to production database
- [ ] `JWT_KEY` set to strong random key (different from development)
- [ ] `ALLOWED_ORIGINS` includes production frontend URL
- [ ] OAuth callback URLs set in environment variables
- [ ] OAuth callback URLs updated in provider consoles
- [ ] All OAuth callback URLs use HTTPS (not HTTP)
- [ ] Tested OAuth flow in production environment

---

## Verification Steps

After deployment:

1. **Check Environment Variables:**
   ```bash
   # SSH into your server or check platform dashboard
   echo $BACKEND_API_URL
   # Should output: https://your-backend.railway.app (NOT localhost)
   ```

2. **Test Health Endpoint:**
   ```bash
   curl https://your-backend.railway.app/health
   # Should return: {"status":"ok","database":"connected"}
   ```

3. **Test OAuth Redirect:**
   - Visit your frontend
   - Click "Continue with Google"
   - Verify redirect goes to Google (not localhost)
   - After authentication, verify redirect back to your backend callback URL
   - Verify successful login

4. **Check Application Logs:**
   - No errors about localhost
   - No CORS errors
   - OAuth callbacks successful

---

## Common Mistakes to Avoid

❌ **DON'T:** Leave `BACKEND_API_URL` unset or set to localhost in production  
✅ **DO:** Set it to your actual production backend URL

❌ **DON'T:** Use HTTP in production OAuth callbacks  
✅ **DO:** Use HTTPS for all production OAuth callbacks

❌ **DON'T:** Forget to update OAuth provider consoles  
✅ **DO:** Update redirect URIs in all OAuth provider consoles

❌ **DON'T:** Use development JWT keys in production  
✅ **DO:** Generate new, strong JWT keys for production

❌ **DON'T:** Copy `.env` file directly to production  
✅ **DO:** Set each environment variable individually in your platform's dashboard

---

## Error Messages and Solutions

### "CRITICAL: BACKEND_API_URL must be set in production"
**Cause:** `BACKEND_API_URL` is not set and `NODE_ENV=production`  
**Solution:** Set `BACKEND_API_URL` to your production backend URL

### "redirect_uri_mismatch" from OAuth provider
**Cause:** Callback URL doesn't match what's configured in OAuth console  
**Solution:** Ensure callback URL in code matches OAuth provider console exactly

### "Failed to fetch products" in production
**Cause:** CORS not allowing your frontend origin  
**Solution:** Add frontend URL to `ALLOWED_ORIGINS`

### OAuth redirects to localhost in production
**Cause:** `BACKEND_API_URL` not set or set to localhost  
**Solution:** Set `BACKEND_API_URL` to production URL

---

## Support

If you continue to have issues:
1. Check your platform's logs for error messages
2. Verify all environment variables are set correctly
3. Test OAuth flow with browser developer tools open
4. Check Network tab for failed requests
5. Review this checklist again

For local development, see `QUICK_START.md`
