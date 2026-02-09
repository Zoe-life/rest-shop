# GitHub Secrets and CI/CD Setup Guide

This guide explains how to configure GitHub Secrets and set up automated deployment using GitHub Actions for the Rest Shop application.

## Table of Contents

1. [Overview](#overview)
2. [GitHub Secrets Setup](#github-secrets-setup)
3. [Cloudflare Secrets Setup](#cloudflare-secrets-setup)
4. [Backend Deployment (Railway/Render)](#backend-deployment-railwayrender)
5. [CI/CD Pipeline Flow](#cicd-pipeline-flow)
6. [Testing the Pipeline](#testing-the-pipeline)
7. [Troubleshooting](#troubleshooting)

## Overview

The deployment uses a multi-tier approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  GitHub Actions (CI/CD)                                          │
│  ├── Lint, Test, Security Scan                                  │
│  ├── Deploy Worker → Cloudflare Workers                         │
│  └── Deploy Frontend → Cloudflare Pages                         │
│                                                                   │
│  Backend API (Manual/Separate CI/CD)                            │
│  └── Deployed to: Railway/Render/VPS                            │
│      - Uses Railway/Render environment variables                │
│      - Not deployed via GitHub Actions                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- **Frontend & Worker**: Deployed automatically via GitHub Actions
- **Backend API**: Deployed separately via Railway/Render (they auto-deploy on git push)
- **Secrets**: Split between GitHub (for CI/CD) and Cloudflare/Railway (for runtime)

## GitHub Secrets Setup

### Step 1: Access GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2: Add Required Secrets

#### For Cloudflare Deployment

##### 1. `CLOUDFLARE_API_TOKEN`

**How to get it:**
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use template: **Edit Cloudflare Workers**
5. Customize:
   - **Permissions**: 
     - Account → Cloudflare Pages → Edit
     - Account → Workers Scripts → Edit
   - **Account Resources**: Include → Your Account
   - **Zone Resources**: Include → All zones
6. Click **Continue to summary** → **Create Token**
7. Copy the token (you won't see it again!)

**Add to GitHub:**
- Name: `CLOUDFLARE_API_TOKEN`
- Secret: `[paste your token]`

##### 2. `CLOUDFLARE_ACCOUNT_ID`

**How to get it:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on **Workers & Pages** in the sidebar
3. Your Account ID is displayed on the right side
4. Or find it in the URL: `dash.cloudflare.com/[ACCOUNT_ID]/workers`

**Add to GitHub:**
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Secret: `[your account ID]`

##### 3. `REACT_APP_API_URL`

This is the URL where your Cloudflare Worker will be deployed.

**Add to GitHub:**
- Name: `REACT_APP_API_URL`
- Secret: `https://rest-shop-worker.your-subdomain.workers.dev`

**Note**: You'll update this after first deploying the worker. Initial deployment can use a placeholder.

#### Optional: For Testing

##### 4. `JWT_KEY` (Optional - for tests)

**Add to GitHub:**
- Name: `JWT_KEY`
- Secret: `test_jwt_key_for_ci_testing_only_minimum_32_chars`

This is only used in CI tests and is different from your production JWT_KEY.

### Summary of GitHub Secrets

```
Required Secrets:
✅ CLOUDFLARE_API_TOKEN     - Cloudflare API token for deployments
✅ CLOUDFLARE_ACCOUNT_ID    - Your Cloudflare account ID
✅ REACT_APP_API_URL        - Worker URL for frontend to connect to

Optional Secrets:
⚪ JWT_KEY                  - Only for CI tests (not production)
⚪ SNYK_TOKEN               - For Snyk security scanning
```

## Cloudflare Secrets Setup

Cloudflare Workers need runtime secrets configured separately (not in GitHub Actions).

### Worker Secrets (One-Time Setup)

The Worker only needs **ONE** secret: the backend API URL.

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set the backend URL secret
cd worker
wrangler secret put BACKEND_API_URL
# When prompted, enter: https://your-backend.railway.app
```

**Important**: 
- This secret persists in Cloudflare
- GitHub Actions will NOT override it
- Only needs to be set once (unless you change backend URL)
- Do NOT put this in GitHub Secrets

### Verify Worker Secrets

```bash
cd worker
wrangler secret list
```

Expected output:
```
┌─────────────────┬────────────────────────┐
│ Name            │ Value                  │
├─────────────────┼────────────────────────┤
│ BACKEND_API_URL │ (encrypted)            │
└─────────────────┴────────────────────────┘
```

## Backend Deployment (Railway/Render)

The backend is **NOT** deployed via GitHub Actions. Instead, it uses Railway/Render's built-in CI/CD.

### Railway Setup

1. **Connect GitHub Repository**:
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repo
   - Select your repository

2. **Configure Service**:
   - Root Directory: `/api`
   - Start Command: `node server.js`

3. **Add Environment Variables in Railway Dashboard**:

```bash
# Core Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
JWT_KEY=your_super_long_random_jwt_secret_at_least_32_characters
NODE_ENV=production
PORT=3001

# CORS - Update after deploying frontend
ALLOWED_ORIGINS=https://rest-shop-frontend.pages.dev

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=noreply@rest-shop.com
FRONTEND_URL=https://rest-shop-frontend.pages.dev

# Payment Gateways (Optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
```

4. **Enable Auto-Deploy**:
   - Railway automatically deploys on push to `main` branch
   - No GitHub Actions needed for backend

5. **Get Backend URL**:
   - After deployment, copy your Railway URL
   - Example: `https://rest-shop-production.up.railway.app`
   - Use this URL in Cloudflare Worker's `BACKEND_API_URL` secret

### Render Setup

Similar process to Railway:

1. Create Web Service from GitHub
2. Set Root Directory: `api`
3. Add environment variables (same as Railway above)
4. Enable auto-deploy on push

## CI/CD Pipeline Flow

### On Every Push (PR or Main)

```
1. Lint & Code Quality
   └─→ Check code style
   └─→ Run security audit

2. Security Scanning
   └─→ Snyk scan
   └─→ npm audit
   └─→ CodeQL analysis

3. Testing
   └─→ Run all tests
   └─→ Use in-memory MongoDB

4. Build Verification
   └─→ Build Worker
   └─→ Build Frontend
   └─→ Validate configurations
```

### On Push to Main Branch (Production Deployment)

```
5. Deploy Worker
   └─→ Deploy to Cloudflare Workers
   └─→ Uses existing BACKEND_API_URL secret

6. Deploy Frontend
   └─→ Build with REACT_APP_API_URL
   └─→ Deploy to Cloudflare Pages
   └─→ Automatic SSL/HTTPS

Backend (Parallel)
   └─→ Railway/Render auto-deploys
   └─→ Independent of GitHub Actions
```

## Testing the Pipeline

### Initial Setup Test

1. **First, deploy backend manually**:
   ```bash
   # Push to Railway/Render
   git push origin main
   # Railway/Render will auto-deploy
   # Get your backend URL: https://your-app.railway.app
   ```

2. **Configure Worker secret**:
   ```bash
   cd worker
   wrangler secret put BACKEND_API_URL
   # Enter: https://your-app.railway.app
   ```

3. **Update GitHub Secret**:
   - After worker deploys, note the worker URL
   - Update `REACT_APP_API_URL` secret in GitHub
   - Use worker URL: `https://rest-shop-worker.your-subdomain.workers.dev`

4. **Trigger deployment**:
   ```bash
   git push origin main
   ```

### Manual Workflow Trigger

You can manually trigger the workflow:

1. Go to **Actions** tab in GitHub
2. Select **CI/CD Pipeline**
3. Click **Run workflow** → **Run workflow**

### Check Deployment Status

1. **GitHub Actions**:
   - Go to **Actions** tab
   - View workflow runs and logs

2. **Cloudflare Worker**:
   ```bash
   curl https://your-worker-url.workers.dev/health
   ```

3. **Cloudflare Pages**:
   - Visit: `https://rest-shop-frontend.pages.dev`
   - Or check Cloudflare Dashboard → Workers & Pages

4. **Backend**:
   ```bash
   curl https://your-backend-url.railway.app/health
   ```

## Deployment Sequence

Follow this exact sequence for first-time deployment:

### 1. Deploy Backend First
```bash
# Push to Railway/Render
git push origin main
# Wait for deployment
# Get URL: https://your-backend.railway.app
```

### 2. Configure Worker Secret
```bash
wrangler secret put BACKEND_API_URL
# Enter backend URL
```

### 3. First GitHub Actions Deploy
```bash
# Push to trigger CI/CD
git push origin main
# Worker deploys
# Get worker URL from Actions logs or Cloudflare dashboard
```

### 4. Update Frontend Secret
```bash
# In GitHub Secrets, update:
REACT_APP_API_URL=https://rest-shop-worker.your-subdomain.workers.dev
```

### 5. Re-deploy Frontend
```bash
# Push again or use manual trigger
git push origin main
# Frontend now connects to correct worker URL
```

### 6. Update CORS
```bash
# In Railway/Render dashboard, update:
ALLOWED_ORIGINS=https://rest-shop-frontend.pages.dev,https://rest-shop-worker.your-subdomain.workers.dev
# Railway/Render will auto-redeploy
```

## Environment Variables Summary

### GitHub Secrets (for CI/CD)
```
CLOUDFLARE_API_TOKEN          → For deploying to Cloudflare
CLOUDFLARE_ACCOUNT_ID         → Your Cloudflare account
REACT_APP_API_URL            → Worker URL (for frontend builds)
JWT_KEY (optional)           → For CI tests only
```

### Cloudflare Worker Secrets (Runtime)
```
BACKEND_API_URL              → Node.js backend URL
```

### Railway/Render Environment Variables (Runtime)
```
MONGODB_URI                  → Database connection
JWT_KEY                      → Production JWT secret
NODE_ENV                     → production
PORT                         → 3001
ALLOWED_ORIGINS              → Frontend and worker URLs
STRIPE_SECRET_KEY            → (if using Stripe)
PAYPAL_CLIENT_ID             → (if using PayPal)
[...other payment/email configs]
```

## Troubleshooting

### Issue: GitHub Actions fails to deploy

**Check:**
1. Are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set?
2. Does the API token have correct permissions?
3. Check Actions logs for specific error

### Issue: Worker shows "Backend not configured"

**Solution:**
```bash
wrangler secret put BACKEND_API_URL
# Enter your Railway/Render URL
```

### Issue: Frontend can't connect to API

**Check:**
1. Is `REACT_APP_API_URL` set in GitHub Secrets?
2. Does it point to the worker URL (not backend directly)?
3. Is CORS configured in backend?

### Issue: Backend not deploying

**Remember:**
- Backend is NOT deployed via GitHub Actions
- Railway/Render deploy automatically on push
- Check Railway/Render dashboard for logs

### Issue: Worker deploys but returns 502

**Check:**
1. Is backend running? `curl https://your-backend-url/health`
2. Is `BACKEND_API_URL` correct in worker?
3. Check backend logs in Railway/Render

## Security Best Practices

### DO:
- ✅ Use separate secrets for CI/CD and production
- ✅ Rotate API tokens periodically
- ✅ Use minimal permissions for tokens
- ✅ Keep production secrets in Railway/Render/Cloudflare only
- ✅ Use different JWT_KEY for CI tests vs production

### DON'T:
- ❌ Don't put production secrets in GitHub Actions
- ❌ Don't share secrets between environments
- ❌ Don't commit secrets to git
- ❌ Don't use the same JWT_KEY for tests and production

## Continuous Deployment

Once set up, deployment is automatic:

1. **Push to main** → Full deployment pipeline runs
2. **Backend** → Railway/Render auto-deploys
3. **Worker** → GitHub Actions deploys
4. **Frontend** → GitHub Actions builds and deploys

**Zero manual intervention needed!**

## Support

For issues:
1. Check GitHub Actions logs
2. Check Cloudflare dashboard logs
3. Check Railway/Render logs
4. Review this guide
5. Open GitHub issue with logs

## Quick Reference Card

```bash
# GitHub Secrets (Settings → Secrets → Actions)
CLOUDFLARE_API_TOKEN=cf_token_here
CLOUDFLARE_ACCOUNT_ID=account_id_here
REACT_APP_API_URL=https://worker-url.workers.dev

# Cloudflare Worker Secret (via Wrangler)
wrangler secret put BACKEND_API_URL
> https://backend-url.railway.app

# Railway/Render Environment Variables
MONGODB_URI=mongodb+srv://...
JWT_KEY=long_random_string_32_chars
NODE_ENV=production
ALLOWED_ORIGINS=https://frontend.pages.dev

# Test Everything
curl https://backend-url/health
curl https://worker-url/health
open https://frontend.pages.dev
```
