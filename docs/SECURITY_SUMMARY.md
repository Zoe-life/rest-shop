# Security Summary

## Single-Use OAuth Exchange Code Pattern
Date: 2026-03-03
Status:  **IMPLEMENTED**

### Overview
The OAuth callback previously redirected users to `FRONTEND_URL/auth/success?token=<JWT>`,
placing the real JWT in the browser history, server access logs, and `Referer` headers.
This has been replaced with a **single-use exchange code pattern** that keeps the JWT
entirely out of URLs.

### How It Works
1. After OAuth authentication succeeds, the backend generates a random 16-character hex code.
2. The code is stored in an in-memory `Map` with a 30-second TTL (`api/utils/authCodeStore.js`).
3. The user is redirected to `FRONTEND_URL/auth/success?code=<exchange-code>`.
4. The frontend immediately POSTs the code to `POST /auth/exchange`.
5. The backend validates the code, **deletes it atomically** (single-use), and returns the JWT in the JSON response body.

### Security Properties
- **JWT never appears in a URL** — eliminates browser history, server log, and Referer leakage.
- **Single-use** — `consumeCode()` deletes the Map entry atomically on first read.
- **Short-lived** — 30-second TTL enforced by `setTimeout`; codes expire automatically.
- **64-bit random space** — `crypto.randomBytes(8)` makes brute-force infeasible within the TTL window.

### Files Changed
- `api/utils/authCodeStore.js` — new in-memory code store
- `api/routes/auth.js` — OAuth callbacks now issue codes; new `POST /auth/exchange` endpoint
- `frontend/src/pages/AuthSuccess.tsx` — reads `?code=`, POSTs to `/auth/exchange`

See [OAuth Exchange Code Guide](./OAUTH_EXCHANGE_CODE.md) for full details.

---

## CodeQL Security Analysis
Date: 2026-02-10
Status:  **PASSED**

### Scan Results
- **Language:** JavaScript
- **Alerts Found:** 0
- **Status:** No security vulnerabilities detected

## Changes Made

### 1. OAuth Callback URL Configuration (`api/config/passport.js`)
**Security Impact:**  Positive
- Changed from relative to absolute callback URLs
- Added `buildCallbackUrl()` helper function with proper fallback logic
- Prevents potential OAuth redirect manipulation
- All callback URLs now explicitly validated through environment variables

**Security Features:**
- Explicit callback URL configuration required in production
- Falls back to `BACKEND_API_URL` if specific callback URL not set
- Default localhost for development only

### 2. CORS Configuration (`api/app.js`)
**Security Impact:**  Neutral (maintains existing security)
- Added `process.env.ALLOWED_ORIGINS` support for Node.js deployments
- Maintains strict origin checking
- Does not weaken existing CORS security

**Security Features:**
- Origin must be explicitly in allowlist
- Rejects 'null' and undefined origins
- Supports credentials only for allowed origins
- No wildcard origins allowed

### 3. Documentation Updates
**Security Impact:**  Positive
- Clear instructions for OAuth callback URL configuration
- Production deployment security best practices
- Environment variable security reminders

## Vulnerabilities Fixed
None - no vulnerabilities were present in the original code or introduced by changes.

## Security Best Practices Followed

1. **Environment Variables:**
   - Sensitive configuration via environment variables
   - No secrets in code
   - `.env` files in `.gitignore`

2. **OAuth Security:**
   - Single-use exchange codes prevent JWT leakage via URLs
   - HMAC-signed state parameter for stateless CSRF protection (RFC 6749 §10.12)
   - Absolute callback URLs prevent redirect attacks
   - Environment-based configuration
   - Proper fallback chain (specific → general → default)

3. **CORS Security:**
   - Explicit origin allowlist
   - No wildcard origins
   - Proper null/undefined handling

4. **Code Quality:**
   - Helper function reduces duplication
   - Clear documentation
   - Comprehensive test coverage

## Recommendations for Deployment

1. **Always set these in production:**
   ```env
   BACKEND_API_URL=https://your-production-backend.com
   GOOGLE_CALLBACK_URL=https://your-production-backend.com/auth/google/callback
   ALLOWED_ORIGINS=https://your-production-backend.com,https://your-frontend.com
   ```

2. **OAuth Provider Configuration:**
   - Ensure callback URLs in provider consoles exactly match environment variables
   - Use HTTPS in production
   - Review authorized domains regularly

3. **Regular Security Updates:**
   - Keep dependencies updated
   - Monitor for security advisories
   - Run `npm audit` regularly

## Testing Summary

-  All 83 automated tests passing
-  CodeQL security scan: 0 vulnerabilities
-  Code review completed
-  No breaking changes introduced

## Conclusion

All changes have been implemented with security in mind. No new vulnerabilities were introduced, and the changes improve the overall security posture by:
1. Eliminating JWT leakage through OAuth redirect URLs (exchange code pattern)
2. Making OAuth CSRF protection stateless via HMAC-signed state (no cookie dependency)
3. Making OAuth callbacks more explicit and secure
4. Improving configuration clarity
5. Maintaining strict CORS policies
6. Providing clear security documentation
