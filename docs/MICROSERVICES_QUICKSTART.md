# Microservices Quick Start Guide

## Quick Start

### Deploy to Cloudflare Workers
```bash
# Install dependencies (if not already done)
npm install

# Deploy all services at once
npm run deploy:all
```

That's it! Your microservices are now deployed.

## What Gets Deployed?

1. **Gateway Worker** - Main entry point (routes traffic)
2. **Base Service** - Products, orders, users, auth
3. **Payment Service** - Stripe, PayPal, M-Pesa payments

## Using Your API

After deployment, use the **Gateway URL** for all requests:

```
https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev
```

### Example Requests

```bash
# Products (routed to Base Service)
curl https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/products

# Create order (routed to Base Service)
curl -X POST https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "...", "quantity": 2}'

# Initiate payment (routed to Payment Service)
curl -X POST https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/payments/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "...", "paymentMethod": "stripe", "paymentData": {...}}'

# Login (routed to Base Service)
curl -X POST https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

## 🔧 Deploy Individual Services

```bash
# Deploy just the base service
npm run deploy:base

# Deploy just the payment service
npm run deploy:payments

# Deploy just the gateway
npm run deploy:gateway
```

## 🧪 Test Locally

```bash
# Test gateway locally
wrangler dev --config wrangler-gateway.toml --port 8787

# Test payment service locally
wrangler dev --config wrangler-payments.toml --port 8788

# Test base service locally
wrangler dev --config wrangler.toml --port 8789
```

## 🔐 Set Up Secrets

Each service needs access to certain secrets:

```bash
# MongoDB password (required for all data-accessing services)
wrangler secret put MONGO_ATLAS_PW --config wrangler.toml
wrangler secret put MONGO_ATLAS_PW --config wrangler-payments.toml

# JWT secret (required for authentication)
wrangler secret put JWT_KEY --config wrangler.toml
wrangler secret put JWT_KEY --config wrangler-payments.toml

# Payment gateway secrets (payment service only)
wrangler secret put STRIPE_SECRET_KEY --config wrangler-payments.toml
wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-payments.toml
wrangler secret put MPESA_CONSUMER_SECRET --config wrangler-payments.toml

# Allowed origins for CORS
wrangler secret put ALLOWED_ORIGINS --config wrangler.toml
wrangler secret put ALLOWED_ORIGINS --config wrangler-payments.toml
```

## ✅ Verify Deployment

Check that all services are healthy:

```bash
# Gateway health
curl https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/health

# Base service health
curl https://rest-shop-api.YOUR-SUBDOMAIN.workers.dev/health

# Payment service health
curl https://rest-shop-payments.YOUR-SUBDOMAIN.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "base-service", // or "payment-service"
  "database": "connected",
  "environment": "production"
}
```

## Architecture Overview

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│   Gateway Worker (~50KB)    │
│  rest-shop-gateway          │
└─────┬───────────────┬───────┘
      │               │
      │ /api/payments │ /* (everything else)
      │               │
      ▼               ▼
┌─────────────┐  ┌────────────────┐
│  Payment    │  │  Base Service  │
│  Service    │  │  (~1.2-1.5MB)  │
│ (~600-800KB)│  │                │
│             │  │  - Products    │
│ - Stripe    │  │  - Orders      │
│ - PayPal    │  │  - Users       │
│ - M-Pesa    │  │  - Auth        │
└─────────────┘  └────────────────┘
```

## Troubleshooting

### "Service binding not found"
- Ensure target services are deployed first
- Check service names in `wrangler-gateway.toml`
- Deploy gateway last: `npm run deploy:gateway`

### "Failed to connect to MongoDB"
- Check `MONGO_ATLAS_PW` secret is set
- Verify MongoDB Atlas allows Cloudflare IPs (0.0.0.0/0 for Workers)
- Check connection string in worker files

### "Bundle size exceeded"
- Check which service is failing
- Review dependencies in that service
- Consider splitting further if needed

### Routing issues
- Verify gateway is deployed and accessible
- Check service bindings in gateway config
- Use direct service URLs to test individual services

## More Information

- [Full Microservices Documentation](./MICROSERVICES_ARCHITECTURE.md)
- [Bundle Size Analysis](../BUNDLE_SIZE_ANALYSIS.md)
- [Main README](../README.md)

## Tips

1. **Always use the Gateway URL** for client requests
2. **Deploy in order**: Base → Payments → Gateway
3. **Test individual services** before testing through gateway
4. **Monitor logs**: `wrangler tail --config wrangler-[service].toml`
5. **Set secrets for all services** that need them

## Next Steps

1. Update your frontend/client to use the Gateway URL
2. Update any CI/CD pipelines to deploy all services
3. Set up monitoring for each service
4. Consider adding more services as your app grows

---

**Need help?** See the full documentation in [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md)
