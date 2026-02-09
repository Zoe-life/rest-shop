# Quick Start: Deploying REST Shop with Cloudflare Workers

## 🎯 What You'll Deploy

1. **Node.js Backend** - Handles all database operations with Mongoose
2. **Cloudflare Workers** - Edge proxies for global distribution

## Prerequisites

- Node.js 20+ installed
- Wrangler CLI installed: `npm install -g wrangler`
- MongoDB Atlas account (or MongoDB instance)
- Cloudflare account

## Step-by-Step Deployment

### Step 1: Prepare MongoDB

1. Create a MongoDB Atlas cluster (free tier works)
2. Create a database user
3. Get your connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
   ```
4. Whitelist IP addresses:
   - For development: Your IP
   - For production: `0.0.0.0/0` (all IPs, adjust for your backend's IPs)

### Step 2: Deploy Node.js Backend

Choose one of these options:

#### Option A: Railway (Easiest - Recommended)

1. **Sign up at [railway.app](https://railway.app)**

2. **Deploy from GitHub:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your rest-shop repository
   - Choose main branch

3. **Configure environment variables:**
   ```bash
   # In Railway Dashboard → Variables tab, add:
   MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/
   JWT_KEY=your_super_long_random_jwt_secret_key_at_least_32_chars
   NODE_ENV=production
   PORT=3001
   
   # Payment Gateway Keys
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   
   # Add all other required variables from .env.example
   ```

4. **Start the service:**
   - Railway will auto-deploy
   - Get your URL: `https://your-app.railway.app`

5. **Test it works:**
   ```bash
   curl https://your-app.railway.app/health
   ```
   
   Expected response:
   ```json
   {
     "status": "ok",
     "database": "connected",
     "environment": "production"
   }
   ```

#### Option B: Render

1. **Sign up at [render.com](https://render.com)**

2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Name: `rest-shop-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables:**
   - Same variables as Railway above
   - Click "Environment" tab
   - Add each variable

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment
   - Get URL: `https://rest-shop-backend.onrender.com`

#### Option C: VPS (DigitalOcean, Linode, AWS EC2)

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
nano .env  # Edit with your values

# Start with PM2
pm2 start server.js --name rest-shop-api
pm2 save
pm2 startup  # Follow instructions to enable auto-start

# Set up nginx reverse proxy (optional but recommended)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/rest-shop
```

Nginx config:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rest-shop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 3: Configure Cloudflare Workers

Now that your backend is running, configure the workers to proxy to it.

1. **Login to Wrangler:**
   ```bash
   wrangler login
   ```

2. **Set Backend URL secret:**
   ```bash
   # Use your backend URL from Step 2
   wrangler secret put BACKEND_API_URL --config wrangler.toml
   # When prompted, enter: https://your-app.railway.app
   
   wrangler secret put BACKEND_API_URL --config wrangler-payments.toml
   # Same URL
   ```

3. **Set other secrets:**
   ```bash
   # JWT Key (MUST match backend)
   wrangler secret put JWT_KEY --config wrangler.toml
   wrangler secret put JWT_KEY --config wrangler-payments.toml
   
   # Payment secrets (for payment worker)
   wrangler secret put STRIPE_SECRET_KEY --config wrangler-payments.toml
   wrangler secret put STRIPE_WEBHOOK_SECRET --config wrangler-payments.toml
   wrangler secret put PAYPAL_CLIENT_ID --config wrangler-payments.toml
   wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-payments.toml
   # Add other payment gateway secrets as needed
   ```

   Or set all secrets at once using Cloudflare Dashboard:
   - Go to Workers & Pages → Select your worker → Settings → Variables
   - Add secrets there

### Step 4: Deploy Workers

```bash
# Deploy all workers
npm run deploy:all

# Or deploy individually
npm run deploy:base       # Base service (products, orders, users, auth)
npm run deploy:payments   # Payment service
npm run deploy:gateway    # Gateway router (main entry point)
```

Expected output:
```
✅ Successfully deployed rest-shop-api
   https://rest-shop-api.your-subdomain.workers.dev

✅ Successfully deployed rest-shop-payments
   https://rest-shop-payments.your-subdomain.workers.dev

✅ Successfully deployed rest-shop-gateway
   https://rest-shop-gateway.your-subdomain.workers.dev
```

### Step 5: Test Your Deployment

1. **Test Gateway Health:**
   ```bash
   curl https://rest-shop-gateway.your-subdomain.workers.dev/health
   ```
   
   Expected:
   ```json
   {
     "worker": "ok",
     "backend": {
       "status": "ok",
       "database": "connected",
       "environment": "production"
     },
     "timestamp": "2026-02-09T..."
   }
   ```

2. **Test API Endpoints:**
   ```bash
   # Get products
   curl https://rest-shop-gateway.your-subdomain.workers.dev/products
   
   # Get specific product
   curl https://rest-shop-gateway.your-subdomain.workers.dev/products/123
   
   # Test payment endpoint
   curl https://rest-shop-gateway.your-subdomain.workers.dev/api/payments/health
   ```

3. **Test Authentication:**
   ```bash
   # Register a user
   curl -X POST https://rest-shop-gateway.your-subdomain.workers.dev/user/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "SecurePass123!"
     }'
   
   # Login
   curl -X POST https://rest-shop-gateway.your-subdomain.workers.dev/user/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "SecurePass123!"
     }'
   ```

### Step 6: Configure Custom Domain (Optional)

1. **In Cloudflare Dashboard:**
   - Workers & Pages → rest-shop-gateway → Settings → Triggers
   - Add Custom Domain: `api.yourdomain.com`
   - Cloudflare will automatically configure SSL

2. **Update Frontend:**
   - Update your frontend to use: `https://api.yourdomain.com`
   - Update CORS settings in backend `.env`:
     ```
     ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
     ```

## Local Development

For local development, you can skip Cloudflare Workers entirely:

```bash
# Just run the Node.js backend
npm start

# Test at http://localhost:3001
curl http://localhost:3001/health
curl http://localhost:3001/products
```

Or test workers locally:

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start worker locally
wrangler dev --config wrangler-gateway.toml

# Before starting, temporarily set in wrangler-gateway.toml:
# [vars]
# BACKEND_API_URL = "http://localhost:3001"
```

## Troubleshooting

### Issue: "Backend not configured"

**Solution:** Set `BACKEND_API_URL` in Cloudflare:
```bash
wrangler secret put BACKEND_API_URL --config wrangler.toml
```

### Issue: "Backend service unavailable" (502)

**Checks:**
1. Is backend running? Test: `curl https://your-backend-url/health`
2. Is URL correct? Check secrets in Cloudflare Dashboard
3. Check backend logs for errors

### Issue: "Database disconnected"

**Checks:**
1. Is `MONGODB_URI` correct in backend?
2. MongoDB Atlas: IP whitelist configured?
3. Check backend logs: `railway logs` or `pm2 logs`

### Issue: Authentication fails

**Solution:** Ensure `JWT_KEY` is identical in:
- Backend environment variables
- Cloudflare Worker secrets (for both workers)

### Issue: CORS errors

**Solution:** Update `ALLOWED_ORIGINS` in backend:
```bash
# In backend .env
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com,http://localhost:3000
```

## Environment Variables Checklist

### Required for Backend:
- ✅ `MONGODB_URI` - MongoDB connection string
- ✅ `JWT_KEY` - JWT secret (32+ characters)
- ✅ `NODE_ENV` - Set to "production"
- ✅ `PORT` - Port to run on (default 3001)
- ✅ `ALLOWED_ORIGINS` - Comma-separated list of allowed origins

### Required for Cloudflare Workers:
- ✅ `BACKEND_API_URL` - Your backend URL (e.g., https://your-app.railway.app)
- ✅ `JWT_KEY` - Same as backend
- ✅ Payment secrets (if using payments):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - etc.

## Cost Estimate

### Minimal Setup (Free/Low Cost)
- **MongoDB Atlas**: Free tier (512MB)
- **Railway/Render**: $0-7/month (free tier or starter)
- **Cloudflare Workers**: Free tier (100K requests/day)
- **Total**: $0-7/month

### Production Setup
- **MongoDB Atlas**: $9-30/month (M2-M10)
- **Railway/Render**: $20-50/month (Pro tier)
- **Cloudflare Workers**: $5/month (paid plan for higher limits)
- **Total**: $34-85/month

## Next Steps

1. ✅ Set up monitoring (Railway/Render has built-in)
2. ✅ Configure production environment variables
3. ✅ Set up CI/CD (GitHub Actions already configured)
4. ✅ Add custom domain
5. ✅ Configure backup strategy for MongoDB
6. ✅ Set up error tracking (Sentry, Rollbar, etc.)
7. ✅ Load testing: `npm run test:load`

## Support

If you encounter issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [Architecture Documentation](./CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md)
3. Check backend logs
4. Check Cloudflare Worker logs in Dashboard

## Success! 🎉

Your REST Shop API is now deployed with:
- ✅ Global edge distribution via Cloudflare Workers
- ✅ Robust Node.js backend with Mongoose
- ✅ No more error 10021
- ✅ Production-ready architecture
