# Token Persistence and URL Leak Prevention

This document contains two articles about how rest-shop handles authentication tokens and prevents credentials from leaking through URLs.

- [Part A](#part-a--linkedin-article) — A LinkedIn article for a general professional audience (non-technical)
- [Part B](#part-b--medium-article) — A Medium article for engineers: a deep technical dive

---

## Part A — LinkedIn Article

### We Found a Silent Security Risk in Our App — Here's How We Fixed It

*This is a follow-up to [my previous post](https://www.linkedin.com/posts/activity-previous-oauth-post) about getting OAuth authentication working across domains. In that post, I shared how three weeks of 401 errors finally ended when I stopped fighting cross-domain cookies and instead passed the JWT directly in the redirect URL — `res.redirect(\`${frontendUrl}/auth/success?token=${encodeURIComponent(token)}\`)`. It felt like an elegant, pragmatic win. Today I want to share what we discovered next: that solution had a silent security risk hiding inside it, and here is how we fixed it.*

---

Every time a user logs in with Google or Microsoft, a digital key is created for them — a small piece of data that proves who they are and keeps them signed in as they browse. In our e-commerce platform, we discovered that this key was quietly leaking into places it should never be: **browser history, server logs, and even the invisible headers sent to third-party tools like analytics and fonts.**

No alarm went off. No hacker was actively intercepting anything. But the vulnerability was real, and in the wrong situation it could have allowed someone to take over a session just by looking at a URL.

Here is the story of how we found it, understood it, and fixed it — without changing what the experience looks and feels like for users.

---

#### The Problem: Your Login Key Was in the Web Address

When you click "Sign in with Google," a behind-the-scenes conversation happens between your browser, our servers, and Google. At the end of that conversation, Google hands our server confirmation that you are who you say you are. Our server then needs to give your browser a key so that future requests — loading your cart, your order history, your profile — are trusted.

The simplest way to do this is to put the key directly in the web address that your browser is sent to:

```
https://app.rest-shop.com/auth/success?token=eyJhbGciOiJIUzI1NiIs...
```

That long string after `?token=` is the key. The problem? **A URL is not a secret.** It gets saved in at least three places the moment your browser visits it:

1. **Your browser's history.** Anyone who picks up your unlocked phone or shares your computer can open the history and copy that URL — and with it, your key.
2. **Our server logs.** Every web server records the full URLs of every request it handles. Those logs are often shared with DevOps teams, piped into monitoring dashboards, and stored for weeks. A key sitting in a log file is a key that many people can see.
3. **Third-party request headers.** When a page loads, it typically pulls in resources from other services — fonts, analytics, chat widgets. Browsers automatically attach the current URL to those requests as a "Referer" header. That means our login key was being silently sent to every external service our page loaded.

A login key is typically valid for an hour. That is a long window for someone to find it in any one of those places and use it.

---

#### The Fix: A Claim-Ticket System

Think of it like a coat check at a restaurant. When you hand over your coat, you get a small, numbered ticket — not a description of your coat, not your name, just a number. When you come back, you hand in the ticket, and only then do you get your coat. The ticket itself is worthless to anyone who finds it after you have already claimed your coat, because it is single-use.

We applied exactly this idea to authentication.

Instead of putting the real login key in the URL, our server now puts a **temporary claim ticket** there. It is a short, random string of characters that means nothing on its own — it does not contain your email address, your user ID, or any personal information. It is valid for exactly 30 seconds, and it can only be used once.

The moment your browser arrives at the success page, our app reads the ticket, immediately removes it from the URL (so it disappears from your browser history), and sends it directly to our server through a private channel — the same kind of secure, non-URL channel used for all other data in the app. The server trades in the ticket for the real login key and returns it. The ticket is destroyed the instant it is read.

What ends up in browser history, server logs, and third-party headers is just a 30-second, already-consumed, meaningless string of characters.

---

#### Why This Matters Beyond Our App

This is not a problem unique to us. The pattern of putting credentials in URLs is common, sometimes because it is the easiest option, sometimes because developers are unaware of the risks. Many OAuth implementations — the technology behind "Sign in with Google" buttons everywhere — have historically done exactly what we were doing.

The fix requires a bit more engineering effort, but the principle is simple: **secrets belong in request bodies and headers, not in URLs.** URLs are designed to be shared, logged, and forwarded. Secrets are not.

For any team building a product where users log in with a third-party provider, this is worth checking. A few hours of engineering work can close a category of vulnerability that is easy to overlook precisely because nothing visibly breaks.

---

#### What Changed for Users

Nothing. The login flow looks and works exactly the same. The entire exchange happens in the fraction of a second between clicking the button and landing on the products page. The only difference is that the journey is now more secure.

---

*Interested in the technical details of how we implemented this? See [Part B](#part-b--medium-article) below for a full engineering deep-dive.*

---
---

## Part B — Medium Article

### How We Stopped Leaking JWTs Through OAuth Redirect URLs: A Full Engineering Deep Dive

OAuth is everywhere. "Sign in with Google." "Continue with Microsoft." For users it is a two-click convenience. For engineers it is a multi-step protocol involving redirects, authorization codes, access tokens, and — in our case — JWTs that we issue ourselves once the OAuth handshake completes.

We discovered that our implementation had a textbook credential-leakage vulnerability: the JWT was riding in the redirect URL. This post documents the vulnerability in full, the architecture we chose to fix it, every line of code involved, the cryptographic properties we relied on, and the edge cases we thought through along the way.

---

### Background: What We Are Building and Why It Matters

rest-shop is a Node.js/Express backend paired with a React/TypeScript frontend, deployed across Render (API), Cloudflare Pages (frontend), and a Cloudflare Worker that acts as a reverse proxy between them. Users can authenticate via email/password or via OAuth 2.0 with Google or Microsoft, implemented through Passport.js.

After OAuth completes, we issue our own JWT. This is the credential the frontend uses for every subsequent API call. The JWT carries three claims:

```json
{
  "userId": "64f3a...",
  "email": "user@example.com",
  "role": "user",
  "iat": 1741008763,
  "exp": 1741012363
}
```

It is signed with HS256 using a server-side secret (`JWT_KEY`) and has a 1-hour TTL. Because it is self-contained and stateless, any request bearing a valid JWT is trusted — there is no session store to check.

That means the JWT is the key to the kingdom for the duration of its life. Leaking it is equivalent to leaking the user's authenticated session.

---

### The Vulnerability: Three Ways a URL Credential Leaks

The original OAuth callback handler looked like this:

```javascript
// ORIGINAL VULNERABLE CODE — do not use
passport.authenticate('google', { session: false }),
async (req, res) => {
    const token = generateToken(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/success?token=${token}`);
}
```

The resulting redirect sent the browser to:

```
https://app.rest-shop.com/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGYzYS4uLiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQxMDA4NzYzLCJleHAiOjE3NDEwMTIzNjN9.<signature>
```

That URL exposed the JWT in three distinct ways:

#### 1. Browser History

Every modern browser writes visited URLs to its history database. On most devices this database is readable by the user and by any other user of the device. An attacker who gains physical access to an unlocked device — or who installs a browser extension with history access — can read the full URL and extract a live JWT from it. The JWT remains valid for up to one hour.

#### 2. Server and Proxy Access Logs

Express, nginx, Apache, Cloudflare, Render, and every other component in a typical web stack logs HTTP requests by default. The standard log format includes the full request path. On our architecture that means the JWT appears in:

- Render's application logs
- Cloudflare's request logs
- Any WAF or CDN in the chain

These logs are often shared across teams, retained for days or weeks, and sometimes exported to third-party log aggregators like Datadog or Splunk. A JWT in a log is a JWT that many people and systems can see, often long after the one-hour TTL would have expired for a given request.

#### 3. `Referer` Header Leakage

When a browser navigates to a URL and that page loads resources from other origins, the browser sends the source URL in the `Referer` header of each sub-request. If our success page loaded a Google Font, a Stripe.js script, or a third-party analytics pixel, the browser would have sent:

```http
GET /css2?family=Inter HTTP/2
Host: fonts.googleapis.com
Referer: https://app.rest-shop.com/auth/success?token=eyJhbGci...
```

The JWT would arrive at Google's servers, our analytics provider's servers, and any other third-party resource loaded by that page — automatically, silently, with every page load.

---

### The Solution Architecture: Single-Use Exchange Code Pattern

The core insight is simple: **a URL must never contain a long-lived credential**. The OAuth specification (RFC 6749) already acknowledges this risk for the authorization code it issues — that code is short-lived, single-use, and bound to a redirect URI. We applied the same discipline to our own JWT issuance.

Instead of placing the JWT in the redirect URL, we place a **short-lived, opaque exchange code** there. The frontend immediately trades the code for the JWT via a POST request. The JWT travels only in an HTTP response body — a channel that is not logged, not stored in browser history, and not forwarded in `Referer` headers.

The complete flow:

```
User      Browser            Backend              OAuth Provider
 │           │                  │                       │
 │──click────▶                  │                       │
 │           │──GET /auth/google▶                       │
 │           │                  │──generateOAuthState()─│
 │           │                  │──redirect(authURL)────▶
 │           │◀──────────────────────────────────────────│ (302 to Google)
 │           │──────────────────────────────────────────▶│ (user logs in)
 │           │◀──────────────────────────────────────────│ (302 callback)
 │           │──GET /auth/google/callback?code=...&state=▶
 │           │                  │  verifyOAuthState()   │
 │           │                  │  passport.authenticate│
 │           │                  │  createCode(userId)   │
 │           │◀──302 /auth/success?code=XXXX─────────────│
 │           │──POST /auth/exchange { code: "XXXX" }─────▶
 │           │                  │  consumeCode("XXXX")  │
 │           │                  │  User.findById(userId)│
 │           │                  │  generateToken(user)  │
 │           │◀──200 { token, expiresAt }────────────────│
 │  logged in│                  │                       │
```

Now let us walk through every component involved.

---

### Component 1: The Exchange Code Store (`api/utils/authCodeStore.js`)

The exchange code store is the heart of the pattern. It maps random codes to user IDs and enforces both the single-use and TTL constraints.

```javascript
const crypto = require('crypto');

/** @type {Map<string, {userId: string, timer: NodeJS.Timeout}>} */
const store = new Map();

function createCode(userId) {
    const code = crypto.randomBytes(8).toString('hex'); // 16 hex characters

    const timer = setTimeout(() => store.delete(code), 30 * 1000);
    // Allow the Node.js process to exit normally even if the timer is pending.
    if (timer.unref) timer.unref();

    store.set(code, { userId: userId.toString(), timer });
    return code;
}

function consumeCode(code) {
    const entry = store.get(code);
    if (!entry) return null;

    clearTimeout(entry.timer);
    store.delete(code);   // atomically deleted — the code can never be used again
    return entry.userId;
}

module.exports = { createCode, consumeCode };
```

#### Why in-memory?

Exchange codes are valid for 30 seconds. A database round-trip on every OAuth login would add latency and operational complexity (connection pooling, schema management, TTL indexes) for a store that holds data for less than half a minute. An in-memory `Map` gives O(1) insert and lookup with zero network latency. The trade-off — codes do not survive a process restart — is acceptable because any in-flight OAuth flow that spans a restart simply redirects the user back to the login page, which is the correct degraded behaviour.

#### Why `crypto.randomBytes`?

`crypto.randomBytes(8)` draws from the operating system's CSPRNG (cryptographically secure pseudo-random number generator). Eight bytes encoded as hex yields a 16-character string with 2⁶⁴ ≈ 1.8 × 10¹⁹ possible values. In a real deployment many users may be logging in simultaneously, so the store might hold thousands of valid codes at once. This increases the probability of a random guess succeeding, but only linearly: even with 10,000 concurrent valid codes the attacker would need to make roughly 6 × 10¹³ requests per second for a 1% chance of success in 30 seconds — still orders of magnitude beyond what any network can deliver, and each successful guess would only compromise one arbitrary user's session.

#### The single-use guarantee

`consumeCode` performs a read-then-delete in a single synchronous call. Because Node.js is single-threaded and JavaScript is non-preemptive, there is no race condition between the lookup and the deletion. Even if two requests bearing the same code arrived simultaneously, Node.js would process them sequentially: the first would find the entry and delete it; the second would find nothing and return `null`.

#### TTL enforcement

`setTimeout` schedules the deletion of the Map entry after 30 seconds. `timer.unref()` tells Node.js not to keep the event loop alive solely because this timer is pending — important for graceful shutdown in test environments. If `consumeCode` is called before the timer fires, `clearTimeout` cancels the scheduled deletion (the entry is already gone, so there is nothing to delete anyway).

---

### Component 2: OAuth Callback Routes (`api/routes/auth.js`)

Both the Google and Microsoft callbacks follow the same pattern. Here is the Google implementation in full:

```javascript
const { generateOAuthState, verifyOAuthState } = require('../utils/oauthState');
const { createCode, consumeCode } = require('../utils/authCodeStore');

// Initiate OAuth — attach an HMAC-signed state for CSRF protection
router.get('/google', (req, res, next) => {
    const state = generateOAuthState();
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state
    })(req, res, next);
});

// Handle the callback — verify state, issue exchange code
router.get('/google/callback',
    (req, res, next) => {
        if (!verifyOAuthState(req.query.state)) {
            logAuthFailure({ reason: 'OAuth state verification failed' });
            return res.redirect('/auth/failure');
        }
        next();
    },
    passport.authenticate('google', {
        failureRedirect: '/auth/failure',
        session: false
    }),
    async (req, res) => {
        const code = createCode(req.user._id);
        logInfo('OAuth exchange code issued', { userId: req.user._id });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/success?code=${code}`);
    }
);
```

Three things to note:

1. **`session: false`** — Passport is not creating an HTTP session. The entire authentication is stateless; the only thing that persists is the exchange code in the in-memory Map.
2. **The redirect carries only the exchange code**, not the JWT. `req.user._id` maps to a code; the code maps to nothing that is useful without the server-side lookup.
3. **The HMAC state check runs before Passport**. This is intentional: we want to reject requests with invalid state before Passport does any work (and before we touch the database).

---

### Component 3: The Exchange Endpoint (`POST /auth/exchange`)

```javascript
router.post('/exchange', async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Exchange code is required' });
    }

    try {
        // consumeCode atomically retrieves and removes the entry.
        const userId = consumeCode(code);

        if (!userId) {
            logAuthFailure({ reason: 'Invalid or expired OAuth exchange code' });
            return res.status(401).json({ message: 'Invalid or expired exchange code' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const token = generateToken(user, req);
        logInfo('JWT issued via exchange code', { userId: user._id, email: user.email });

        const decoded = jwt.decode(token);
        res.status(200).json({
            token,
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
    } catch (error) {
        logError('Auth exchange error', error);
        res.status(500).json({ message: 'Authentication exchange failed' });
    }
});
```

The JWT is generated inside this endpoint and returned in the **response body** — never in a URL, never in a redirect header, never in a cookie. It exists only in the JSON payload of a POST response, which is:

- Not stored in browser history (only GET navigations are recorded)
- Not stored in server access logs at the body level (standard log formats record URL and status code, not response bodies)
- Not forwarded in `Referer` headers (Referer is derived from the page URL, not from POST bodies)

The `expiresAt` field is derived by decoding (not verifying) the JWT we just generated, so it accurately reflects the expiry embedded in the token itself rather than being independently calculated.

---

### Component 4: Stateless CSRF Protection (`api/utils/oauthState.js`)

RFC 6749 §10.12 mandates that OAuth clients use a `state` parameter to prevent CSRF attacks. The traditional implementation stores the state value in an `httpOnly` cookie on OAuth initiation and reads it back on the callback to verify they match.

This approach breaks on our architecture. OAuth initiation travels through the Cloudflare Worker proxy (on the `worker.rest-shop.com` origin), but the OAuth provider sends the callback directly to the Render backend (on `api.rest-shop.com`). A cookie set for `api.rest-shop.com` during initiation is never sent to the Worker, and a cookie set by the Worker is never sent to `api.rest-shop.com`. The two origins cannot share a cookie.

We solved this by making the state **self-verifying**: instead of storing a nonce and comparing it on callback, we encode an HMAC of the nonce inside the state string itself.

```javascript
const crypto = require('crypto');

function getSecret() {
    const secret = process.env.JWT_KEY;
    if (!secret) throw new Error('JWT_KEY environment variable is not set.');
    return secret;
}

// state = "<hex-nonce>.<HMAC-SHA256(nonce, JWT_KEY)>"
function generateOAuthState() {
    const nonce = crypto.randomBytes(16).toString('hex');
    const sig = crypto
        .createHmac('sha256', getSecret())
        .update(nonce)
        .digest('hex');
    return `${nonce}.${sig}`;
}

function verifyOAuthState(state) {
    if (!state || typeof state !== 'string') return false;

    const dotIndex = state.indexOf('.');
    if (dotIndex === -1) return false;

    const nonce = state.slice(0, dotIndex);
    const providedSig = state.slice(dotIndex + 1);
    if (!nonce || !providedSig) return false;

    const expectedSig = crypto
        .createHmac('sha256', getSecret())
        .update(nonce)
        .digest('hex');

    try {
        const providedBuf = Buffer.from(providedSig, 'hex');
        const expectedBuf = Buffer.from(expectedSig, 'hex');
        if (providedBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(providedBuf, expectedBuf);
    } catch {
        return false;
    }
}
```

#### Security properties

- **Unforgeability**: An attacker cannot produce a valid state without knowing `JWT_KEY`. HMAC-SHA256 with a 256-bit key provides 128-bit security against forgery under standard assumptions.
- **Uniqueness per flow**: `crypto.randomBytes(16)` gives a 128-bit nonce. The probability of two concurrent flows sharing a nonce is negligible (birthday bound: ≈ 2⁻⁶⁴ after 2³² concurrent logins).
- **Timing-safe comparison**: `crypto.timingSafeEqual` runs in constant time regardless of where the strings first differ, preventing timing side-channel attacks that could leak information about the expected HMAC.
- **No cookie dependency**: The entire verification is self-contained in the state string. It works correctly regardless of which origin receives the callback.

---

### Component 5: Frontend OAuth Callback Handler (`frontend/src/pages/AuthSuccess.tsx`)

```typescript
useEffect(() => {
    const handleOAuthCallback = async () => {
        try {
            // 1. Read the exchange code from the URL query string.
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');

            // 2. Remove the code from the URL BEFORE making any network request.
            //    This minimises its presence in browser history.
            window.history.replaceState({}, document.title, window.location.pathname);

            if (code) {
                // 3. POST the code to the exchange endpoint.
                //    The JWT travels back in the response body — not in any URL.
                const response = await api.post('/auth/exchange', { code });
                const { token } = response.data;

                // 4. Decode (not verify) the JWT payload to extract display fields.
                //    The token was just returned by our own /auth/exchange endpoint, so
                //    its origin is trusted here. All server-side authorization decisions
                //    use jwt.verify() in check-auth.js middleware — never this decoded value.
                const payload = JSON.parse(atob(token.split('.')[1]));
                const user = {
                    _id: payload.userId,
                    email: payload.email,
                    role: payload.role
                };

                // 5. Persist the token and navigate.
                loginWithToken(token, user);
                navigate('/products');
            } else {
                setError('No authentication code received');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
            setTimeout(() => navigate('/login'), 3000);
        }
    };

    handleOAuthCallback();
}, [navigate, loginWithToken]);
```

The ordering of steps 1 and 2 is deliberate. `window.history.replaceState` fires synchronously and modifies the browser's history entry for the current URL before any `await` yields control. Even if the subsequent POST fails, the code is already gone from the address bar and the browser's history record.

`window.history.replaceState` (rather than `pushState`) replaces the current history entry rather than adding a new one, so pressing the back button cannot resurrect the code-bearing URL.

---

### Component 6: Token Persistence (`frontend/src/contexts/AuthContext.tsx`)

Once the exchange endpoint returns the JWT, `loginWithToken` stores it in two places and wires up the Axios default header:

```typescript
const loginWithToken = (newToken: string, userData: User) => {
    // Persist across page reloads and browser tab switches
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    // Attach to every subsequent Axios request automatically
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    // Update React state
    setToken(newToken);
    setUser(userData);
};
```

On application startup, the context re-hydrates from `localStorage`:

```typescript
useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setIsLoading(false);
}, []);
```

On logout, both storage locations and the default header are cleared:

```typescript
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
};
```

#### `localStorage` vs. `sessionStorage` vs. `httpOnly` cookie

| Storage | Survives page reload | Survives tab close | Accessible to JS | XSS risk |
|---|---|---|---|---|
| `localStorage` | ✅ | ✅ | ✅ | Yes — a script can read it |
| `sessionStorage` | ✅ | ❌ | ✅ | Yes — a script can read it |
| `httpOnly` cookie | ✅ | ✅ | ❌ | No — browser enforces opacity |

We use `localStorage` for the JWT because the user experience expectation is that a login survives closing and reopening the tab. The XSS risk is mitigated by the backend's `Content-Security-Policy` headers (enforced by Helmet), strict CORS configuration, and the `xss` package applied to user-controlled content.

The backend also supports an `authToken` `httpOnly` cookie for the OAuth flow. The logout endpoint clears it:

```javascript
router.get('/logout', (req, res) => {
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: isProduction,           // HTTPS only in production
        sameSite: isProduction ? 'none' : 'lax',
    });
    res.status(200).json({ message: 'Logged out successfully' });
});
```

---

### Component 7: JWT Validation Middleware (`api/middleware/check-auth.js`)

Every protected route passes through this middleware:

```javascript
module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'No auth token provided' });
        }

        const token = authHeader.split(' ')[1]; // Extract from "Bearer <token>"
        if (!token) {
            return res.status(401).json({ message: 'Invalid token format' });
        }

        const jwtKey = process.env.JWT_KEY;
        if (!jwtKey) {
            return res.status(500).json({ message: 'JWT key not configured' });
        }

        const decoded = jwt.verify(token, jwtKey);
        req.userData = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(401).json({ message: 'Auth failed' });
    }
};
```

The middleware deliberately accepts the JWT only from the `Authorization` header. There is no query-parameter or cookie fallback. This eliminates an entire class of accidental credential exposure: even if a developer makes a mistake and logs `req.query`, the JWT will not appear there.

`jwt.verify` both decodes and cryptographically verifies the token in one call. It checks the `exp` claim automatically and throws `TokenExpiredError` if the token has passed its expiry time, which the middleware surfaces as a distinct 401 response.

---

### Threat Model

| Threat | Attack vector | Mitigation | Residual risk |
|---|---|---|---|
| JWT in browser history | Attacker accesses device history | JWT never appears in a URL | None |
| JWT in server/proxy logs | Attacker reads access logs | Logs contain only the 30-second exchange code | Negligible — code already consumed |
| JWT in `Referer` header | Third-party resource receives Referer | Referer carries only the exchange code | Negligible — code already consumed |
| Exchange code replay | Attacker intercepts redirect and reuses code | `consumeCode()` deletes entry atomically on first read | None |
| Exchange code brute-force | Attacker sends random codes to `/auth/exchange` | 2⁶⁴ space × 30-second window makes success probability ≈ 0 | Negligible |
| CSRF on OAuth initiation | Attacker tricks user into starting attacker's flow | HMAC-signed state verified before any code is issued | None |
| XSS token theft | Malicious script reads `localStorage` | CSP headers, XSS filtering, minimal third-party scripts | Low — residual XSS surface |
| Code surviving process restart | In-flight OAuth login spans restart | User redirected back to login page; no security impact | None (UX degradation only) |
| Token surviving logout | User's session continues after logout | `localStorage` and cookie both cleared on logout | None |
| Long-lived token exposure | Compromised JWT used after discovery | 1-hour expiry limits the damage window | Low — bounded by TTL |

---

### Edge Cases and Deployment Considerations

#### Process restarts

Exchange codes live in process memory. A process restart during the 30-second window between the OAuth redirect and the frontend's POST to `/auth/exchange` will cause `consumeCode` to return `null` and the user to see an "Invalid or expired exchange code" error. They are then redirected to the login page. This is the correct behaviour — a failed authentication attempt — and is vastly preferable to a credential leak.

In practice, process restarts during a 30-second window are rare enough that this is considered an acceptable trade-off.

#### Multi-instance deployments

If the application scales to multiple Node.js instances behind a load balancer, a code created by instance A will not be found by instance B. The fix is to replace the in-memory `Map` with a shared Redis store while keeping the same `createCode`/`consumeCode` interface:

```javascript
// Redis-backed implementation — drop-in replacement for the in-memory store
async function createCode(userId) {
    const code = crypto.randomBytes(8).toString('hex');
    // SET key value EX seconds — atomic create with TTL
    await redis.set(`auth:code:${code}`, userId.toString(), 'EX', 30);
    return code;
}

async function consumeCode(code) {
    // GETDEL atomically retrieves and deletes the key in a single Redis command
    const userId = await redis.GETDEL(`auth:code:${code}`);
    return userId ?? null;
}
```

`GETDEL` (available since Redis 6.2) preserves the single-use guarantee: the key is deleted atomically as part of the read. No two instances can both successfully consume the same code.

The rest of the application — `routes/auth.js`, `AuthSuccess.tsx`, and everything else — requires no changes, because `createCode` and `consumeCode` are the only surface the route layer touches.

#### Cross-origin architecture

Our Cloudflare Worker acts as a reverse proxy, so OAuth initiation requests (`GET /auth/google`) travel through the Worker's origin before reaching the Render backend, while the OAuth provider's callback goes directly to the Render backend. This means the two legs of the flow traverse different origins — a scenario that breaks cookie-based CSRF protection because the cookie set on one origin is never sent to the other.

The stateless HMAC state parameter solves this cleanly. Because the verification material is encoded inside the state string itself, the callback handler on the Render backend can verify the state without needing any cookie, session, or shared state with the Worker. The only shared secret is `JWT_KEY`, which both the Worker (if it signs anything) and the backend already have via environment variables.

---

### Summary

The change from putting the JWT in the redirect URL to using a single-use exchange code is a small surface change — one redirect URL pattern swapped for another — but it eliminates an entire category of credential exposure across three distinct leakage vectors simultaneously.

The implementation relies on well-understood primitives: a CSPRNG for code generation, an atomic Map operation for single-use enforcement, a `setTimeout` for TTL, an HMAC-SHA256 for stateless CSRF protection, and `crypto.timingSafeEqual` to prevent timing side-channels. None of these require third-party cryptography libraries — they are all provided by Node.js's built-in `crypto` module.

The result: **the JWT never appears in a URL at any point in its lifetime**, from issuance to expiry.

---

### Related Documentation

- [OAuth Exchange Code Pattern](./OAUTH_EXCHANGE_CODE.md) — API reference and sequence diagrams
- [Security Summary](./SECURITY_SUMMARY.md) — overall security posture and CodeQL results
- [OAuth Setup Guide](./OAUTH_SETUP.md) — configuring Google and Microsoft OAuth providers
