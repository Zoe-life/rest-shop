# GitHub Secrets Configuration Guide

This guide explains how to configure GitHub Secrets for automatic deployment of the backend, worker, and frontend.

## Overview

The CI/CD pipeline uses GitHub Secrets to deploy:
1. **Backend** (Node.js API) - to Render
2. **Worker** (Cloudflare Worker) - to Cloudflare Workers
3. **Frontend** (React App) - to Cloudflare Pages

## Required GitHub Secrets

### 1. Cloudflare Secrets (for Worker & Frontend)

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token for Cloudflare deployments | [Create Token](https://dash.cloudflare.com/profile/api-tokens) → Use "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | [Dashboard](https://dash.cloudflare.com/) → Account Home → Account ID (right sidebar) |

### 2. Backend Deployment Secrets

#### Render

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `RENDER_DEPLOY_HOOK` | Render deploy webhook URL | Render Dashboard → Your Service → Settings → Deploy Hooks → Create Deploy Hook |

### 3. Application Configuration Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `BACKEND_API_URL` | URL where backend is deployed | `https://your-app.onrender.com` |
| `VITE_BACKEND_URL` | API URL for frontend to connect to | `https://your-worker.workers.dev` |
| `JWT_KEY` | JWT secret for authentication (32+ chars) | `your-super-secret-key-min-32-characters-long` |

### 4. Optional: Testing & Security Secrets

| Secret Name | Description | Required? |
|-------------|-------------|-----------|
| `SNYK_TOKEN` | Snyk security scanning | Optional |

## Step-by-Step Setup

### Step 1: Add Cloudflare Secrets

1. **Get Cloudflare API Token:**
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use "Edit Cloudflare Workers" template
   - Add permissions for "Cloudflare Pages" if deploying frontend
   - Click "Continue to summary" → "Create Token"
   - **Copy the token** (you won't see it again!)

2. **Get Cloudflare Account ID:**
   - Go to https://dash.cloudflare.com/
   - Click on any site or Workers & Pages
   - Your Account ID is in the right sidebar

3. **Add to GitHub:**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CLOUDFLARE_API_TOKEN`, Value: (paste token)
   - Click "Add secret"
   - Repeat for `CLOUDFLARE_ACCOUNT_ID`

### Step 2: Add Backend Deployment Secrets

#### Using Render:

1. **Get Deploy Hook:**
   - Go to your Render service dashboard
   - Settings → Deploy Hooks
   - Click "Create Deploy Hook"
   - Copy the webhook URL

2. **Add to GitHub:**
   - Add secret `RENDER_DEPLOY_HOOK` with the webhook URL

### Step 3: Add Application Configuration

1. **BACKEND_API_URL:**
   - Value: Your backend URL after deployment
   - Render: `https://your-app.onrender.com`
   - Render: `https://your-service.onrender.com`
   - If not deployed yet, deploy backend first, then add this secret

2. **VITE_BACKEND_URL:**
   - Value: Your worker URL (or backend URL for direct connection)
   - Worker: `https://rest-shop-api.your-subdomain.workers.dev`
   - Direct to backend: Use same as BACKEND_API_URL

3. **JWT_KEY:**
   - Value: Random string (minimum 32 characters)
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - **IMPORTANT:** Must be the same value used in your backend environment

### Step 4: Configure Backend Environment Variables

**Important:** Backend environment variables should be configured in your hosting platform (Render), not in GitHub Secrets!

#### Render Configuration:

Go to Render Dashboard → Your Service → Variables tab, add:

```bash
# Required
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
JWT_KEY=<same-as-github-secret-JWT_KEY>
NODE_ENV=production
PORT=3001

# CORS
ALLOWED_ORIGINS=https://your-worker.workers.dev,https://your-frontend.pages.dev
FRONTEND_URL=https://your-frontend.pages.dev

# Payment Gateways (if needed)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# See .env.example for complete list
```

#### Render Configuration:

Go to Render Dashboard → Your Service → Environment tab, add the same variables as above.

## Complete Secrets Checklist

### Required for All Deployments

- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] `BACKEND_API_URL` (after backend is deployed)
- [ ] `VITE_BACKEND_URL`
- [ ] `JWT_KEY`

### Required for Render Deployment

- [ ] `RENDER_DEPLOY_HOOK`

### Optional

- [ ] `SNYK_TOKEN` (for security scanning)

## Deployment Flow

### Initial Deployment Order:

1. **Deploy Backend First**
   ```bash
   # Render
   render up
   # or Render: Push to GitHub → Auto-deploy
   
   # Get backend URL: https://your-app.onrender.com
   ```

2. **Add BACKEND_API_URL Secret**
   - Add the backend URL to GitHub Secrets

3. **Push to Main Branch**
   ```bash
   git push origin main
   ```

4. **CI/CD Pipeline Runs:**
   - Tests backend
   - Deploys worker (with BACKEND_API_URL)
   - Deploys frontend (with VITE_BACKEND_URL)

### Subsequent Deployments:

Just push to main branch - everything deploys automatically!

```bash
git push origin main
```

## Troubleshooting

### Worker: "Backend not configured"

**Cause:** `BACKEND_API_URL` secret not set in GitHub.

**Fix:**
1. Ensure backend is deployed and accessible
2. Add `BACKEND_API_URL` secret in GitHub
3. Redeploy: Push to main or manually trigger workflow

### Frontend: Can't connect to API

**Cause:** `VITE_BACKEND_URL` is incorrect or not set.

**Fix:**
1. Check `VITE_BACKEND_URL` in GitHub Secrets
2. Should point to worker URL (or backend URL if not using worker)
3. Rebuild frontend after updating

### Backend: Environment variables not set

**Cause:** Secrets configured in GitHub instead of hosting platform.

**Fix:**
1. Go to Render dashboard
2. Add all backend environment variables there
3. Restart service

### CI/CD: Deployment fails

**Common issues:**
- Check GitHub Actions logs
- Verify all required secrets are added
- Check secret names match exactly (case-sensitive)
- Verify API tokens haven't expired

## Secrets Security Best Practices

### DO:

- Use GitHub Secrets for deployment credentials
- Configure backend secrets in hosting platform (Render)
- Rotate tokens periodically
- Use minimum required permissions
- Keep `JWT_KEY` secret and secure

### DON'T:

- Commit secrets to repository
- Share secrets in plain text
- Use production secrets in development
- Store backend secrets in GitHub (use hosting platform)
- Use weak JWT keys (< 32 characters)

## Verifying Secrets

### Check GitHub Secrets:

1. Go to repository → Settings → Secrets and variables → Actions
2. Verify all required secrets are listed
3. Note: You can't view secret values, only names

### Check Backend Configuration:

```bash
# Render
render variables

# Render
# Check in dashboard → Environment tab
```

### Test Deployments:

```bash
# Test backend
curl https://your-backend-url/health

# Test worker
curl https://your-worker-url/health

# Test frontend
# Open in browser: https://your-frontend.pages.dev
```

## Environment Variables Reference

### Backend (Render Dashboard)

**Set these in your hosting platform:**

```bash
# Core
MONGODB_URI=mongodb+srv://...
JWT_KEY=...
NODE_ENV=production
PORT=3001

# CORS
ALLOWED_ORIGINS=https://worker.dev,https://frontend.dev
FRONTEND_URL=https://frontend.dev

# Payment (optional)
STRIPE_SECRET_KEY=...
PAYPAL_CLIENT_ID=...
MPESA_CONSUMER_KEY=...

# OAuth (optional)
GOOGLE_CLIENT_ID=...
MICROSOFT_CLIENT_ID=...
```

### Worker (Cloudflare - Set via CI/CD)

**Set in GitHub Secrets, CI/CD configures Cloudflare:**

```bash
BACKEND_API_URL=https://your-backend-url
```

### Frontend (Vite - Built into bundle)

**Set in GitHub Secrets, injected at build time:**

```bash
VITE_BACKEND_URL=https://your-worker-url
```

## Quick Reference Table

| Component | Where to Set | How |
|-----------|--------------|-----|
| **Backend** | Render Dashboard | Manual in UI |
| **Worker** | GitHub Secrets → Cloudflare | CI/CD pipeline |
| **Frontend** | GitHub Secrets → Build | CI/CD pipeline |

## Support

If you encounter issues:

1. Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review [CI/CD Guide](./GITHUB_SECRETS_CICD_GUIDE.md)
3. Check GitHub Actions logs
4. Verify all secrets are correctly named and set

## Summary

**Key Points:**

1. Use GitHub Secrets for deployment credentials (Cloudflare tokens, Render tokens)
2. Use hosting platform UI for backend environment variables
3. `BACKEND_API_URL` connects worker to backend
4. `VITE_BACKEND_URL` connects frontend to API
5. Deploy backend first, then add its URL to GitHub Secrets
6. Push to main → Everything deploys automatically

**Quick Setup:**
```bash
# 1. Deploy backend → Get URL
# 2. Add all GitHub Secrets
# 3. Configure backend environment in Render
# 4. Push to main
git push origin main
# 5. Done! CI/CD handles the rest
```
