# How to Connect the Worker to the Node.js Backend

## Overview

This guide explains **exactly** how to connect the Cloudflare Worker (edge proxy) to the Node.js backend so they can communicate with each other.

## Architecture Quick Recap

```
┌─────────────────────┐
│  Client/Frontend    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Cloudflare Worker          │  ← Needs BACKEND_API_URL
│  (Edge Proxy)               │
└──────────┬──────────────────┘
           │ HTTP Requests
           ▼
┌─────────────────────────────┐
│  Node.js Backend            │  ← Needs to be accessible
│  (Express + Mongoose)       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  MongoDB Database           │
└─────────────────────────────┘
```

**The Key Connection Point**: The worker needs to know the URL of the Node.js backend through the `BACKEND_API_URL` environment variable.

---

## Quick Start Guide

### Option 1: Local Development (Simplest)

If you're just developing locally, **you can skip the worker entirely** and just use the Node.js backend directly:

```bash
# Terminal 1: Start the Node.js backend
cd /path/to/rest-shop
npm start

# Backend will run on http://localhost:3001
# Your frontend can connect directly to: http://localhost:3001
```

**Done!** No worker configuration needed for local development.

---

### Option 2: Local Development with Worker

If you want to test the worker locally:

**Step 1: Start the Node.js Backend**
```bash
# Terminal 1
cd /path/to/rest-shop
npm start

# Backend now running on http://localhost:3001
```

**Step 2: Configure Worker for Local Backend**

Edit `worker/wrangler.toml` and add to the `[vars]` section:

```toml
[vars]
NODE_ENV = "production"
PORT = "3001"
BACKEND_API_URL = "http://localhost:3001"  # ← ADD THIS LINE
```

**Step 3: Start the Worker**
```bash
# Terminal 2
cd worker
npx wrangler dev

# Worker now running on http://localhost:8787 (or similar)
# It will proxy all requests to http://localhost:3001
```

**Step 4: Test the Connection**
```bash
# Test the worker health endpoint
curl http://localhost:8787/health

# Expected response:
# {
#   "worker": "ok",
#   "backend": {
#     "status": "ok",
#     "database": "connected"
#   },
#   "timestamp": "..."
# }
```

---

## Production Deployment Guide

For production, you need to:
1. Deploy the Node.js backend to a hosting provider
2. Configure the worker with the backend URL
3. Deploy the worker to Cloudflare

### Step 1: Deploy Node.js Backend

Choose one of these hosting providers:

#### Option A: Railway (Recommended - Easy)

1. **Sign up at [railway.app](https://railway.app)**

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `rest-shop` repository
   - Select the `api` directory (or root if your backend is in root)

3. **Configure Environment Variables**
   
   In Railway Dashboard → Your Project → Variables tab, add:

   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   JWT_KEY=your_super_long_random_jwt_secret_at_least_32_chars
   NODE_ENV=production
   PORT=3001
   ALLOWED_ORIGINS=https://yourdomain.com,https://your-worker.workers.dev
   FRONTEND_URL=https://yourdomain.com
   
   # Add your payment gateway keys
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   # ... etc (see .env.example for all options)
   ```

4. **Deploy**
   - Railway automatically deploys
   - Note your backend URL: `https://your-app.railway.app`
   - ⚠️ **Save this URL** - you'll need it in Step 2

5. **Test Your Backend**
   ```bash
   curl https://your-app.railway.app/health
   
   # Expected: {"status":"ok","database":"connected"}
   ```

#### Option B: Render

1. **Sign up at [render.com](https://render.com)**

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - Name: `rest-shop-backend`
     - Environment: `Node`
     - Build Command: `cd api && npm install` (or just `npm install`)
     - Start Command: `cd api && npm start` (or just `npm start`)

3. **Add Environment Variables**
   - Same variables as Railway (see above)

4. **Deploy**
   - Render automatically deploys
   - Note your backend URL: `https://rest-shop-backend.onrender.com`
   - ⚠️ **Save this URL** - you'll need it in Step 2

#### Option C: VPS (DigitalOcean, AWS, etc.)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone your repo
git clone https://github.com/your-username/rest-shop.git
cd rest-shop

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env  # Add your environment variables

# Start with PM2
cd api  # if your backend is in api/
pm2 start server.js --name rest-shop-api
pm2 save
pm2 startup  # Follow instructions

# Your backend is now running on your server
# Make sure it's accessible via HTTP/HTTPS (configure nginx/firewall as needed)
```

Your backend URL will be: `http://your-server-ip:3001` or `https://api.yourdomain.com` (if you configured a domain)

---

### Step 2: Configure Worker with Backend URL

Now that your backend is running, tell the worker where to find it:

#### Method A: Using Wrangler CLI (Recommended for Production)

```bash
# Navigate to worker directory
cd worker

# Set the BACKEND_API_URL secret
npx wrangler secret put BACKEND_API_URL

# When prompted, enter your backend URL:
# For Railway: https://your-app.railway.app
# For Render: https://rest-shop-backend.onrender.com
# For VPS: https://api.yourdomain.com (or http://your-server-ip:3001)

# Press Enter
```

✅ **The worker now knows where to find your backend!**

#### Method B: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Workers & Pages** → Your Worker → **Settings** → **Variables**
3. Click "Add variable"
4. Type: **Secret** (use encrypted secret, not plain text variable)
5. Name: `BACKEND_API_URL`
6. Value: Your backend URL (e.g., `https://your-app.railway.app`)
7. Click "Save"

---

### Step 3: Deploy Worker to Cloudflare

```bash
# Make sure you're in the worker directory
cd worker

# Login to Cloudflare (if not already logged in)
npx wrangler login

# Deploy the worker
npx wrangler deploy

# Output will show your worker URL:
# ✅ Published rest-shop-api (1.23s)
#    https://rest-shop-api.your-subdomain.workers.dev
```

---

### Step 4: Test the Connection

```bash
# Test the worker's health endpoint
curl https://rest-shop-api.your-subdomain.workers.dev/health

# Expected response:
{
  "worker": "ok",
  "backend": {
    "status": "ok",
    "database": "connected",
    "environment": "production"
  },
  "timestamp": "2026-02-10T..."
}

# Test a real API endpoint
curl https://rest-shop-api.your-subdomain.workers.dev/products

# Should return your products list
```

**✅ Success!** Your worker is now connected to your backend!

---

## Troubleshooting

### Problem: "Backend not configured" Error

**Error message:**
```json
{
  "error": {
    "message": "Backend API URL not configured",
    "code": "BACKEND_NOT_CONFIGURED"
  }
}
```

**Solution:** The `BACKEND_API_URL` is not set in the worker.

**Fix:**
```bash
cd worker
npx wrangler secret put BACKEND_API_URL
# Enter your backend URL when prompted
```

---

### Problem: "Backend service unavailable" (502 Error)

**Error message:**
```json
{
  "error": {
    "message": "Backend service unavailable",
    "code": "BACKEND_ERROR"
  }
}
```

**Possible causes:**

1. **Backend is not running**
   - Check: `curl https://your-backend-url/health`
   - If it fails, restart your backend

2. **Wrong backend URL**
   - Check the URL you set in `BACKEND_API_URL`
   - Make sure it's accessible from Cloudflare Workers
   - Try accessing it in your browser

3. **Firewall blocking Cloudflare**
   - If using VPS, ensure port 3001 (or your port) is open
   - Whitelist Cloudflare IP ranges if needed

4. **Backend crashed**
   - Check backend logs:
     - Railway: `railway logs`
     - Render: Check logs in dashboard
     - VPS: `pm2 logs rest-shop-api`

**Fix:**
```bash
# Verify backend is accessible
curl https://your-backend-url/health

# If it works directly but not through worker, check BACKEND_API_URL:
cd worker
npx wrangler secret put BACKEND_API_URL
# Re-enter the correct URL
```

---

### Problem: CORS Errors

**Error in browser console:**
```
Access to fetch at 'https://worker-url' from origin 'https://frontend-url' 
has been blocked by CORS policy
```

**Solution:** Update `ALLOWED_ORIGINS` in your **backend** environment variables:

**Railway/Render Dashboard:**
```bash
ALLOWED_ORIGINS=https://your-frontend.com,https://your-worker.workers.dev,http://localhost:3000
```

**VPS .env file:**
```bash
# Edit .env on your server
ALLOWED_ORIGINS=https://your-frontend.com,https://your-worker.workers.dev

# Restart backend
pm2 restart rest-shop-api
```

---

### Problem: "Database disconnected"

**In health check response:**
```json
{
  "backend": {
    "status": "ok",
    "database": "disconnected"
  }
}
```

**This is a backend issue, not a worker issue.**

**Solution:** Fix MongoDB connection in backend:

1. **Check MONGODB_URI in backend environment**
   - Railway/Render: Check dashboard
   - VPS: Check `.env` file

2. **Check MongoDB Atlas IP whitelist**
   - Go to MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (allow all) or your backend's IP
   - For Railway/Render: Use `0.0.0.0/0` (they use dynamic IPs)

3. **Restart backend**
   - Railway: Automatic on config change
   - Render: Automatic on config change
   - VPS: `pm2 restart rest-shop-api`

---

## Configuration Verification Checklist

Use this checklist to verify your setup:

### Backend Configuration

- Backend is deployed and running
- `curl https://your-backend-url/health` returns `{"status":"ok"}`
- Environment variables are set:
  - `MONGODB_URI`
  - `JWT_KEY` (32+ characters)
  - `NODE_ENV=production`
  - `ALLOWED_ORIGINS` (includes worker URL)
- MongoDB connection is working (database: "connected")

### Worker Configuration

- Worker is deployed to Cloudflare
- `BACKEND_API_URL` secret is set in Cloudflare
- `BACKEND_API_URL` points to your backend (e.g., https://your-app.railway.app)
- `curl https://your-worker.workers.dev/health` returns worker and backend status

### Connection Test

- Health check shows both worker and backend are ok
- API endpoints work through worker: `curl https://your-worker.workers.dev/products`
- No CORS errors when accessing from frontend

---

## Multiple Workers Setup

If you're using the microservices architecture with multiple workers:

### Workers Configuration

You have 3 workers that need configuration:

1. **Base Service** (`wrangler.toml`) - Products, Orders, Users, Auth
2. **Payment Service** (`wrangler-payments.toml`) - Payments
3. **Gateway** (`wrangler-gateway.toml`) - Main entry point

**All three workers need the same `BACKEND_API_URL`:**

```bash
# Set backend URL for base service
npx wrangler secret put BACKEND_API_URL --config wrangler.toml
# Enter: https://your-backend-url

# Set backend URL for payment service  
npx wrangler secret put BACKEND_API_URL --config wrangler-payments.toml
# Enter: https://your-backend-url

# Gateway doesn't need it (it routes to other workers)
```

### Deploy All Workers

```bash
# From project root
npm run deploy:all

# Or deploy individually
npm run deploy:base       # Base service
npm run deploy:payments   # Payment service
npm run deploy:gateway    # Gateway
```

---

## Environment Variables Summary

### What Goes Where?

#### Backend Environment Variables (Railway/Render/VPS)

**Set these in your backend hosting platform:**

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Security
JWT_KEY=your_long_random_secret_32_chars_minimum
NODE_ENV=production
PORT=3001

# CORS
ALLOWED_ORIGINS=https://frontend.com,https://worker.workers.dev
FRONTEND_URL=https://frontend.com

# Payment Gateways (examples)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# ... see .env.example for complete list
```

#### Worker Environment Variables (Cloudflare)

**Set these in Cloudflare (via wrangler or dashboard):**

```bash
# ONLY ONE VARIABLE NEEDED:
BACKEND_API_URL=https://your-backend-url
```

**That's it!** Workers only need to know where the backend is. All other secrets stay in the backend.

---

## Security Best Practices

### DO

- Set `BACKEND_API_URL` in Cloudflare as a **secret** (encrypted)
- Set all sensitive keys (JWT, payment keys) in **backend environment** only
- Use HTTPS for backend URL in production
- Use specific domains in `ALLOWED_ORIGINS`, not wildcards
- Keep `JWT_KEY` at least 32 characters long

### DON'T

- Don't set payment keys or JWT_KEY in Cloudflare Workers
- Don't forward secrets from worker to backend via headers
- Don't use HTTP (not HTTPS) for backend in production
- Don't use `*` (wildcard) in CORS origins in production
- Don't commit `.env` files to git

---

## Quick Reference

### Essential Commands

```bash
# Start backend locally
npm start

# Start worker locally
cd worker && npx wrangler dev

# Set backend URL for worker
cd worker && npx wrangler secret put BACKEND_API_URL

# Deploy worker
cd worker && npx wrangler deploy

# Check backend health
curl https://your-backend-url/health

# Check worker health (tests connection to backend)
curl https://your-worker.workers.dev/health
```

### Essential URLs

- **Backend URL**: Where your Node.js + Express + MongoDB runs
  - Example: `https://your-app.railway.app`
  - Must be accessible from Cloudflare Workers
  - Must respond to `/health` endpoint

- **Worker URL**: Where your Cloudflare Worker runs
  - Example: `https://rest-shop-api.your-subdomain.workers.dev`
  - Proxies all requests to backend
  - Can be accessed globally from edge locations

- **Frontend URL**: Where your React app runs
  - Example: `https://rest-shop-frontend.pages.dev`
  - Connects to worker URL (not directly to backend)

---

## Next Steps

After connecting your backends:

1. **Test thoroughly**
   - Try all API endpoints
   - Test authentication flow
   - Test payment processing

2. **Configure custom domain** (optional)
   - Add custom domain in Cloudflare Dashboard
   - Point frontend to custom domain

3. **Set up monitoring**
   - Railway/Render have built-in monitoring
   - Consider adding Sentry or similar for error tracking

4. **Enable CI/CD**
   - GitHub Actions workflows already configured
   - Add necessary secrets to GitHub repository

---

## Still Having Issues?

1. **Check existing documentation:**
   - [Deployment Guide](./DEPLOYMENT_GUIDE.md)
   - [Architecture Guide](./CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md)
   - [Troubleshooting](./TROUBLESHOOTING.md)

2. **Common issues:**
   - Backend not accessible → Check hosting provider status
   - Worker can't reach backend → Verify `BACKEND_API_URL` is correct
   - Database issues → Check MongoDB Atlas configuration
   - CORS errors → Update `ALLOWED_ORIGINS` in backend

3. **Debug checklist:**
   - [ ] Can you access backend directly? `curl https://backend/health`
   - [ ] Is `BACKEND_API_URL` set in worker? Check Cloudflare dashboard
   - [ ] Are both deployed? Check deployment status
   - [ ] Check logs (backend logs + Cloudflare worker logs)

---

## Summary

**The key to connecting the worker to the Node.js backend is:**

1. **Deploy your Node.js backend** to a hosting provider (Railway, Render, VPS, etc.)
2. **Get the backend URL** (e.g., `https://your-app.railway.app`)
3. **Set `BACKEND_API_URL`** in Cloudflare Worker with that URL
4. **Deploy the worker** and test the `/health` endpoint

That's it! The worker will proxy all requests to your backend, and your backend handles all the actual work with MongoDB.

**Simple mental model:**
```
Frontend → Worker (knows BACKEND_API_URL) → Backend (does the actual work) → MongoDB
```

Happy deploying!
