# OAuth Callback URL Fix - No Localhost in Production

## Problem
The OAuth callback URLs were using localhost fallback, which is inappropriate for production environments.

## Solution
Updated `/api/config/passport.js` to **completely eliminate** localhost fallback and require explicit configuration.

## Changes Made

### 1. Updated `buildCallbackUrl` Function
The function now:
- **Requires explicit configuration** - No localhost fallback at all
- **Validates production URLs** - Actively prevents localhost in production
- **Throws clear errors** - Immediately fails if misconfigured

### 2. Validation Rules

#### Production Environment (`NODE_ENV=production`)
- ❌ **BLOCKS** any URL containing 'localhost'
- ❌ **BLOCKS** missing `BACKEND_API_URL` 
- ✅ **REQUIRES** explicit production URL

#### Development Environment (`NODE_ENV=development`)
- ✅ **ALLOWS** localhost URLs
- ❌ **BLOCKS** missing `BACKEND_API_URL`

## Configuration Requirements

### Required Environment Variables

**For Production:**
```bash
NODE_ENV=production
BACKEND_API_URL=https://api.yourdomain.com
# OR set specific callback URLs:
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/auth/google/callback
MICROSOFT_CALLBACK_URL=https://api.yourdomain.com/auth/microsoft/callback
APPLE_CALLBACK_URL=https://api.yourdomain.com/auth/apple/callback
```

**For Development:**
```bash
NODE_ENV=development
BACKEND_API_URL=http://localhost:3001
# Specific callback URLs are optional in development
```

## Error Messages

The new implementation provides clear error messages:

### Error 1: Localhost in Explicit Callback URL (Production)
```
CRITICAL: GOOGLE_CALLBACK_URL contains 'localhost' which is invalid for production. Please set a production URL.
```

### Error 2: Missing BACKEND_API_URL
```
CRITICAL: BACKEND_API_URL must be set for google OAuth callback URL. Set either GOOGLE_CALLBACK_URL or BACKEND_API_URL environment variable.
```

### Error 3: Localhost in BACKEND_API_URL (Production)
```
CRITICAL: BACKEND_API_URL contains 'localhost' which is invalid for production. OAuth callback would be: http://localhost:3001/auth/google/callback
```

## Testing

Validation scenarios tested:

| Scenario | NODE_ENV | BACKEND_API_URL | Callback URL | Result |
|----------|----------|-----------------|--------------|--------|
| Prod, no URL | production | (not set) | (not set) | ❌ Error |
| Prod, localhost URL | production | `localhost:3001` | (not set) | ❌ Error |
| Prod, localhost callback | production | `api.example.com` | `localhost:3001/...` | ❌ Error |
| Prod, valid URL | production | `api.example.com` | (not set) | ✅ Works |
| Prod, valid callback | production | (not set) | `api.example.com/...` | ✅ Works |
| Dev, localhost | development | `localhost:3001` | (not set) | ✅ Works |

## Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Set `BACKEND_API_URL` to your production API URL (e.g., `https://api.yourdomain.com`)
- [ ] **OR** set specific callback URLs for each provider:
  - [ ] `GOOGLE_CALLBACK_URL`
  - [ ] `MICROSOFT_CALLBACK_URL`
  - [ ] `APPLE_CALLBACK_URL`
- [ ] Ensure no URLs contain 'localhost'
- [ ] Update OAuth provider settings (Google Console, Microsoft Portal, Apple Developer) to match callback URLs
- [ ] Test OAuth login flow after deployment

## Migration Guide

### From Previous Version

**Old behavior:**
- Used localhost fallback in development
- Only threw error in production if `BACKEND_API_URL` missing

**New behavior:**
- **Always** requires `BACKEND_API_URL` to be set
- **Actively validates** URLs don't contain localhost in production
- Throws errors immediately on startup if misconfigured

### Update Your Deployment

1. **Railway/Render Dashboard:**
   - Add `BACKEND_API_URL` environment variable
   - Set it to your deployed backend URL
   - Example: `https://rest-shop-api.railway.app`

2. **GitHub Actions Secrets:**
   - Ensure `BACKEND_API_URL` secret is set
   - Used during CI/CD for builds

3. **Local Development:**
   - Create `api/.env` from `api/.env.example`
   - Set `BACKEND_API_URL=http://localhost:3001`

## Benefits

✅ **Security**: Prevents localhost URLs in production
✅ **Fail-fast**: Errors on startup instead of runtime
✅ **Clear errors**: Developers know exactly what to fix
✅ **No surprises**: Explicit configuration required
✅ **Production-ready**: Forces proper deployment configuration

## Support

If you encounter issues:
1. Check `NODE_ENV` is set correctly
2. Verify `BACKEND_API_URL` doesn't contain 'localhost'
3. Ensure OAuth provider settings match your callback URLs
4. Check application logs for specific error messages
