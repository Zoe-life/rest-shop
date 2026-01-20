# Cloudflare Deployment Guide

## Prerequisites

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com/sign-up
   - Get your Account ID from the Workers dashboard
   - Create an API token with Workers permissions

2. **MongoDB Atlas Account**
   - Sign up at https://www.mongodb.com/cloud/atlas/register
   - Create a cluster
   - Get your connection string
   - Configure IP Access List (allow 0.0.0.0/0 for Cloudflare Workers)

3. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

## Configuration Steps

### Step 1: Update wrangler.toml

Edit `wrangler.toml` and replace placeholders:

```toml
name = "rest-shop-api"
account_id = "YOUR_ACCOUNT_ID_HERE"

[env.production]
name = "rest-shop-api-production"
```

### Step 2: Configure Secrets

Set up environment variables using Wrangler:

```bash
# MongoDB Configuration
wrangler secret put MONGODB_URI
# Paste: mongodb+srv://rest-shop:PASSWORD@cluster0.lifak.mongodb.net/

wrangler secret put MONGO_ATLAS_PW
# Paste your MongoDB password

# JWT Configuration
wrangler secret put JWT_KEY
# Generate a secure random string

# CORS Configuration
wrangler secret put ALLOWED_ORIGINS
# Paste: https://yourdomain.com,https://www.yourdomain.com
```

### Step 3: Deploy to Cloudflare

```bash
# Install dependencies
npm install

# Run tests to ensure everything works
npm test

# Deploy to Cloudflare Workers
wrangler deploy
```

### Step 4: Verify Deployment

```bash
# Check health endpoint
curl https://rest-shop-api.YOUR-SUBDOMAIN.workers.dev/health

# Expected response:
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2024-01-20T...",
  "uptime": 123.45,
  "database": {
    "status": "connected"
  }
}
```

## Alternative Deployment Options

### Option 1: Keep on Traditional Node.js Server

If Cloudflare Workers has compatibility issues, deploy to:

1. **Railway** (https://railway.app/)
   ```bash
   railway login
   railway init
   railway up
   ```

2. **Render** (https://render.com/)
   - Connect GitHub repository
   - Auto-deploys on push

3. **Heroku** (https://heroku.com/)
   ```bash
   heroku login
   heroku create rest-shop-api
   git push heroku main
   ```

Then use Cloudflare as a CDN/proxy:
- Add your domain to Cloudflare
- Point DNS to your server
- Enable Cloudflare proxy (orange cloud)

### Option 2: Use Cloudflare Pages Functions

For a serverless approach with better Node.js compatibility:

1. Create `functions/api/[[path]].js`:
   ```javascript
   import app from '../../app.js';
   
   export async function onRequest(context) {
     return app(context.request);
   }
   ```

2. Deploy:
   ```bash
   wrangler pages deploy
   ```

## CI/CD with GitHub Actions

The repository includes `.github/workflows/ci-cd.yml` which:

1. **Runs on every push to main/develop**
2. **Executes tests automatically**
3. **Performs security scans**
4. **Deploys to Cloudflare Workers**

### Required GitHub Secrets

Add these secrets in GitHub repository settings:

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
JWT_KEY
MONGODB_URI
MONGO_ATLAS_PW
ALLOWED_ORIGINS
```

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | Full MongoDB connection string | `mongodb+srv://...` |
| `MONGO_ATLAS_PW` | MongoDB password | `your_password` |
| `JWT_KEY` | Secret key for JWT tokens | `your_secret_key` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://yourdomain.com` |
| `NODE_ENV` | Environment | `production` |

## Monitoring and Logging

### Cloudflare Dashboard
- View Workers analytics at: https://dash.cloudflare.com/
- Monitor requests, errors, and performance
- Check logs in real-time

### MongoDB Atlas
- Monitor database performance at: https://cloud.mongodb.com/
- View slow queries and optimize indexes
- Set up alerts for connection issues

## Troubleshooting

### Issue: "MongoDB connection failed"
**Solution**: 
- Verify IP Access List includes 0.0.0.0/0
- Check connection string format
- Verify MONGODB_URI secret is set correctly

### Issue: "Worker exceeded CPU time limit"
**Solution**:
- Optimize database queries
- Add indexes to MongoDB collections
- Implement caching with Workers KV

### Issue: "CORS errors in browser"
**Solution**:
- Verify ALLOWED_ORIGINS includes your frontend domain
- Check CORS middleware is configured
- Ensure preflight requests are handled

## Performance Optimization

1. **Enable Caching**
   ```javascript
   // Cache GET requests for 5 minutes
   res.setHeader('Cache-Control', 'public, max-age=300');
   ```

2. **Use Cloudflare Workers KV**
   ```javascript
   // Cache frequently accessed data
   await env.CACHE.put('products', JSON.stringify(products), {
     expirationTtl: 300
   });
   ```

3. **Optimize Database Queries**
   ```javascript
   // Use projection to limit fields
   Product.find().select('name price').lean();
   ```

## Security Checklist

- [x] Helmet security headers configured
- [x] CORS properly restricted
- [x] Rate limiting enabled
- [x] Input validation on all routes
- [x] JWT tokens expire after 1 hour
- [x] Passwords hashed with bcrypt
- [x] MongoDB password not hardcoded
- [x] API keys stored as secrets
- [x] HTTPS enforced
- [ ] Configure WAF rules in Cloudflare
- [ ] Set up DDoS protection
- [ ] Enable bot protection

## Support and Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Express.js Docs**: https://expressjs.com/
