# Cloudflare Workers Proxy Architecture

## Overview

This document explains the architectural solution implemented to resolve the Mongoose incompatibility with Cloudflare Workers runtime.

## Problem Statement

Cloudflare Workers cannot run Mongoose (even the browser build) because:
- Workers runtime lacks Node.js APIs like `process.emitWarning`, `process.version`, and full `Buffer` support
- Mongoose internally depends on these Node.js globals
- Deployment fails with error: `TypeError: {(intermediate value)}.emitWarning is not a function [code: 10021]`

## Solution: Proxy Architecture

We've implemented a **separation of concerns** architecture:

```
┌─────────────────────┐
│  Client Requests    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Cloudflare Workers (Edge)  │
│  - Gateway Worker           │
│  - Base Service Worker      │
│  - Payment Service Worker   │
│  (No Mongoose/MongoDB)      │
└──────────┬──────────────────┘
           │ HTTP Proxy
           ▼
┌─────────────────────────────┐
│  Node.js Backend (Server)   │
│  - Express App              │
│  - Mongoose + MongoDB       │
│  - Business Logic           │
└─────────────────────────────┘
```

### Components

#### 1. Cloudflare Workers (Edge Layer)
- **Location**: `src/worker.js`, `src/payment-worker.js`, `src/gateway-worker.js`
- **Purpose**: 
  - Lightweight HTTP proxy (~10-50KB each)
  - Edge routing and traffic distribution
  - Request/response forwarding
  - No database operations
  - No Mongoose imports
- **Benefits**:
  - Fast cold starts
  - Global edge distribution
  - Zero Node.js dependency issues
  - Easy to deploy and scale

#### 2. Node.js Backend (Database Layer)
- **Location**: `server.js`, `app.js`, `api/*`
- **Purpose**:
  - All MongoDB/Mongoose operations
  - Business logic execution
  - Payment processing
  - Authentication and authorization
- **Deployment Options**:
  - Traditional hosting (VPS, AWS EC2, etc.)
  - Platform-as-a-Service (Render, Heroku, etc.)
  - Containerized (Docker, Kubernetes)
  - Serverless Functions (AWS Lambda, etc.)

## Architecture Details

### Request Flow

1. **Client → Cloudflare Worker (Gateway)**
   ```
   GET https://your-worker.workers.dev/products
   ```

2. **Gateway → Appropriate Worker**
   - Routes `/payments/*` to Payment Worker
   - Routes everything else to Base Worker

3. **Worker → Node.js Backend**
   ```
   GET https://api.yourdomain.com/products
   Headers:
     X-Forwarded-By: Cloudflare-Worker
     X-Forwarded-For: <client-ip>
     Authorization: Bearer <jwt-token> (if present in original request)
   ```

4. **Backend → MongoDB**
   - Mongoose operations execute in Node.js environment
   - Full access to Node.js APIs

5. **Response Flows Back**
   - Backend → Worker → Gateway → Client

### Configuration

#### Environment Variables

**Cloudflare Workers** (set in Wrangler or Cloudflare Dashboard):
```bash
BACKEND_API_URL=https://api.yourdomain.com  # Your Node.js backend URL

# SECURITY NOTE: Other secrets (JWT_KEY, payment keys, etc.) should be
# configured directly in the backend environment, not in Workers.
# Workers are just proxies and should not handle sensitive secrets.
# The backend reads from its own environment variables.
```

**Node.js Backend** (.env file or hosting platform):
```bash
MONGODB_URI=mongodb+srv://...
JWT_KEY=your_jwt_secret
PORT=3001
NODE_ENV=production

# Payment Gateway Secrets
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
# etc.
```

**Important Security Note:**
- Workers should NOT forward secrets via headers (security risk)
- All secrets should be configured directly in the backend environment
- Workers only handle routing and proxy requests
- If you need worker-to-backend authentication, use mutual TLS or signed tokens

### File Changes Summary

#### Modified Files
1. **src/worker.js** - Converted from Mongoose-using worker to HTTP proxy
2. **src/payment-worker.js** - Converted to HTTP proxy for payments
3. **wrangler.toml** - Removed Durable Objects, added BACKEND_API_URL
4. **wrangler-payments.toml** - Removed Durable Objects, simplified config
5. **.env.example** - Added BACKEND_API_URL documentation

#### Backup Files Created
- `src/worker.js.backup` - Original worker with Mongoose
- `src/payment-worker.js.backup` - Original payment worker

#### New Files
- `src/worker-proxy.js` - Standalone proxy implementation (reference)
- `docs/CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md` - This file

## Deployment Guide

### Step 1: Deploy Node.js Backend

Choose a hosting option:

#### Option A: Render (Recommended for quick setup)
```bash
# Install Render CLI
npm install -g @render/cli

# Login and initialize
render login
render init

# Set environment variables
render variables set MONGODB_URI="mongodb+srv://..."
render variables set JWT_KEY="your_secret"
# ... set all other variables

# Deploy
render up
```

Your backend will be available at: `https://your-app.onrender.com`

#### Option B: Render
1. Connect your GitHub repo to Render
2. Select "Web Service"
3. Set environment variables in dashboard
4. Deploy automatically from main branch

#### Option C: Traditional VPS
```bash
# On your server
git clone your-repo
cd rest-shop
npm install
npm run build  # if needed

# Set up environment variables
cp .env.example .env
nano .env  # Edit with your values

# Start with PM2
pm2 start server.js --name rest-shop-api
pm2 save
```

### Step 2: Configure Cloudflare Workers

Update environment variables in Cloudflare Dashboard or use Wrangler:

```bash
# Set backend URL (CRITICAL)
wrangler secret put BACKEND_API_URL
# Enter: https://your-backend.onrender.com (or your backend URL)

# Set other secrets
wrangler secret put JWT_KEY
wrangler secret put STRIPE_SECRET_KEY
# ... etc
```

### Step 3: Deploy Workers

```bash
# Deploy all services
npm run deploy:all

# Or individually
npm run deploy:base      # Base service worker
npm run deploy:payments  # Payment service worker  
npm run deploy:gateway   # Gateway router
```

### Step 4: Test the Setup

```bash
# Test gateway health
curl https://your-gateway.workers.dev/health

# Expected response:
{
  "worker": "ok",
  "backend": {
    "status": "ok",
    "database": "connected",
    "environment": "production"
  },
  "timestamp": "2026-02-09T..."
}

# Test API endpoints
curl https://your-gateway.workers.dev/products
curl https://your-gateway.workers.dev/api/payments
```

## Development Workflow

### Local Development

You have two options:

#### Option 1: Direct Node.js Development (Recommended)
```bash
# Just run the Node.js server directly
npm start

# Test at http://localhost:3001
curl http://localhost:3001/products
```

#### Option 2: Local Workers + Local Backend
```bash
# Terminal 1: Start Node.js backend
npm start

# Terminal 2: Start local worker
wrangler dev --config wrangler.toml

# Set local backend URL
# In wrangler.toml [vars]:
# BACKEND_API_URL = "http://localhost:3001"
```

### Testing

All existing tests continue to work as-is because they test the Node.js backend directly:

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:load          # Load testing
```

## Benefits of This Architecture

### Reliability
- **No runtime compatibility hacks**: Pure Node.js for database operations
- **Stable Mongoose**: Uses official Mongoose in proper Node.js environment
- **No more error 10021**: Workers don't import Mongoose at all

### Performance
- **Global edge distribution**: Workers handle routing at the edge
- **Fast cold starts**: Workers are tiny (~10-50KB vs 1-2MB before)
- **Optimal caching**: Backend can be cached separately from edge logic

### Scalability
- **Independent scaling**: Scale workers and backend separately
- **Cost optimization**: Workers stay in free tier, backend scales as needed
- **Better resource usage**: Database connections only in backend

### Maintainability
- **Cleaner separation**: Edge logic vs. business logic
- **Easier debugging**: Full Node.js tooling for backend
- **Standard patterns**: Industry-standard API gateway pattern

### Flexibility
- **Backend portability**: Deploy backend anywhere (VPS, PaaS, containers)
- **Database options**: Stick with MongoDB or migrate to others
- **Future-proof**: Can add more services or change stack easily

## Security Considerations

### Environment Variables and Secrets

**Best Practice: Secrets in Backend Only**
- Configure all sensitive secrets (JWT_KEY, payment gateway keys, etc.) directly in the backend environment
- Workers should only know the `BACKEND_API_URL`
- Do NOT forward secrets from Workers to backend via headers (security risk)
- Backend reads secrets from its own environment variables

### Why Not Forward Secrets via Headers?
1. **Interception Risk**: HTTP headers can be intercepted if TLS is compromised
2. **Logging Risk**: Secrets in headers might be logged by proxies or monitoring tools
3. **Attack Surface**: Increases the attack surface by exposing secrets in two places
4. **Best Practice**: Keep secrets in the environment where they're used

### Secure Worker-to-Backend Communication

If you need to authenticate the worker to the backend:

1. **Mutual TLS (mTLS)**: Best option for production
   - Backend validates worker's client certificate
   - No secrets in headers

2. **Signed Tokens**: Alternative approach
   - Worker signs requests with a shared secret
   - Backend verifies signature
   - Still safer than forwarding raw secrets

3. **IP Allowlisting**: Simple but less secure
   - Backend only accepts requests from Cloudflare IPs
   - Use with other methods for defense in depth

### CORS
- Backend validates origins from `ALLOWED_ORIGINS` environment variable
- Workers don't handle CORS directly (backend does)
- Use specific origins, avoid wildcards in production

### Authentication
- JWT validation happens in backend
- Workers pass tokens transparently in Authorization header
- No auth logic duplication
- Backend is the single source of truth for authentication

## Troubleshooting

### Worker shows "Backend not configured"
**Problem**: `BACKEND_API_URL` not set in Cloudflare
**Solution**: 
```bash
wrangler secret put BACKEND_API_URL
# or set in Cloudflare Dashboard → Workers → Settings → Variables
```

### "Backend service unavailable" (502)
**Problem**: Backend is down or unreachable
**Check**:
1. Is backend running? Test directly: `curl https://your-backend/health`
2. Is URL correct? Check `BACKEND_API_URL` value
3. Firewall blocking? Ensure backend allows Cloudflare IPs

### Authentication failures
**Problem**: JWT validation failing
**Solution**: Ensure `JWT_KEY` is set correctly in the **backend** environment:
- Render: Check environment variables in dashboard
- VPS: Check `.env` file on server
- Must be at least 32 characters
- Must match what was used to create tokens

Note: Workers do NOT need JWT_KEY. It's only needed in the backend.

### Database not connected
**Problem**: Backend shows "database: disconnected"
**Check**:
1. `MONGODB_URI` set correctly in backend
2. MongoDB Atlas: IP whitelist includes backend IP (or use 0.0.0.0/0 for PaaS)
3. Network connectivity from backend to MongoDB

## Migration from Old Architecture

If upgrading from the previous Mongoose-in-Workers setup:

1. **Backup old files**: Already done (`.backup` files created)
2. **Remove polyfills**: No longer needed (workers don't use Node.js APIs)
3. **Remove build step**: `npm run build` no longer needed for Workers
4. **Update configs**: Wrangler configs already updated
5. **Deploy backend**: Follow deployment guide above
6. **Update secrets**: Set `BACKEND_API_URL` in Cloudflare
7. **Test thoroughly**: Run health checks and API tests

## Cost Analysis

### Before (Mongoose in Workers)
- Couldn't deploy (error 10021)
- Bundle size: 1-2MB per worker
- Free tier: Limited by bundle size

### After (Proxy Architecture)
- **Workers**: ~10-50KB each (stays in free tier)
  - Free tier: 100,000 requests/day
  - Paid tier: $0.50 per million requests
- **Backend hosting options**:
  - Render: $5-20/month
  - Render: $7/month (free tier available)
  - VPS: $5-10/month
  - AWS/GCP: Pay as you go

**Total cost**: ~$5-20/month for full stack with global edge distribution

## Recommended Backend Providers

### For Startups/MVPs
1. **Render** - Easy deployment, great DX
2. **Render** - Free tier available, good performance
3. **Fly.io** - Global distribution, edge hosting

### For Production
1. **AWS ECS/EKS** - Full control, scalable
2. **Google Cloud Run** - Serverless containers
3. **DigitalOcean App Platform** - Managed, predictable pricing

### For Enterprise
1. **Kubernetes** (any cloud)
2. **AWS Fargate** - Serverless containers
3. **Azure Container Apps**

## Future Enhancements

Possible improvements to consider:

1. **Worker-side caching**: Cache responses in KV or Cache API
2. **Request batching**: Batch multiple backend calls
3. **Circuit breaker**: Fail fast if backend is down
4. **Metrics & monitoring**: Add observability layer
5. **Rate limiting**: Implement at worker level
6. **A/B testing**: Route to different backends

## Conclusion

This proxy architecture solves the Mongoose incompatibility permanently while providing:
- Better reliability (no runtime hacks)
- Better performance (smaller workers, optimized backend)
- Better scalability (independent scaling)
- Better maintainability (clean separation of concerns)
- Industry-standard pattern (API gateway + backend)

**No more error 10021. Deploy with confidence.**
