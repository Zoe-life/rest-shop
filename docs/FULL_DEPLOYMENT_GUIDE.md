# Complete Deployment Guide: Dual-Backend + Frontend

This guide covers the complete deployment of the Rest Shop application with its dual-backend architecture (Node.js + Cloudflare Workers) and React frontend.

> **🚀 CI/CD Deployment**: This project includes automated deployment via GitHub Actions. For GitHub CI/CD setup, see the [GitHub Secrets & CI/CD Guide](./GITHUB_SECRETS_CICD_GUIDE.md).
> 
> This guide covers **manual deployment** for understanding the architecture and initial setup.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Rest Shop Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Cloudflare Pages)                                │
│  ├── React + TypeScript + Tailwind CSS                      │
│  └── Deployed to: https://your-app.pages.dev                │
│                          ↓                                    │
│  Edge Layer (Cloudflare Workers)                            │
│  ├── Lightweight HTTP proxy                                 │
│  ├── Global distribution                                     │
│  └── Deployed to: https://worker.your-domain.workers.dev    │
│                          ↓                                    │
│  Backend API (Node.js + Express + Mongoose)                 │
│  ├── Business logic + Database operations                   │
│  ├── Authentication + Payment processing                     │
│  └── Deployed to: Railway/Render/VPS                        │
│                          ↓                                    │
│  Database (MongoDB Atlas)                                    │
│  └── Cloud-hosted MongoDB                                    │
└─────────────────────────────────────────────────────────────┘
```

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Database Setup](#phase-1-database-setup)
3. [Phase 2: Backend Deployment](#phase-2-backend-deployment)
4. [Phase 3: Worker Deployment](#phase-3-worker-deployment)
5. [Phase 4: Frontend Deployment](#phase-4-frontend-deployment)
6. [Phase 5: Testing & Verification](#phase-5-testing--verification)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ installed locally
- Git installed
- GitHub account
- Cloudflare account (free tier works)
- MongoDB Atlas account (free tier works)
- Railway/Render account (free tier works) OR VPS access

## Phase 1: Database Setup

### Step 1.1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free M0 tier works fine)
3. Create a database user:
   - Username: `restshop`
   - Password: Generate a strong password
4. Configure Network Access:
   - Add IP: `0.0.0.0/0` (allow from anywhere for initial setup)
   - Later restrict to your backend server IPs for security
5. Get your connection string:
   ```
   mongodb+srv://restshop:<password>@cluster0.xxxxx.mongodb.net/
   ```

### Step 1.2: Test Connection

```bash
# Install MongoDB Compass (optional GUI tool)
# Or test connection from your backend locally
```

## Phase 2: Backend Deployment

Choose **ONE** of the following options:

### Option A: Railway (Recommended - Easiest)

#### 1. Sign up and prepare

- Go to [railway.app](https://railway.app)
- Sign in with GitHub
- Click "New Project"

#### 2. Deploy from GitHub

- Select "Deploy from GitHub repo"
- Select your `rest-shop` repository
- Select the `main` branch
- Railway will auto-detect the Node.js app

#### 3. Configure Root Directory

- Go to **Settings** → **Service Settings**
- Set **Root Directory**: `/api`
- Set **Start Command**: `node server.js`

#### 4. Configure Environment Variables

Go to **Variables** tab and add:

```bash
# Core Configuration
MONGODB_URI=mongodb+srv://restshop:<password>@cluster0.xxxxx.mongodb.net/
JWT_KEY=your_super_long_random_jwt_secret_at_least_32_characters
NODE_ENV=production
PORT=3001

# CORS - Update with your actual domains
ALLOWED_ORIGINS=https://your-frontend.pages.dev,https://worker.your-domain.workers.dev

# Email Service (Optional - for verification & password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=noreply@rest-shop.com
FRONTEND_URL=https://your-frontend.pages.dev

# Payment Gateways (Add as needed)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
```

#### 5. Deploy

- Railway will automatically deploy
- Get your URL: `https://rest-shop-production.up.railway.app`
- Test it: `curl https://your-url/health`

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "production"
}
```

### Option B: Render

#### 1. Create Web Service

- Go to [render.com](https://render.com)
- Click "New +" → "Web Service"
- Connect your GitHub repository

#### 2. Configure Service

- **Name**: `rest-shop-api`
- **Environment**: Node
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `api`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

#### 3. Add Environment Variables

Same as Railway above (see Option A, Step 4)

#### 4. Deploy

- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
- Get URL: `https://rest-shop-api.onrender.com`

### Option C: VPS (DigitalOcean, Linode, AWS EC2)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed VPS setup.

## Phase 3: Worker Deployment

The Cloudflare Worker acts as an edge proxy for global distribution.

### Step 3.1: Install Wrangler

```bash
npm install -g wrangler
```

### Step 3.2: Login to Cloudflare

```bash
wrangler login
```

### Step 3.3: Configure Backend URL

This is the **ONLY** secret the worker needs:

```bash
cd worker
wrangler secret put BACKEND_API_URL
# When prompted, enter: https://your-backend-url.railway.app
```

### Step 3.4: Update wrangler.toml

Edit `worker/wrangler.toml`:

```toml
name = "rest-shop-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

# You can customize the worker name
# It will be available at: https://rest-shop-worker.your-subdomain.workers.dev
```

### Step 3.5: Deploy Worker

```bash
cd worker
npm run deploy
```

You'll get a URL like:
```
https://rest-shop-worker.your-subdomain.workers.dev
```

### Step 3.6: Test Worker

```bash
curl https://rest-shop-worker.your-subdomain.workers.dev/health
```

Expected response:
```json
{
  "worker": "ok",
  "backend": {
    "status": "ok",
    "database": "connected"
  }
}
```

## Phase 4: Frontend Deployment

### Option A: Cloudflare Pages via Dashboard (Recommended)

#### 1. Go to Cloudflare Dashboard

- Navigate to **Workers & Pages**
- Click **Create application** → **Pages**
- Click **Connect to Git**

#### 2. Connect Repository

- Select your GitHub repository
- Click **Begin setup**

#### 3. Configure Build Settings

```
Project name: rest-shop-frontend
Production branch: main
Build command: cd frontend && npm install && npm run build
Build output directory: frontend/dist
Root directory: (leave empty)
```

#### 4. Add Environment Variables

Click **Environment variables** → **Add variable**:

```
REACT_APP_API_URL=https://rest-shop-worker.your-subdomain.workers.dev
```

**Important**: Use your Worker URL here, NOT the backend URL directly.

#### 5. Deploy

- Click **Save and Deploy**
- Wait 2-5 minutes for build and deployment
- Get your URL: `https://rest-shop-frontend.pages.dev`

### Option B: Using Wrangler CLI

```bash
cd frontend

# Build the app
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy build --project-name=rest-shop-frontend

# Set environment variable
wrangler pages secret put REACT_APP_API_URL --project-name=rest-shop-frontend
# Enter: https://rest-shop-worker.your-subdomain.workers.dev
```

## Phase 5: Testing & Verification

### Test 1: Frontend Access

Visit your frontend URL:
```
https://rest-shop-frontend.pages.dev
```

You should see the product listing page.

### Test 2: API Health Check

```bash
curl https://rest-shop-worker.your-subdomain.workers.dev/health
```

### Test 3: User Registration

```bash
curl -X POST https://rest-shop-worker.your-subdomain.workers.dev/user/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Test 4: User Login

```bash
curl -X POST https://rest-shop-worker.your-subdomain.workers.dev/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Test 5: Get Products

```bash
curl https://rest-shop-worker.your-subdomain.workers.dev/products
```

### Test 6: Full UI Flow

1. Visit frontend
2. Click "Sign Up"
3. Register a new account
4. Browse products
5. Check if theme toggle works
6. Test responsive design on mobile

## Custom Domain Setup

### For Worker

1. In Cloudflare Dashboard:
   - Workers & Pages → Your worker → Settings → Triggers
   - Add Custom Domain: `api.yourdomain.com`
   - Cloudflare configures SSL automatically

2. Update Frontend Environment Variable:
   ```
   REACT_APP_API_URL=https://api.yourdomain.com
   ```

### For Frontend

1. In Cloudflare Dashboard:
   - Workers & Pages → Your Pages project → Custom domains
   - Add Custom Domain: `shop.yourdomain.com` or `yourdomain.com`
   - Cloudflare configures SSL automatically

2. Update Backend CORS:
   ```
   ALLOWED_ORIGINS=https://shop.yourdomain.com,https://api.yourdomain.com
   ```

## Troubleshooting

### Backend Issues

#### Issue: "Database disconnected"

**Solutions:**
1. Check MongoDB Atlas IP whitelist
2. Verify `MONGODB_URI` is correct
3. Check backend logs: `railway logs` or via dashboard

#### Issue: Authentication fails

**Solutions:**
1. Ensure `JWT_KEY` is at least 32 characters
2. Verify it's set in backend environment (not worker)
3. Check CORS settings

### Worker Issues

#### Issue: "Backend not configured"

**Solution:**
```bash
wrangler secret put BACKEND_API_URL --config worker/wrangler.toml
```

#### Issue: "Backend service unavailable" (502)

**Solutions:**
1. Test backend directly: `curl https://your-backend-url/health`
2. Check if backend is running
3. Verify `BACKEND_API_URL` in worker secrets

### Frontend Issues

#### Issue: API requests failing

**Solutions:**
1. Check browser console for CORS errors
2. Verify `REACT_APP_API_URL` is set correctly
3. Ensure backend `ALLOWED_ORIGINS` includes frontend URL

#### Issue: Build fails

**Solutions:**
1. Ensure Node.js 18+ in build settings
2. Check build command includes `cd frontend`
3. Verify dependencies are installed

## Environment Variables Checklist

### Backend (Railway/Render)
- ✅ `MONGODB_URI`
- ✅ `JWT_KEY` (32+ characters)
- ✅ `NODE_ENV=production`
- ✅ `PORT=3001`
- ✅ `ALLOWED_ORIGINS` (comma-separated)
- ✅ Payment gateway keys (if using payments)

### Worker (Cloudflare)
- ✅ `BACKEND_API_URL` (your backend URL)

### Frontend (Cloudflare Pages)
- ✅ `REACT_APP_API_URL` (your worker URL)

## Cost Estimate

### Free Tier Setup
- **MongoDB Atlas**: Free (M0 - 512MB)
- **Railway**: Free ($5 credit/month)
- **Cloudflare Workers**: Free (100K requests/day)
- **Cloudflare Pages**: Free (unlimited static requests)
- **Total**: $0/month for low traffic

### Production Setup
- **MongoDB Atlas**: $9-30/month (M2-M10)
- **Railway**: $20-50/month (Pro tier)
- **Cloudflare Workers**: $5/month (Workers Paid)
- **Cloudflare Pages**: Free (included)
- **Total**: $34-85/month

## CI/CD Setup

The repository includes GitHub Actions for automatic deployment. To enable:

1. Add secrets in GitHub repository settings:
   ```
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   RAILWAY_TOKEN=your_railway_token (if using Railway)
   ```

2. Push to main branch - automatic deployment will trigger

## Monitoring & Maintenance

### Recommended Monitoring

1. **Backend**: Railway/Render built-in monitoring
2. **Worker**: Cloudflare Dashboard → Analytics
3. **Frontend**: Cloudflare Pages Analytics
4. **Database**: MongoDB Atlas monitoring

### Regular Maintenance

- Update dependencies monthly
- Review error logs weekly
- Monitor API usage
- Backup database regularly
- Review security advisories

## Support

For issues:
1. Check this guide first
2. Review [Troubleshooting](#troubleshooting) section
3. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for backend details
4. Check [frontend/README.md](../frontend/README.md) for frontend details
5. Open GitHub issue with error logs

## Success! 🎉

Your full-stack Rest Shop is now live with:
- ✅ Global CDN distribution
- ✅ Scalable backend
- ✅ Modern React frontend
- ✅ Automatic SSL/HTTPS
- ✅ Production-ready architecture
