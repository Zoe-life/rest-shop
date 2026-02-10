# Visual Guide: Connecting Worker to Backend

## The Problem

Users need to connect the Cloudflare Worker (edge proxy) to the Node.js backend so they can communicate.

## The Solution: BACKEND_API_URL

The worker needs to know **where** the Node.js backend is running. This is configured using the `BACKEND_API_URL` environment variable.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT/FRONTEND                        │
│                   (React App on Browser)                       │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                │ 1. User makes API request
                                │    (e.g., GET /products)
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKER                           │
│                     (Edge Proxy Layer)                         │
│                                                                 │
│  Configuration Needed:                                         │
│  └─ BACKEND_API_URL = "https://your-backend-url"              │
│                                                                 │
│  What it does:                                                 │
│  ✅ Receives request from client                               │
│  ✅ Forwards to backend (using BACKEND_API_URL)                │
│  ✅ Returns response to client                                 │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                │ 2. Worker proxies request to backend
                                │    URL: BACKEND_API_URL + /products
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                      NODE.JS BACKEND                           │
│                  (Express + Mongoose + MongoDB)                │
│                                                                 │
│  Configuration Needed:                                         │
│  └─ MONGODB_URI = "mongodb+srv://..."                          │
│  └─ JWT_KEY = "your-secret-key"                                │
│  └─ (All other secrets go here, NOT in worker)                 │
│                                                                 │
│  What it does:                                                 │
│  ✅ Handles business logic                                     │
│  ✅ Queries MongoDB                                            │
│  ✅ Processes payments                                         │
│  ✅ Manages authentication                                     │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                │ 3. Backend queries database
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                      MONGODB DATABASE                          │
│                       (MongoDB Atlas)                          │
│                                                                 │
│  Configuration Needed:                                         │
│  └─ IP Whitelist (0.0.0.0/0 for PaaS, or backend IP)          │
│                                                                 │
│  What it stores:                                               │
│  ✅ Products                                                   │
│  ✅ Users                                                      │
│  ✅ Orders                                                     │
│  ✅ Everything else                                            │
└────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Connection Flow

### Step 1: Deploy Backend

```
┌─────────────────────────┐
│   Node.js Backend       │
│   (Railway/Render/VPS)  │
│                         │
│   Status: ✅ Running    │
│   URL: https://your-    │
│        app.railway.app  │
└─────────────────────────┘
```

**Commands:**
```bash
# Deploy to Railway (example)
railway up

# Get your backend URL
# Example: https://your-app.railway.app
```

**Verify it works:**
```bash
curl https://your-app.railway.app/health
# Should return: {"status":"ok","database":"connected"}
```

---

### Step 2: Configure Worker

```
┌─────────────────────────┐
│   Cloudflare Worker     │
│                         │
│   Status: ⚠️  Needs     │
│           Config        │
│                         │
│   Missing:              │
│   BACKEND_API_URL ❌    │
└─────────────────────────┘
```

**Command:**
```bash
cd worker
wrangler secret put BACKEND_API_URL
# When prompted, enter: https://your-app.railway.app
```

**After configuration:**
```
┌─────────────────────────┐
│   Cloudflare Worker     │
│                         │
│   Status: ✅ Configured │
│                         │
│   BACKEND_API_URL:      │
│   https://your-app.     │
│   railway.app ✅        │
└─────────────────────────┘
```

---

### Step 3: Deploy Worker

```bash
cd worker
wrangler deploy
```

**After deployment:**
```
┌─────────────────────────┐
│   Cloudflare Worker     │
│                         │
│   Status: ✅ Deployed   │
│   URL: https://worker.  │
│        workers.dev      │
│                         │
│   Can reach backend: ✅ │
└─────────────────────────┘
```

---

### Step 4: Test Connection

```bash
curl https://your-worker.workers.dev/health
```

**Expected response:**
```json
{
  "worker": "ok",
  "backend": {
    "status": "ok",
    "database": "connected"
  },
  "timestamp": "2026-02-10T..."
}
```

**This confirms:**
- ✅ Worker is running
- ✅ Worker can reach backend
- ✅ Backend is healthy
- ✅ Database is connected

---

## Configuration Checklist

### ✅ Backend Configuration (Railway/Render Dashboard or .env)

```bash
# Required
MONGODB_URI=mongodb+srv://...
JWT_KEY=your-secret-key-32-chars-minimum
NODE_ENV=production
PORT=3001

# CORS
ALLOWED_ORIGINS=https://yourfrontend.com,https://worker.workers.dev

# Optional: Payment keys
STRIPE_SECRET_KEY=sk_...
PAYPAL_CLIENT_ID=...
# etc.
```

### ✅ Worker Configuration (Cloudflare Secrets)

```bash
# Only ONE secret needed:
BACKEND_API_URL=https://your-app.railway.app
```

**That's it!** All other secrets stay in the backend.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting to Set BACKEND_API_URL

**Error:**
```json
{
  "error": {
    "message": "Backend API URL not configured",
    "code": "BACKEND_NOT_CONFIGURED"
  }
}
```

**Fix:**
```bash
cd worker
wrangler secret put BACKEND_API_URL
# Enter your backend URL
```

---

### ❌ Mistake 2: Wrong Backend URL

**Error:**
```json
{
  "error": {
    "message": "Backend service unavailable",
    "code": "BACKEND_ERROR"
  }
}
```

**Fix:**
1. Verify backend is accessible:
   ```bash
   curl https://your-backend-url/health
   ```
2. Check if URL is correct in Cloudflare Dashboard
3. Update if needed:
   ```bash
   wrangler secret put BACKEND_API_URL
   # Enter the correct URL
   ```

---

### ❌ Mistake 3: Putting Secrets in Worker

**DON'T DO THIS:**
```bash
# ❌ Wrong - Don't put these in worker
wrangler secret put JWT_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put MONGODB_URI
```

**DO THIS INSTEAD:**
```bash
# ✅ Correct - Put secrets in backend environment
# Set these in Railway/Render dashboard or .env file
JWT_KEY=...
STRIPE_SECRET_KEY=...
MONGODB_URI=...
```

**Why?**
- Worker is just a proxy, doesn't need secrets
- Backend reads secrets from its own environment
- More secure: secrets stay in one place

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| **Deploy Backend** | Railway/Render/VPS | `railway up` or dashboard |
| **Set Worker Config** | Cloudflare Worker | `wrangler secret put BACKEND_API_URL` |
| **Deploy Worker** | Cloudflare | `wrangler deploy` |
| **Test Backend** | CLI | `curl https://backend-url/health` |
| **Test Worker** | CLI | `curl https://worker-url/health` |
| **Validate Setup** | CLI | `node api/scripts/validate-connection.js <backend> <worker>` |

---

## Need Help?

1. **Read the detailed guide**: [docs/CONNECTION_GUIDE.md](./CONNECTION_GUIDE.md)
2. **Run validation script**: `node api/scripts/validate-connection.js <your-backend-url>`
3. **Use configuration helper**: `cd worker && ./configure.sh`
4. **Check troubleshooting**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Summary

**The key to connecting worker to backend:**

1. ✅ Deploy backend (get URL)
2. ✅ Set `BACKEND_API_URL` in worker (tell it where backend is)
3. ✅ Deploy worker
4. ✅ Test `/health` endpoint

**That's it! The worker will proxy all requests to your backend.**

**Mental Model:**
```
Frontend → Worker (knows where backend is) → Backend (does the work) → MongoDB
```
