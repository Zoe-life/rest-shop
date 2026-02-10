# Cloudflare Worker Configuration

This Cloudflare Worker acts as a lightweight edge proxy that forwards all requests to your Node.js backend.

## Quick Start

### Option 1: Automated Configuration (Recommended)

Use the configuration helper script:

```bash
./configure.sh
```

This script will:
- ✅ Check if wrangler is installed
- ✅ Test your backend connection
- ✅ Set the BACKEND_API_URL secret
- ✅ Optionally deploy the worker

### Option 2: Manual Configuration

1. **Deploy your Node.js backend** (Railway, Render, or VPS)
2. **Set the backend URL**:
   ```bash
   wrangler secret put BACKEND_API_URL
   # Enter your backend URL when prompted
   # Example: https://your-app.railway.app
   ```
3. **Deploy the worker**:
   ```bash
   wrangler deploy
   ```

## Configuration

### Required Secret

The worker needs **one secret** to function:

- `BACKEND_API_URL` - The URL of your Node.js backend

Set it using:
```bash
wrangler secret put BACKEND_API_URL
```

### Backend URL Examples

- **Railway**: `https://your-app.railway.app`
- **Render**: `https://rest-shop-backend.onrender.com`
- **VPS**: `https://api.yourdomain.com` or `http://your-server-ip:3001`
- **Local Development**: `http://localhost:3001`

## Testing

### Test Backend Connection
```bash
curl https://your-backend-url/health
# Should return: {"status":"ok","database":"connected"}
```

### Test Worker Connection
```bash
curl https://your-worker.workers.dev/health
# Should return:
# {
#   "worker": "ok",
#   "backend": {
#     "status": "ok",
#     "database": "connected"
#   }
# }
```

### Test Proxy Functionality
```bash
curl https://your-worker.workers.dev/products
# Should return products list from backend
```

## Local Development

For local development with the worker:

1. **Start your backend** (in another terminal):
   ```bash
   cd ..
   npm start
   # Backend runs on http://localhost:3001
   ```

2. **Configure for local backend**:
   
   Add to `wrangler.toml` under `[vars]`:
   ```toml
   [vars]
   BACKEND_API_URL = "http://localhost:3001"
   ```

3. **Start worker locally**:
   ```bash
   wrangler dev
   # Worker runs on http://localhost:8787
   ```

**Note**: For local development, you can skip the worker entirely and connect your frontend directly to `http://localhost:3001`.

## Troubleshooting

### "Backend not configured" Error

**Cause**: `BACKEND_API_URL` is not set in Cloudflare.

**Fix**:
```bash
wrangler secret put BACKEND_API_URL
# Enter your backend URL
```

### "Backend service unavailable" (502)

**Possible causes**:
1. Backend is not running
2. Wrong backend URL
3. Backend is not accessible from Cloudflare

**Debug steps**:
```bash
# 1. Test backend directly
curl https://your-backend-url/health

# 2. Check worker logs
wrangler tail

# 3. Verify BACKEND_API_URL in Cloudflare Dashboard:
#    Workers & Pages → Your Worker → Settings → Variables
```

### CORS Errors

**Cause**: Backend's `ALLOWED_ORIGINS` doesn't include your worker URL.

**Fix**: Update backend environment variables:
```bash
# In Railway/Render dashboard or .env file:
ALLOWED_ORIGINS=https://yourdomain.com,https://your-worker.workers.dev
```

## Validation

Use the connection validation script:

```bash
cd ..
node api/scripts/validate-connection.js https://your-backend-url https://your-worker.workers.dev
```

This will test:
- ✅ Backend is accessible
- ✅ Backend database is connected
- ✅ Worker is deployed
- ✅ Worker can reach backend
- ✅ Proxy functionality works

## Architecture

```
┌─────────────────────┐
│  Client/Frontend    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Cloudflare Worker (this)   │  ← Needs BACKEND_API_URL
│  - Lightweight proxy        │
│  - Edge routing             │
│  - Global distribution      │
└──────────┬──────────────────┘
           │ HTTP Proxy
           ▼
┌─────────────────────────────┐
│  Node.js Backend            │
│  - Express + Mongoose       │
│  - Business logic           │
│  - Database operations      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  MongoDB Database           │
└─────────────────────────────┘
```

## Key Points

- ✅ Worker is just a **proxy** - it doesn't handle business logic
- ✅ All database operations happen in the **Node.js backend**
- ✅ Worker only needs to know **where the backend is** (BACKEND_API_URL)
- ✅ All other secrets (JWT, payment keys) go in the **backend environment**
- ✅ Worker adds edge distribution and global routing

## Documentation

For detailed guides, see:

- **[Connection Guide](../docs/CONNECTION_GUIDE.md)** - Step-by-step setup
- **[Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)** - Full deployment walkthrough
- **[Architecture Guide](../docs/CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md)** - Architecture details

## Support

If you're having issues:

1. Check the [Connection Guide](../docs/CONNECTION_GUIDE.md)
2. Run the validation script
3. Check backend and worker logs
4. Review the [Troubleshooting](../docs/TROUBLESHOOTING.md) guide
