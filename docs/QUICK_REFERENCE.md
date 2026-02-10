# Quick Reference: Connecting Worker to Backend

## TL;DR (Too Long; Didn't Read)

```bash
# 1. Deploy backend
# Connect GitHub repo in Render dashboard or deploy via VPS
# Get URL: https://your-app.onrender.com

# 2. Configure worker
cd worker
wrangler secret put BACKEND_API_URL
# Enter: https://your-app.onrender.com

# 3. Deploy worker
wrangler deploy

# 4. Test
curl https://your-worker.workers.dev/health
```

**Done!** Worker now talks to backend.

---

## Cheat Sheet

### Backend URLs by Platform

| Platform | URL Format | Example |
|----------|------------|---------|
| **Render** | `https://your-app.onrender.com` | `https://rest-shop-api.onrender.com` |
| **Render** | `https://your-service.onrender.com` | `https://rest-shop-backend.onrender.com` |
| **VPS** | `https://api.yourdomain.com` | `https://api.example.com` |
| **Local** | `http://localhost:3001` | `http://localhost:3001` |

### Essential Commands

| Task | Command |
|------|---------|
| **Set backend URL** | `wrangler secret put BACKEND_API_URL` |
| **Deploy worker** | `wrangler deploy` |
| **Test backend** | `curl https://backend-url/health` |
| **Test worker** | `curl https://worker-url/health` |
| **Validate connection** | `node api/scripts/validate-connection.js <backend> <worker>` |
| **Auto-configure** | `cd worker && ./configure.sh` |

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `BACKEND_API_URL` | Worker (Cloudflare) | Tells worker where backend is |
| `MONGODB_URI` | Backend | Database connection |
| `JWT_KEY` | Backend | Authentication secret |
| `ALLOWED_ORIGINS` | Backend | CORS configuration |
| `STRIPE_SECRET_KEY` | Backend | Payment gateway |
| All other secrets | Backend | Never in worker! |

---

## Troubleshooting Quick Fixes

### "Backend not configured"
```bash
cd worker
wrangler secret put BACKEND_API_URL
# Enter your backend URL
```

### "Backend service unavailable" (502)
```bash
# Test backend directly
curl https://your-backend-url/health

# If it fails, backend is down. Restart it.
# If it works, check BACKEND_API_URL is correct
```

### CORS Errors
```bash
# In backend environment (Render dashboard):
ALLOWED_ORIGINS=https://frontend.com,https://worker.workers.dev
```

### Database Not Connected
```bash
# In backend environment:
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# In MongoDB Atlas:
# Network Access → Add IP → 0.0.0.0/0 (allow all)
```

---

## Health Check Responses

### Healthy Backend
```bash
curl https://backend-url/health
```
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "production"
}
```

### Healthy Worker (with Backend)
```bash
curl https://worker-url/health
```
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

### Worker Can't Reach Backend
```bash
curl https://worker-url/health
```
```json
{
  "worker": "ok",
  "backend": "unreachable",
  "error": "..."
}
```
**Fix**: Check `BACKEND_API_URL` is set correctly

---

## Configuration Checklist

### Backend
- [ ] Deployed to hosting provider
- [ ] `curl https://backend-url/health` returns 200
- [ ] `MONGODB_URI` is set
- [ ] `JWT_KEY` is set (32+ chars)
- [ ] `ALLOWED_ORIGINS` includes worker URL
- [ ] Database shows "connected"

### Worker
- [ ] `BACKEND_API_URL` secret is set
- [ ] Deployed with `wrangler deploy`
- [ ] `curl https://worker-url/health` returns 200
- [ ] Worker shows `"backend": {"status": "ok"}`
- [ ] Can access API: `curl https://worker-url/products`

---

## Quick Links

| Resource | Link |
|----------|------|
| **Detailed Connection Guide** | [docs/CONNECTION_GUIDE.md](./CONNECTION_GUIDE.md) |
| **Visual Guide** | [docs/CONNECTION_VISUAL_GUIDE.md](./CONNECTION_VISUAL_GUIDE.md) |
| **Deployment Guide** | [docs/DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |
| **Architecture Guide** | [docs/CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md](./CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md) |
| **Troubleshooting** | [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |

---

## Pro Tips

1. **Use the validation script** to check your setup:
   ```bash
   node api/scripts/validate-connection.js <backend-url> <worker-url>
   ```

2. **Use the configuration helper** for easy setup:
   ```bash
   cd worker && ./configure.sh
   ```

3. **For local dev**, skip the worker:
   ```bash
   npm start  # Backend at http://localhost:3001
   # Connect frontend directly
   ```

4. **Always test health endpoints** after deployment

5. **Check logs** if something doesn't work:
   - Backend: `render logs` or Render dashboard
   - Worker: `wrangler tail`

---

## Mental Model

```
Frontend → Worker → Backend → Database
           ↑ needs  ↑ needs
           URL      secrets
```

- **Worker** needs: `BACKEND_API_URL` (where is backend?)
- **Backend** needs: All secrets (JWT, DB, payments, etc.)

**Key insight**: Worker is just a router. All the real work happens in the backend.

---

## Common Scenarios

### Local Development
```bash
npm start  # Just run backend at :3001
# Skip worker, connect frontend directly
```

### Production with Render
```bash
# 1. Deploy
# Connect GitHub repository in Render dashboard

# 2. Get URL from Render dashboard
# 3. Configure worker
cd worker
echo "https://your-app.onrender.com" | wrangler secret put BACKEND_API_URL

# 4. Deploy worker
wrangler deploy
```

### Production with Render
```bash
# 1. Connect GitHub repo in Render dashboard
# 2. Deploy (automatic)
# 3. Get URL from Render dashboard
# 4. Configure worker
cd worker
wrangler secret put BACKEND_API_URL
# Enter Render URL

# 5. Deploy worker
wrangler deploy
```

### Production with VPS
```bash
# 1. SSH and deploy backend
ssh user@server
# ... setup process ...
# Backend at https://api.yourdomain.com

# 2. Configure worker (on local machine)
cd worker
echo "https://api.yourdomain.com" | wrangler secret put BACKEND_API_URL

# 3. Deploy worker
wrangler deploy
```

---

## Emergency Fixes

### Worker says backend not configured
```bash
cd worker
wrangler secret put BACKEND_API_URL
# Paste your backend URL
wrangler deploy  # Redeploy
```

### Backend not responding
```bash
# Render
render logs
render restart

# Render
# Check dashboard logs
# Click "Manual Deploy" to restart

# VPS
pm2 restart rest-shop-api
pm2 logs
```

### Everything broken?
```bash
# Start from scratch
# 1. Verify backend works
curl https://backend-url/health

# 2. Reset worker config
cd worker
wrangler secret put BACKEND_API_URL
# Enter correct backend URL

# 3. Redeploy
wrangler deploy

# 4. Validate
node ../api/scripts/validate-connection.js https://backend-url https://worker-url
```

---

**Remember**: Backend does the work, worker just routes traffic. Keep it simple!
