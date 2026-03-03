# OAuth Single-Use Exchange Code Pattern

## Why the Old Flow Was Insecure

The previous OAuth callback placed the real JWT directly in the redirect URL:

```
FRONTEND_URL/auth/success?token=<JWT>
```

This leaks the credential in three ways:

| Exposure Vector | Risk |
|---|---|
| **Browser History** | The URL (with JWT) is saved and visible to anyone with access to the browser |
| **Server Access Logs** | The backend and any reverse proxies log the full URL |
| **`Referer` Header** | Any third-party resource loaded by the landing page receives the JWT in the `Referer` header |

A JWT is a long-lived credential (1-hour TTL). Leaking it through any of these vectors allows session hijacking.

---

## The New Flow: Single-Use Exchange Code

The real JWT is **never placed in a URL**. Instead, the backend issues a short-lived, random exchange code that the frontend immediately trades for the JWT via a secure POST request.

### Step-by-Step

```
1. User clicks "Sign in with Google / Microsoft"

2. Browser → GET /auth/google  (or /auth/microsoft)
   Backend generates HMAC-signed CSRF state, redirects to OAuth provider

3. OAuth Provider authenticates the user and redirects back:
   → GET /auth/google/callback?code=...&state=...

4. Backend verifies HMAC state (CSRF check), authenticates user, then:
   a. Generates a random 16-character hex exchange code
   b. Stores it in an in-memory Map mapped to the userId (TTL: 30 s)
   c. Redirects to: FRONTEND_URL/auth/success?code=<exchange-code>
      ↑ Only a short-lived, opaque code — not the JWT

5. Frontend (AuthSuccess page):
   a. Reads `code` from the URL query string
   b. Immediately clears the URL with window.history.replaceState()
   c. POSTs { code } to POST /auth/exchange

6. Backend (POST /auth/exchange):
   a. Looks up the code in the Map — returns null if missing or expired
   b. Deletes the entry atomically (single-use: can never be reused)
   c. Looks up the user in MongoDB
   d. Generates and returns the real JWT in the JSON response body

7. Frontend stores the JWT (localStorage / Authorization header)
   and navigates to /products
```

### Sequence Diagram

```
User      Browser         Backend          OAuth Provider
 │           │               │                    │
 │──click────               │                    │
 │           │──GET /auth/google──               │
 │           │               │──redirect to Google
 │           │               │                    │
 │           │────────────────────────────────────│ (user logs in)
 │           │──GET /auth/google/callback?code=...│
 │           │               │                    │
 │           │               │  verify HMAC state │
 │           │               │  createCode(userId)│
 │           │─redirect /auth/success?code=XXXX──│
 │           │               │                    │
 │           │──POST /auth/exchange { code }──────│
 │           │               │                    │
 │           │               │  consumeCode()     │
 │           │               │  (deleted on read) │
 │           │               │  findById(userId)  │
 │           │               │  generateToken()   │
 │           │─{ token, expiresAt }──────────────│
 │           │               │                    │
 │  logged in               │                    │
```

---

## Exchange Code Store (`api/utils/authCodeStore.js`)

The codes live in a **module-level in-memory `Map`** — no database round-trip required.

| Property | Value |
|---|---|
| Code format | 16-character hex string (`crypto.randomBytes(8)`) |
| TTL | 30 seconds (enforced by `setTimeout`) |
| Single-use | Entry deleted atomically on first `consumeCode()` call |
| Storage | `Map<code, { userId, timer }>` — process-local |
| Expiry mechanism | `setTimeout(() => store.delete(code), 30_000)` with `.unref()` |

**Why in-memory instead of a database?**

- Codes are valid for only 30 seconds — far too short-lived to warrant a DB round-trip on every OAuth login.
- O(1) insert and lookup with zero network latency.
- No schema, migrations, or collection management overhead.
- For multi-instance deployments, swap `createCode` / `consumeCode` for a Redis-backed implementation while keeping the same interface.

```javascript
// api/utils/authCodeStore.js

function createCode(userId) {
    const code = crypto.randomBytes(8).toString('hex');
    const timer = setTimeout(() => store.delete(code), 30 * 1000);
    if (timer.unref) timer.unref();
    store.set(code, { userId: userId.toString(), timer });
    return code;
}

function consumeCode(code) {
    const entry = store.get(code);
    if (!entry) return null;
    clearTimeout(entry.timer);
    store.delete(code);         // deleted — can never be used again
    return entry.userId;
}
```

---

## API Reference

### `POST /auth/exchange`

Exchanges a single-use code (received via OAuth redirect) for a real JWT.

**Request**
```http
POST /auth/exchange
Content-Type: application/json

{
  "code": "a1b2c3d4e5f6a7b8"
}
```

**Success Response** `200 OK`
```json
{
  "token": "<JWT>",
  "expiresAt": "2026-03-03T18:12:43.000Z"
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | `code` field missing or not a string |
| `401 Unauthorized` | Code not found, already used, or expired (> 30 s) |
| `401 Unauthorized` | Underlying user not found in the database |
| `500 Internal Server Error` | Unexpected server error |

---

## Frontend Integration

The `AuthSuccess` page (`frontend/src/pages/AuthSuccess.tsx`) handles the code exchange automatically:

```typescript
// Read the short-lived exchange code (not a JWT)
const params = new URLSearchParams(window.location.search);
const code = params.get('code');

// Remove it from the URL immediately
window.history.replaceState({}, document.title, window.location.pathname);

// Exchange for the real JWT via a secure POST
const response = await api.post('/auth/exchange', { code });
const { token } = response.data;

// Decode and store
const payload = JSON.parse(atob(token.split('.')[1]));
loginWithToken(token, { _id: payload.userId, email: payload.email, role: payload.role });
navigate('/products');
```

---

## Security Properties

| Threat | Mitigation |
|---|---|
| JWT in browser history | JWT never appears in URL — only an opaque 30-second code |
| JWT in server/proxy logs | Same: URL contains only the exchange code |
| JWT in `Referer` header | Same: Referer carries only the exchange code |
| Exchange code reuse | `consumeCode()` deletes the entry atomically on first use |
| Exchange code brute-force | 16-byte (64-bit) random space; 30-second window; consumed immediately |
| CSRF on OAuth initiation | HMAC-signed state parameter (see `api/utils/oauthState.js`) |
| Code surviving a restart | Acceptable — user is redirected back to login (30 s window is tiny) |

---

## Multi-Instance Deployment

If the application is scaled to multiple Node.js instances, exchange codes stored in one process will not be visible to others. Replace the in-memory store with a shared Redis instance:

```javascript
// Pseudocode for a Redis-backed implementation
async function createCode(userId) {
    const code = crypto.randomBytes(8).toString('hex');
    await redis.set(`auth:code:${code}`, userId.toString(), 'EX', 30);
    return code;
}

async function consumeCode(code) {
    const userId = await redis.getdel(`auth:code:${code}`);
    return userId ?? null;
}
```

The rest of the application (`routes/auth.js`) does not need to change because `createCode` / `consumeCode` are the only surface the route touches.
