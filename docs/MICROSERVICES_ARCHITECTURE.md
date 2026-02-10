# Microservices Architecture

## Overview

The REST Shop API has been refactored into a microservices architecture using Cloudflare Workers Service Bindings. This solves the bundle size limitation by splitting the monolithic application into smaller, focused services that each stay well under the 1MB limit.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / Clients                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Gateway Worker      │  (~50KB)
         │  (rest-shop-gateway)  │
         │                       │
         │  Routes by path:      │
         │  /api/payments → PS   │
         │  /* → Base Service    │
         └───────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ Payment Service  │  │  Base Service    │
│ (rest-shop-      │  │ (rest-shop-api)  │
│  payments)       │  │                  │
│                  │  │                  │
│ • Stripe         │  │ • Products       │
│ • PayPal         │  │ • Orders         │
│ • M-Pesa         │  │ • Users          │
│ • Payment Models │  │ • Auth           │
│                  │  │                  │
│ (~600-800KB)     │  │ (~1.2-1.5MB)     │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
           ┌────────────────┐
           │   MongoDB      │
           │   Atlas        │
           └────────────────┘
```

## Services

### 1. Gateway Worker (`wrangler-gateway.toml`)
- **Purpose**: Lightweight router that directs traffic to appropriate services
- **Bundle Size**: ~50KB (minimal dependencies)
- **Configuration**: `wrangler-gateway.toml`
- **Source**: `src/gateway-worker.js`
- **Routes**:
  - `/api/payments/*` → Payment Service
  - All other routes → Base Service

### 2. Payment Service (`wrangler-payments.toml`)
- **Purpose**: Handles all payment operations (Stripe, PayPal, M-Pesa)
- **Bundle Size**: ~600-800KB
- **Configuration**: `wrangler-payments.toml`
- **Source**: `src/payment-worker.js`
- **Includes**:
  - Payment controllers
  - Payment routes
  - Payment services (Stripe, PayPal, M-Pesa)
  - Payment models
  - Mongoose (for database access)

### 3. Base Service (`wrangler.toml`)
- **Purpose**: Handles core e-commerce functionality
- **Bundle Size**: ~1.2-1.5MB (reduced from 2MB+)
- **Configuration**: `wrangler.toml`
- **Source**: `src/worker.js` + `app.js`
- **Includes**:
  - Product routes & controllers
  - Order routes & controllers
  - User routes & controllers
  - Auth routes & controllers
  - Mongoose (for database access)

## Deployment

### Prerequisites
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)

### Deploy All Services
```bash
npm run deploy:all
```

This runs `scripts/deploy-microservices.sh` which deploys services in the correct order:
1. Base Service
2. Payment Service
3. Gateway (must be last to bind to other services)

### Deploy Individual Services
```bash
# Deploy base service only
npm run deploy:base

# Deploy payment service only
npm run deploy:payments

# Deploy gateway only
npm run deploy:gateway
```

### Manual Deployment
```bash
# Base service
wrangler deploy --config wrangler.toml

# Payment service
wrangler deploy --config wrangler-payments.toml

# Gateway
wrangler deploy --config wrangler-gateway.toml
```

## Service Bindings

Service bindings allow zero-latency communication between workers. The gateway uses service bindings defined in `wrangler-gateway.toml`:

```toml
[[services]]
binding = "PAYMENT_SERVICE"
service = "rest-shop-payments"

[[services]]
binding = "BASE_SERVICE"
service = "rest-shop-api"
```

These bindings make the other workers available via `env.PAYMENT_SERVICE` and `env.BASE_SERVICE`.

## API Usage

### For External Clients
Always use the **Gateway URL** as your API endpoint:

```
https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev
```

Example requests:
```bash
# Products (routed to Base Service)
GET https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/products

# Orders (routed to Base Service)
POST https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/orders

# Payments (routed to Payment Service)
POST https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/payments/initiate

# Auth (routed to Base Service)
POST https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/api/auth/login
```

### Direct Service Access (Internal Only)
Individual services can be accessed directly for testing:

```bash
# Base Service
https://rest-shop-api.YOUR-SUBDOMAIN.workers.dev

# Payment Service
https://rest-shop-payments.YOUR-SUBDOMAIN.workers.dev
```

**Note**: Direct access bypasses the gateway and should only be used for debugging.

## Benefits

### 1. Bundle Size Management
- **Before**: Single 2MB+ worker (exceeded free tier 1MB limit)
- **After**: 
  - Gateway: ~50KB
  - Payment Service: ~600-800KB
  - Base Service: ~1.2-1.5MB (can be split further if needed)

### 2. Independent Deployment
- Deploy payment fixes without touching core API
- Deploy new payment providers without risk to other services
- Rollback specific services without affecting others

### 3. Scalability
- Each service scales independently
- Payment-heavy traffic doesn't affect product browsing
- Can add more services easily (e.g., separate auth service)

### 4. Developer Experience
- Clearer code organization
- Easier to understand and maintain
- Better separation of concerns

## Development

### Local Development
For local development, you can still use the monolithic approach:

```bash
npm start
```

This runs the full app on `http://localhost:3001` without microservices routing.

### Testing Individual Services
```bash
# Test gateway locally
wrangler dev --config wrangler-gateway.toml

# Test payment service locally
wrangler dev --config wrangler-payments.toml

# Test base service locally
wrangler dev --config wrangler.toml
```

## Environment Variables & Secrets

All services need access to the same secrets:

```bash
# Set secrets for each service
wrangler secret put MONGO_ATLAS_PW --config wrangler.toml
wrangler secret put MONGO_ATLAS_PW --config wrangler-payments.toml
wrangler secret put JWT_KEY --config wrangler.toml
wrangler secret put JWT_KEY --config wrangler-payments.toml

# Payment-specific secrets
wrangler secret put STRIPE_SECRET_KEY --config wrangler-payments.toml
wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-payments.toml
wrangler secret put MPESA_CONSUMER_SECRET --config wrangler-payments.toml
```

## Future Enhancements

### Potential Service Splits
As the application grows, consider splitting further:

1. **Auth Service**: Move authentication to its own worker
   - JWT verification
   - OAuth flows
   - User sessions

2. **Product Service**: Separate product management
   - Product catalog
   - Search & filtering
   - Inventory management

3. **Order Service**: Dedicated order processing
   - Order creation
   - Order tracking
   - Order history

4. **Image Service**: CDN-like image delivery
   - Image uploads to R2
   - Automatic resizing
   - Format optimization

### Service Mesh Features
- Add request tracing across services
- Implement circuit breakers
- Add service-to-service authentication
- Implement rate limiting per service

## Troubleshooting

### Service Binding Errors
If you get "Service binding not found" errors:
1. Ensure the target service is deployed first
2. Check service names match in `wrangler-gateway.toml`
3. Deploy gateway last

### Bundle Size Issues
If a service exceeds 1MB:
1. Check for duplicate dependencies
2. Consider splitting the service further
3. Use `wrangler deploy --dry-run --outdir=dist` to inspect bundle

### Database Connection Issues
Each service maintains its own connection pool via Durable Objects:
1. Check `MONGO_ATLAS_PW` secret is set
2. Verify MongoDB Atlas allows Cloudflare IPs
3. Check Durable Object bindings in wrangler configs

## Migration Guide

### From Monolithic to Microservices

This repository has already been migrated. If you need to migrate additional routes:

1. **Identify the domain**: Which logical group does the feature belong to?
2. **Create worker file**: Create `src/[domain]-worker.js`
3. **Create wrangler config**: Create `wrangler-[domain].toml`
4. **Move routes**: Import only the routes needed for that domain
5. **Update gateway**: Add routing logic in `src/gateway-worker.js`
6. **Update base service**: Remove moved routes from `app.js`
7. **Test**: Deploy and verify routing works
8. **Update docs**: Document the new service

## Performance Considerations

### Cold Starts
- Gateway has fastest cold starts (~10-20ms) due to minimal size
- Service bindings add no latency (internal Cloudflare routing)
- Each service warms independently

### Database Connections
- Each service uses Durable Objects for connection pooling
- Connections are reused across requests
- No connection overhead for service-to-service calls

### Caching
- Consider adding KV caching at gateway level for common responses
- Each service can cache independently
- Use `Cache-Control` headers for CDN caching

## Cost Implications

### Cloudflare Workers Pricing
- **Free Tier**: 100,000 requests/day across all workers
- **Paid Tier**: $5/month for 10M requests/month

### Request Counting
- 1 client request = 2 worker invocations (gateway + target service)
- Internal service bindings don't count as separate requests
- Total cost scales with client requests, not internal routing

## Security

### Service Isolation
- Each service has its own execution context
- Secrets are isolated per service
- Failed auth in one service doesn't affect others

### Authentication
- Auth checks happen in individual services
- Gateway doesn't perform authentication
- Each service validates JWT tokens independently

### Network Security
- Service bindings are internal only
- No public internet traffic between services
- All inter-service communication is encrypted

## Monitoring

### Logs
View logs for each service:
```bash
wrangler tail --config wrangler-gateway.toml
wrangler tail --config wrangler-payments.toml
wrangler tail --config wrangler.toml
```

### Metrics
- Monitor each service in Cloudflare Dashboard
- Track requests, errors, CPU time per service
- Set up alerts for service-specific issues

### Health Checks
Each service has a health endpoint:
```bash
GET /health
```

Response includes:
- Service name
- Database connection status
- Environment info

## Related Documentation

- [BUNDLE_SIZE_ANALYSIS.md](./BUNDLE_SIZE_ANALYSIS.md) - Bundle size optimization details
- [README.md](./README.md) - Main project documentation
- [Cloudflare Workers Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
