# Token Persistence and URL Leak Prevention

This document explains how rest-shop manages authentication tokens: where they are stored, how they survive page reloads, and how the implementation ensures that a JWT never appears in a URL.

---

## Token Types

The application uses two distinct kinds of token, each with a different purpose and lifetime:

| Token | Lifetime | Purpose |
|---|---|---|
| **JWT (JSON Web Token)** | 1 hour | Authenticates every API request; carries `userId`, `email`, and `role` |
| **OAuth exchange code** | 30 seconds | Short-lived, single-use code issued after OAuth to let the frontend safely retrieve the JWT |

---

## Token Persistence

### Primary storage: `localStorage`

After a successful login — whether via email/password or OAuth — the JWT is written to `localStorage` and attached to every outgoing Axios request as a `Bearer` header.

```typescript
// frontend/src/contexts/AuthContext.tsx

// Initialise from localStorage so the user stays logged in across page reloads
const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

// Called after login or OAuth exchange
const loginWithToken = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
};

// Called on logout
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
};
```

Because `localStorage` is scoped to the origin and persists across browser tabs and page reloads, users do not have to log in again when they navigate to a new page or refresh.

### Secondary storage: `httpOnly` cookie

The logout endpoint clears an `authToken` cookie that the backend may set during the OAuth flow. The cookie is configured with `httpOnly: true`, which prevents JavaScript from reading it and protects it against XSS attacks.

```javascript
// api/routes/auth.js

router.get('/logout', (req, res) => {
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: isProduction,      // HTTPS only in production
        sameSite: isProduction ? 'none' : 'lax',
    });
    res.status(200).json({ message: 'Logged out successfully' });
});
```

### Token expiry

JWTs are signed with a 1-hour expiry (`expiresIn: "1h"`). After expiry the middleware rejects the token with `401 Unauthorized` and the user is redirected to the login page.

---

## Preventing Token Leakage via the URL

Placing a JWT in a URL is dangerous because:

| Exposure vector | Risk |
|---|---|
| **Browser history** | The URL (and the JWT it contains) is saved locally and visible to anyone with access to the device |
| **Server / proxy access logs** | Every hop between the browser and the origin records the full URL |
| **`Referer` header** | Any third-party resource (analytics, fonts, images) loaded by the page receives the full URL in the `Referer` request header |

rest-shop eliminates all three risks through the mechanisms described below.

### 1. Single-use OAuth exchange code

The JWT is **never placed in a redirect URL**. After OAuth authentication succeeds, the backend issues a short-lived, opaque exchange code instead and sends only that code in the redirect.

```
Backend redirect → FRONTEND_URL/auth/success?code=a1b2c3d4e5f6a7b8
                                                    ↑ 30-second code, not a JWT
```

The frontend then POSTs the code to `/auth/exchange` and receives the real JWT in the JSON response body — a channel that is not logged by servers or stored in browser history.

```
POST /auth/exchange   { "code": "a1b2c3d4e5f6a7b8" }
← 200 OK             { "token": "<JWT>", "expiresAt": "..." }
```

Full end-to-end flow:

```
User      Browser         Backend          OAuth Provider
 │           │               │                    │
 │──click────▶               │                    │
 │           │──GET /auth/google──────────────────▶
 │           │               │──redirect to Google▶
 │           │◀───────────────────────────────────│ (user logs in)
 │           │──GET /auth/google/callback?code=...▶
 │           │               │  verify HMAC state │
 │           │               │  createCode(userId)│
 │           │◀──redirect /auth/success?code=XXXX─│
 │           │──POST /auth/exchange { code }──────▶
 │           │               │  consumeCode()     │
 │           │               │  (deleted on read) │
 │           │               │  findById(userId)  │
 │           │               │  generateToken()   │
 │           │◀──{ token, expiresAt }─────────────│
 │  logged in│               │                    │
```

The exchange code is managed by `api/utils/authCodeStore.js`:

```javascript
// api/utils/authCodeStore.js

function createCode(userId) {
    const code = crypto.randomBytes(8).toString('hex'); // 64-bit random, 16 hex chars
    const timer = setTimeout(() => store.delete(code), 30 * 1000); // auto-expire at 30 s
    if (timer.unref) timer.unref();
    store.set(code, { userId: userId.toString(), timer });
    return code;
}

function consumeCode(code) {
    const entry = store.get(code);
    if (!entry) return null;
    clearTimeout(entry.timer);
    store.delete(code); // atomically deleted — the code can never be used again
    return entry.userId;
}
```

Security properties of the exchange code:

| Property | Detail |
|---|---|
| **Opaque** | A random hex string — carries no user information on its own |
| **Single-use** | `consumeCode()` deletes the Map entry before returning; replay is impossible |
| **Short-lived** | 30-second TTL enforced by `setTimeout`; expired codes return `null` |
| **Large random space** | `crypto.randomBytes(8)` → 2⁶⁴ possible values; brute-force is infeasible in 30 s |

### 2. Immediate URL cleanup

Even though the exchange code is not a JWT, the frontend removes it from the URL as soon as it has been read — before any network request is made — so it does not linger in browser history.

```typescript
// frontend/src/pages/AuthSuccess.tsx

const params = new URLSearchParams(window.location.search);
const code = params.get('code');

// Remove the code from the URL before doing anything else
window.history.replaceState({}, document.title, window.location.pathname);

// Now exchange the code for the JWT
const response = await api.post('/auth/exchange', { code });
```

### 3. `Authorization` header instead of query parameters

All authenticated API requests send the JWT in the `Authorization` header, never in the URL.

```typescript
// frontend/src/api/axios.ts

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Set once after login; Axios attaches it to every subsequent request
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

The backend middleware accepts only the header form:

```javascript
// api/middleware/check-auth.js

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No auth token provided' });
    }
    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    // validate and decode …
};
```

### 4. CSRF protection via HMAC-signed state

To prevent cross-site request forgery on the OAuth initiation step, the backend generates a stateless HMAC-signed state parameter (RFC 6749 §10.12). This works across origins (e.g. through the Cloudflare Worker proxy) without relying on a cookie.

```javascript
// api/utils/oauthState.js

function generateOAuthState() {
    const nonce = crypto.randomBytes(16).toString('hex');
    const sig = crypto
        .createHmac('sha256', getSecret()) // derived from JWT_KEY
        .update(nonce)
        .digest('hex');
    return `${nonce}.${sig}`;
}

function verifyOAuthState(state) {
    // Re-derive the HMAC from the nonce and compare with timing-safe equality
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
```

---

## Threat Model Summary

| Threat | Mitigation |
|---|---|
| JWT in browser history | JWT never appears in a URL — only a 30-second opaque exchange code does |
| JWT in server / proxy logs | Same: logs contain only the exchange code |
| JWT in `Referer` header | Same: the `Referer` header carries only the exchange code |
| Exchange code reuse | `consumeCode()` atomically deletes the entry on first read |
| Exchange code brute-force | 64-bit random space with 30-second window makes brute-force infeasible |
| CSRF on OAuth initiation | HMAC-signed state parameter verified server-side before any code is issued |
| XSS token theft via cookie | `httpOnly` cookie flag prevents JavaScript from reading the cookie |
| Token surviving logout | `localStorage` entries and the `authToken` cookie are both cleared on logout |
| Long-lived token exposure | 1-hour JWT expiry limits the damage window if a token is somehow obtained |

---

## Related Documentation

- [OAuth Exchange Code Pattern](./OAUTH_EXCHANGE_CODE.md) — in-depth implementation details and API reference
- [Security Summary](./SECURITY_SUMMARY.md) — overall security posture and CodeQL results
- [OAuth Setup Guide](./OAUTH_SETUP.md) — configuring Google and Microsoft OAuth providers
