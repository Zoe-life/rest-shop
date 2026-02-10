# Cloudflare Worker - Edge Proxy

This Cloudflare Worker acts as a lightweight edge proxy that forwards all requests to your Node.js backend.

## Quick Setup

### 1. Configure Backend URL

```bash
# Use the configuration helper script
./configure.sh

# OR manually set the secret
wrangler secret put BACKEND_API_URL
# Enter your backend URL when prompted
```

### 2. Deploy

```bash
wrangler deploy
```

### 3. Test

```bash
curl https://your-worker.workers.dev/health
```

## Configuration

The worker needs **one secret**:

- `BACKEND_API_URL` - URL of your Node.js backend

**Examples:**
- Railway: `https://your-app.railway.app`
- Render: `https://rest-shop-backend.onrender.com`
- VPS: `https://api.yourdomain.com`
- Local: `http://localhost:3001`

## Local Development

```bash
# Terminal 1: Start backend
cd ..
npm start

# Terminal 2: Start worker (add BACKEND_API_URL to wrangler.toml first)
wrangler dev
```

## Troubleshooting

### "Backend not configured"
```bash
wrangler secret put BACKEND_API_URL
```

### "Backend service unavailable" (502)
- Check backend is running: `curl https://backend-url/health`
- Verify BACKEND_API_URL is correct

## Documentation

- **[Quick Reference](../docs/QUICK_REFERENCE.md)** - Quick commands and tips
- **[Connection Guide](../docs/CONNECTION_GUIDE.md)** - Detailed setup guide
- **[Visual Guide](../docs/CONNECTION_VISUAL_GUIDE.md)** - Architecture diagrams

## Architecture

```
Client → Worker (this) → Backend → Database
         ↑ needs          ↑ needs
         BACKEND_API_URL  all secrets
```

Worker is just a proxy. All business logic happens in the backend.
