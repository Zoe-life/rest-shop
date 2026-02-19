# GitHub Secrets Configuration Guide

This guide explains how to configure GitHub Secrets for automatic deployment of the backend, worker, and frontend.

**All environment variables are managed exclusively through GitHub Secrets.** The CI/CD pipeline automatically syncs them to Render (backend) and Cloudflare (worker/frontend) on every deployment — no manual configuration in external dashboards is required.

## Overview

The CI/CD pipeline uses GitHub Secrets to deploy:
1. **Backend** (Node.js API) - to Render
2. **Worker** (Cloudflare Worker) - to Cloudflare Workers
3. **Frontend** (React App) - to Cloudflare Pages

## Required GitHub Secrets

### 1. Cloudflare Secrets (for Worker & Frontend)

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token for Cloudflare deployments | [Create Token](https://dash.cloudflare.com/profile/api-tokens) → Use "Edit Cloudflare Workers" template, also add "Cloudflare Pages: Edit" permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | [Dashboard](https://dash.cloudflare.com/) → Account ID shown in the right sidebar of the main page |

### 2. Render Deployment Secrets

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `RENDER_DEPLOY_HOOK` | Webhook URL to trigger a new Render deployment | See [How to get RENDER_DEPLOY_HOOK](#how-to-get-render_deploy_hook) below |
| `RENDER_API_KEY` | Render API key (used to sync env vars from GitHub Secrets) | See [How to get RENDER_API_KEY](#how-to-get-render_api_key) below |
| `RENDER_SERVICE_ID` | Your Render service ID | See [How to get RENDER_SERVICE_ID](#how-to-get-render_service_id) below |

### 3. Backend Application Secrets

These are synced automatically from GitHub Secrets to Render on every deploy:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/` |
| `JWT_KEY` | JWT secret for authentication (32+ chars) | `your-super-secret-key-min-32-characters-long` |
| `BACKEND_API_URL` | URL where the backend is deployed | `https://your-app.onrender.com` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `https://your-worker.workers.dev,https://your-frontend.pages.dev` |
| `FRONTEND_URL` | Frontend URL for redirects | `https://your-frontend.pages.dev` |

### 4. Worker & Frontend Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VITE_BACKEND_URL` | API URL injected into the frontend at build time | `https://your-worker.workers.dev` |

### 5. Optional Application Secrets

Add any of these to GitHub Secrets as needed — only non-empty ones are synced to Render:

| Secret Name | Description |
|-------------|-------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth credentials |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe payment keys |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal payment keys |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_CALLBACK_URL` | M-Pesa keys |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary media storage |
| `SNYK_TOKEN` | Snyk security scanning |

---

## How to Get Each Secret

### How to get RENDER_DEPLOY_HOOK

A deploy hook is a unique webhook URL that triggers a new deployment on your Render service when called.

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click on **your backend service** (e.g., `rest-shop-backend`)
3. Go to **Settings** tab
4. Scroll down to **Deploy Hooks**
5. Click **Create Deploy Hook**
6. Give it a name (e.g., `github-actions`)
7. Click **Create**
8. **Copy the generated URL** — it looks like:
   `https://api.render.com/deploy/srv-xxxxxxxxxxxx?key=yyyyyyyy`
9. Add it to GitHub Secrets as `RENDER_DEPLOY_HOOK`

### How to get RENDER_API_KEY

The Render API key allows the CI/CD pipeline to update your backend's environment variables automatically from GitHub Secrets.

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click your **profile avatar** (top right) → **Account Settings**
3. Scroll to **API Keys**
4. Click **Create API Key**
5. Give it a name (e.g., `github-actions`)
6. **Copy the key immediately** (it won't be shown again)
7. Add it to GitHub Secrets as `RENDER_API_KEY`

### How to get RENDER_SERVICE_ID

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click on **your backend service**
3. Go to **Settings** tab
4. Look for **Service ID** near the top — it starts with `srv-`
   (e.g., `srv-abc123def456`)
5. Copy it and add it to GitHub Secrets as `RENDER_SERVICE_ID`

---

## Step-by-Step Setup

### Step 1: Add Cloudflare Secrets

1. **Get Cloudflare API Token:**
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use "Edit Cloudflare Workers" template
   - Add permission: **Account → Cloudflare Pages → Edit**
   - Click "Continue to summary" → "Create Token"
   - **Copy the token** (you won't see it again!)

2. **Get Cloudflare Account ID:**
   - Go to https://dash.cloudflare.com/
   - Click **Workers & Pages** in the sidebar
   - Your Account ID is in the right sidebar

3. **Add to GitHub:**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

### Step 2: Add Render Secrets

Follow the instructions above for `RENDER_DEPLOY_HOOK`, `RENDER_API_KEY`, and `RENDER_SERVICE_ID`.

### Step 3: Add Backend Application Secrets

Add each of the following as GitHub repository secrets:

```
MONGODB_URI          → Your MongoDB Atlas connection string
JWT_KEY              → Random 32+ character string
BACKEND_API_URL      → Your Render service URL (after first deploy)
ALLOWED_ORIGINS      → Comma-separated frontend/worker URLs
FRONTEND_URL         → Your Cloudflare Pages URL
VITE_BACKEND_URL     → Your Cloudflare Worker URL
```

Generate a secure `JWT_KEY` with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Add Optional Secrets

Add any payment, OAuth, or media storage secrets you need.
Only secrets with non-empty values are synced to Render.

---

## Complete Secrets Checklist

### Required for All Deployments

- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] `VITE_BACKEND_URL`
- [ ] `JWT_KEY`
- [ ] `MONGODB_URI`

### Required for Render Backend Deployment

- [ ] `RENDER_DEPLOY_HOOK`
- [ ] `RENDER_API_KEY`
- [ ] `RENDER_SERVICE_ID`
- [ ] `BACKEND_API_URL` (add after first deploy)
- [ ] `ALLOWED_ORIGINS`
- [ ] `FRONTEND_URL`

### Optional

- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- [ ] `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- [ ] `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
- [ ] `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_CALLBACK_URL`
- [ ] `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- [ ] `SNYK_TOKEN`

---

## Deployment Flow

### Initial Deployment Order:

1. **Create Render service** (connect your GitHub repo in the Render dashboard)
   - Root Directory: `api`
   - Start Command: `node server.js`

2. **Add all GitHub Secrets** (steps 1–4 above)

3. **Push to main** — GitHub Actions will:
   - Sync all environment variables from GitHub Secrets → Render
   - Trigger a new Render deployment via the deploy hook
   - Deploy the Cloudflare Worker (with `BACKEND_API_URL`)
   - Build and deploy the frontend (with `VITE_BACKEND_URL`)

4. **After first deploy**, get your Render URL (`https://your-app.onrender.com`) and add it as `BACKEND_API_URL` in GitHub Secrets, then push again.

### Subsequent Deployments:

Just push to main — GitHub Actions handles everything automatically.

```bash
git push origin main
```

---

## Troubleshooting

### curl: (3) URL rejected — RENDER_DEPLOY_HOOK is empty

**Cause:** `RENDER_DEPLOY_HOOK` secret is missing or empty.

**Fix:** Follow [How to get RENDER_DEPLOY_HOOK](#how-to-get-render_deploy_hook) above and add it to GitHub Secrets.

### Environment variables not updated on Render

**Cause:** `RENDER_API_KEY` or `RENDER_SERVICE_ID` is missing.

**Fix:** Follow the instructions above for both secrets.

### Worker: "Backend not configured"

**Cause:** `BACKEND_API_URL` secret not set in GitHub.

**Fix:**
1. Ensure backend is deployed and accessible
2. Add `BACKEND_API_URL` secret in GitHub
3. Redeploy: push to main or manually trigger the workflow

### Frontend: Can't connect to API

**Cause:** `VITE_BACKEND_URL` is incorrect or not set.

**Fix:**
1. Check `VITE_BACKEND_URL` in GitHub Secrets
2. Should point to your Cloudflare Worker URL
3. Push to main to rebuild the frontend

---

## Verifying Secrets

1. Go to repository → Settings → Secrets and variables → Actions
2. Verify all required secrets are listed (values are hidden for security)

## Summary

**Key Points:**

1. **GitHub Secrets is the single source of truth** for all environment variables
2. The CI/CD pipeline automatically syncs backend secrets to Render on every deploy
3. Worker secrets are configured via `BACKEND_API_URL` in GitHub Secrets
4. Frontend build variables are injected at build time from GitHub Secrets
5. Deploy backend first, then add its URL as `BACKEND_API_URL` in GitHub Secrets
6. Push to main → everything deploys automatically

