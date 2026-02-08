# Microservices Troubleshooting Guide

This guide helps you diagnose and fix common issues with the microservices architecture.

## Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Routing Issues](#routing-issues)
3. [Database Connection Issues](#database-connection-issues)
4. [Authentication Issues](#authentication-issues)
5. [CORS Issues](#cors-issues)
6. [Performance Issues](#performance-issues)
7. [Bundle Size Issues](#bundle-size-issues)

---

## Deployment Issues

### Error: "Service binding not found: PAYMENT_SERVICE"

**Problem:** Gateway can't find the Payment Service.

**Solution:**
1. Ensure Payment Service is deployed first:
   ```bash
   npm run deploy:payments
   ```

2. Verify service name in `wrangler-payments.toml`:
   ```toml
   name = "rest-shop-payments"  # Must match binding
   ```

3. Check gateway binding in `wrangler-gateway.toml`:
   ```toml
   [[services]]
   binding = "PAYMENT_SERVICE"
   service = "rest-shop-payments"  # Must match deployment name
   ```

4. Deploy gateway last:
   ```bash
   npm run deploy:gateway
   ```

### Error: "Service binding not found: BASE_SERVICE"

**Problem:** Gateway can't find the Base Service.

**Solution:**
1. Deploy Base Service first:
   ```bash
   npm run deploy:base
   ```

2. Verify service name in `wrangler.toml`:
   ```toml
   name = "rest-shop-api"  # Must match binding
   ```

3. Deploy gateway last:
   ```bash
   npm run deploy:gateway
   ```

### Error: "Deployment failed - bundle size exceeded"

**Problem:** One of the services exceeds size limit.

**Solution:**
1. Check which service failed
2. Review dependencies in that service
3. Consider splitting further if needed
4. Use `wrangler deploy --dry-run --outdir=dist` to inspect bundle

### Error: "Durable Object migration failed"

**Problem:** Migration tag mismatch.

**Solution:**
1. Check migration tag in wrangler config
2. Ensure tag is unique and sequential
3. Don't reuse old migration tags
4. Contact Cloudflare support if needed

---

## Routing Issues

### Gateway returns 404 for all requests

**Problem:** Gateway not routing correctly.

**Solution:**
1. Verify gateway is deployed:
   ```bash
   curl https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/health
   ```

2. Check service bindings are configured
3. Verify gateway routing logic in `src/gateway-worker.js`
4. Check logs:
   ```bash
   wrangler tail --config wrangler-gateway.toml
   ```

### Payments route not working (404)

**Problem:** Payment Service not reachable.

**Solution:**
1. Test Payment Service directly:
   ```bash
   curl https://rest-shop-payments.YOUR-SUBDOMAIN.workers.dev/health
   ```

2. Check gateway routing for `/api/payments`
3. Verify path prefix stripping in gateway
4. Check logs:
   ```bash
   wrangler tail --config wrangler-payments.toml
   ```

### Wrong service handles request

**Problem:** Request routed to wrong service.

**Solution:**
1. Check path matching in gateway
2. Verify path doesn't match multiple conditions
3. Check order of path checks (most specific first)
4. Test with direct service URLs to isolate issue

---

## Database Connection Issues

### Error: "Failed to connect to MongoDB"

**Problem:** MongoDB connection failing.

**Solution:**
1. Verify `MONGO_ATLAS_PW` secret is set:
   ```bash
   # Set for Base Service
   wrangler secret put MONGO_ATLAS_PW --config wrangler.toml
   
   # Set for Payment Service
   wrangler secret put MONGO_ATLAS_PW --config wrangler-payments.toml
   ```

2. Check MongoDB Atlas network access:
   - Add `0.0.0.0/0` to allow all IPs (Cloudflare Workers use dynamic IPs)

3. Verify connection string format in worker files:
   ```javascript
   const uri = `mongodb+srv://rest-shop:${this.env.MONGO_ATLAS_PW}@cluster0.lifak.mongodb.net/`;
   ```

4. Check database user permissions in MongoDB Atlas

### Error: "Durable Object not found"

**Problem:** Durable Object binding missing or misconfigured.

**Solution:**
1. Check Durable Object binding in wrangler config:
   ```toml
   [[durable_objects.bindings]]
   name = "PAYMENT_DB_CONNECTION"
   class_name = "PaymentDatabaseConnection"
   ```

2. Verify class is exported:
   ```javascript
   export class PaymentDatabaseConnection extends DurableObject {
   ```

3. Ensure migration is applied
4. Redeploy the service

### Database connection slow

**Problem:** Connection pool not working efficiently.

**Solution:**
1. Check if Durable Object is being reused
2. Verify connection pooling logic
3. Monitor connection state:
   ```javascript
   mongoose.connection.readyState === 1 // 1 = connected
   ```

4. Consider increasing `serverSelectionTimeoutMS` if needed

---

## Authentication Issues

### Error: "No auth token provided"

**Problem:** JWT token not being passed correctly.

**Solution:**
1. Verify token in Authorization header:
   ```bash
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

2. Check token is being passed through gateway
3. Verify check-auth middleware is applied
4. Check logs for token validation errors

### Error: "Invalid token"

**Problem:** JWT token invalid or expired.

**Solution:**
1. Verify `JWT_KEY` secret is set consistently:
   ```bash
   wrangler secret put JWT_KEY --config wrangler.toml
   wrangler secret put JWT_KEY --config wrangler-payments.toml
   ```

2. Check token expiration (default 1 hour)
3. Verify token was issued by your service
4. Check token signature matches JWT_KEY

### Error: "Access denied" for valid user

**Problem:** Authorization check failing.

**Solution:**
1. Verify user roles in database
2. Check role-based middleware (`check-role`)
3. Verify user ID matches token
4. Check order/payment ownership validation

---

## CORS Issues

### Error: "CORS policy blocked"

**Problem:** CORS headers not set correctly.

**Solution:**
1. Set `ALLOWED_ORIGINS` secret:
   ```bash
   wrangler secret put ALLOWED_ORIGINS --config wrangler.toml
   wrangler secret put ALLOWED_ORIGINS --config wrangler-payments.toml
   ```

2. Format: Comma-separated list
   ```
   https://example.com,https://app.example.com
   ```

3. Verify CORS middleware in each service
4. Check Origin header is being sent by client

### Preflight (OPTIONS) requests failing

**Problem:** OPTIONS requests not handled.

**Solution:**
1. Verify OPTIONS handler in each service:
   ```javascript
   if (req.method === 'OPTIONS') return res.sendStatus(200);
   ```

2. Check CORS headers are set for OPTIONS
3. Verify gateway passes OPTIONS through
4. Check allowed methods and headers

---

## Performance Issues

### Slow cold starts

**Problem:** Service takes long to start.

**Solution:**
1. Check bundle size (smaller = faster)
2. Verify no unnecessary dependencies
3. Consider code splitting
4. Monitor using Cloudflare dashboard

### High latency

**Problem:** Requests taking too long.

**Solution:**
1. Check database query performance
2. Add indexes for frequent queries
3. Verify service bindings (not external HTTP)
4. Monitor using `wrangler tail`
5. Check MongoDB Atlas performance metrics

### Gateway adds too much latency

**Problem:** Extra hop adds delay.

**Solution:**
1. Service bindings should add <1ms
2. Verify using internal bindings, not HTTP
3. Check gateway logic is minimal
4. Consider removing gateway for high-performance paths

---

## Bundle Size Issues

### Service exceeds 1MB limit

**Problem:** Bundle too large for free tier.

**Solution:**
1. Check bundle size:
   ```bash
   wrangler deploy --dry-run --outdir=dist
   ls -lh dist
   ```

2. Review dependencies:
   ```bash
   npm list --depth=0
   ```

3. Consider splitting service further
4. Remove unused dependencies
5. Use dynamic imports if possible

### Payment Service too large

**Problem:** Multiple payment SDKs increase size.

**Solution:**
1. Keep using mock implementations for testing
2. Add real SDKs only when needed
3. Consider separate service per payment provider
4. Use HTTP APIs instead of SDKs where possible

---

## Debugging Commands

### View Logs

```bash
# Gateway logs
wrangler tail --config wrangler-gateway.toml

# Payment Service logs
wrangler tail --config wrangler-payments.toml

# Base Service logs
wrangler tail --config wrangler.toml
```

### Test Health Endpoints

```bash
# Gateway health
curl https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev/health

# Payment Service health
curl https://rest-shop-payments.YOUR-SUBDOMAIN.workers.dev/health

# Base Service health
curl https://rest-shop-api.YOUR-SUBDOMAIN.workers.dev/health
```

### Check Service Bindings

```bash
# List deployed workers
wrangler deployments list --config wrangler-gateway.toml

# Check configuration
cat wrangler-gateway.toml | grep -A 2 "services"
```

### Inspect Bundle

```bash
# Dry run deployment to inspect bundle
wrangler deploy --dry-run --outdir=dist --config wrangler-payments.toml

# Check bundle size
ls -lh dist

# Inspect bundle contents
ls -la dist
```

---

## Getting Help

If you're still having issues:

1. **Check logs**: Use `wrangler tail` to see real-time errors
2. **Test directly**: Test services directly before testing through gateway
3. **Verify secrets**: Ensure all secrets are set correctly
4. **Check documentation**: Review [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md)
5. **Cloudflare Community**: Post in Cloudflare Workers Discord or Community Forum
6. **GitHub Issues**: Open an issue in the repository

---

## Common Error Messages

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| "Service binding not found" | Gateway can't find service | Deploy target service first |
| "Failed to connect to MongoDB" | Secret not set or wrong | Set MONGO_ATLAS_PW secret |
| "Invalid token" | JWT_KEY mismatch | Set same JWT_KEY for all services |
| "CORS policy blocked" | ALLOWED_ORIGINS not set | Set ALLOWED_ORIGINS secret |
| "Bundle size exceeded" | Service too large | Split service or remove dependencies |
| "Durable Object not found" | Migration not applied | Check migration in wrangler.toml |
| "404 Not Found" | Routing issue | Check gateway path matching |

---

## Prevention Best Practices

1. **Always deploy in order**: Base → Payments → Gateway
2. **Set secrets consistently**: Same secrets across services that need them
3. **Test incrementally**: Test each service before moving to next
4. **Monitor bundle size**: Check size before adding dependencies
5. **Use validation script**: Run `bash scripts/validate-microservices.sh`
6. **Keep logs accessible**: Use `wrangler tail` during debugging
7. **Document changes**: Update docs when modifying architecture

---

Need more help? See the full documentation in [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md)
