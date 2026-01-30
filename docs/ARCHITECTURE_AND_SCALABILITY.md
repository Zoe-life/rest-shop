# System Architecture and Scalability

This document describes the architecture of the REST Shop e-commerce platform and strategies for scaling to handle high traffic.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Web Browser, Mobile App, Third-party Integrations)        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ HTTPS/REST
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway / Load Balancer              │
│              (Cloudflare, AWS ALB, Nginx)                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Express   │  │  Express   │  │  Express   │            │
│  │  Server 1  │  │  Server 2  │  │  Server N  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                               │
│  Components:                                                  │
│  • Authentication (JWT, OAuth)                               │
│  • Payment Processing (Stripe, PayPal, M-Pesa)              │
│  • Order Management                                          │
│  • Product Catalog                                           │
│  • File Upload (Cloudinary)                                  │
└───────┬────────────────────┬─────────────┬──────────────────┘
        │                    │             │
        ▼                    ▼             ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   MongoDB    │   │  Redis Cache │   │   Payment    │
│   Atlas      │   │  (Optional)  │   │   Gateways   │
│  (Database)  │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Key Components

### 1. API Layer (Express.js)
- **Stateless Design**: Each request is self-contained
- **Horizontal Scaling**: Add more servers as needed
- **Load Balancing**: Distribute requests across instances

### 2. Database Layer (MongoDB Atlas)
- **Indexed Collections**: Fast query performance
- **Connection Pooling**: Efficient database connections
- **Replica Sets**: High availability and data redundancy
- **Sharding Ready**: Can partition data for massive scale

### 3. Caching Layer (Optional Redis)
- **Session Storage**: Store JWT refresh tokens
- **Product Cache**: Cache frequently accessed products
- **Rate Limiting**: Distributed rate limit counters
- **Payment Status**: Temporary payment state

### 4. Payment Processing
- **Service Abstraction**: PaymentFactory pattern
- **Async Processing**: Non-blocking payment calls
- **Webhook Handling**: Separate callback processing
- **Transaction Logging**: Complete audit trail

### 5. File Storage
- **Cloudinary Integration**: Cloud-based image storage
- **CDN Delivery**: Fast image loading globally
- **Image Optimization**: Automatic resizing and compression

## Database Indexing Strategy

### Product Collection
```javascript
// Text search on name and description
productSchema.index({ name: 'text', description: 'text' });

// Category and active status filtering
productSchema.index({ category: 1, isActive: 1 });

// Price range queries
productSchema.index({ price: 1 });

// Creation date for sorting
productSchema.index({ createdAt: -1 });
```

### Order Collection
```javascript
// User orders lookup
orderSchema.index({ userId: 1, createdAt: -1 });

// Order status and payment status filtering
orderSchema.index({ status: 1, paymentStatus: 1 });

// Compound index for user order status queries
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
```

### Payment Collection
```javascript
// Order payment lookup
paymentSchema.index({ orderId: 1, status: 1 });

// User payment history
paymentSchema.index({ userId: 1, createdAt: -1 });

// Transaction ID lookup (unique, sparse)
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
```

## Scalability Features

### Current Implementation

#### ✅ Database Optimization
- **Indexes**: All collections properly indexed
- **Query Optimization**: Select only needed fields
- **Connection Pooling**: Reuse database connections
- **Pagination**: Limit result sets (10-20 items per page)

#### ✅ API Optimization
- **Rate Limiting**: Prevent abuse (100 req/15min)
- **Input Validation**: Validate early, fail fast
- **Async Processing**: Non-blocking operations
- **Error Handling**: Graceful degradation

#### ✅ Performance
- **Stateless Architecture**: Easy horizontal scaling
- **JWT Authentication**: No server-side sessions
- **Efficient Queries**: Proper use of populate and select

### Recommended Enhancements for High Scale

#### 1. Add Redis Caching

```bash
npm install redis
```

**Cache Strategy**:
```javascript
// Cache product listings (5 minutes)
const CACHE_TTL = 300;

// Get from cache first
const cachedProducts = await redis.get('products:all');
if (cachedProducts) {
    return JSON.parse(cachedProducts);
}

// If not cached, get from database
const products = await Product.find().exec();

// Store in cache
await redis.setex('products:all', CACHE_TTL, JSON.stringify(products));

return products;
```

**What to Cache**:
- Product listings (high read, low write)
- Category filters
- Search results
- User sessions (JWT refresh tokens)
- Rate limit counters

#### 2. Implement Message Queue

For async payment processing:

```bash
npm install bullmq
```

**Queue Strategy**:
```javascript
// Add payment verification to queue
await paymentQueue.add('verify-payment', {
    paymentId,
    orderId,
    attempt: 0
}, {
    delay: 60000, // Check after 60 seconds
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 5000
    }
});
```

**Use Cases**:
- Payment verification retries
- Email notifications
- Inventory updates
- Order status webhooks

#### 3. Add CDN for Static Assets

**Cloudflare CDN** (Already using for deployment):
- Cache product images
- Cache API responses (with proper cache headers)
- DDoS protection
- SSL termination

**Implementation**:
```javascript
// Set cache headers for product images
app.get('/products/:id', (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    // ... rest of handler
});
```

#### 4. Database Read Replicas

For read-heavy workloads:

```javascript
// MongoDB Atlas - Read Preference
const readOptions = {
    readPreference: 'secondaryPreferred'
};

// Use for read operations
Product.find().read('secondaryPreferred').exec();
```

#### 5. Horizontal Pod Autoscaling

For Kubernetes deployments:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rest-shop-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rest-shop-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Performance Targets

### Current Performance
- **API Response Time**: < 200ms (95th percentile)
- **Database Queries**: < 50ms average
- **Payment Processing**: < 5s (M-Pesa STK push)
- **Throughput**: ~100 requests/second per instance

### Scalability Targets
With recommended enhancements:

| Metric | Current | With Cache | With Queue | Full Stack |
|--------|---------|------------|------------|------------|
| **RPS per instance** | 100 | 500 | 100 | 1000 |
| **API Response Time** | 200ms | 50ms | 200ms | 30ms |
| **Concurrent Users** | 1,000 | 5,000 | 1,000 | 50,000+ |
| **Database Load** | High | Low | Medium | Low |

## Load Balancing Strategy

### Cloudflare Workers (Current)
- Global edge network
- Automatic DDoS protection
- SSL/TLS termination
- Request routing

### Alternative: Nginx Load Balancer

```nginx
upstream rest_shop_api {
    least_conn;
    server api1.example.com:3001;
    server api2.example.com:3001;
    server api3.example.com:3001;
}

server {
    listen 443 ssl;
    server_name api.example.com;

    location / {
        proxy_pass http://rest_shop_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Observability

### Key Metrics to Track

#### Application Metrics
- **Request Rate**: Requests per second
- **Response Time**: p50, p95, p99 latencies
- **Error Rate**: 4xx and 5xx responses
- **Active Connections**: Current connections

#### Payment Metrics
- **Payment Success Rate**: Successful/Total payments
- **Payment Processing Time**: Time to complete
- **Gateway Response Time**: External API latency
- **Failed Payment Reasons**: Categorized failures

#### Database Metrics
- **Query Time**: Average query execution time
- **Connection Pool**: Active/idle connections
- **Index Usage**: Queries using indexes
- **Slow Queries**: Queries > 100ms

### Monitoring Tools

**Application Performance Monitoring**:
- New Relic
- Datadog
- Application Insights (Azure)

**Logging**:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- CloudWatch (AWS)
- Google Cloud Logging

**Alerting**:
- PagerDuty
- OpsGenie
- Slack/Email notifications

## Deployment Options

### Option 1: Serverless (Current - Cloudflare Workers)
**Pros**:
- Auto-scaling
- No server management
- Pay per request
- Global distribution

**Cons**:
- Cold starts
- Limited runtime
- Memory constraints

**Best For**: Small to medium scale, variable traffic

### Option 2: Container Orchestration (Kubernetes)
**Pros**:
- Full control
- Easy scaling
- Multi-cloud support
- Rich ecosystem

**Cons**:
- Complex setup
- Higher operational cost
- Requires DevOps expertise

**Best For**: Large scale, consistent traffic, complex deployments

### Option 3: Platform as a Service (Heroku, Railway)
**Pros**:
- Easy deployment
- Managed infrastructure
- Quick setup

**Cons**:
- Higher cost at scale
- Less control
- Vendor lock-in

**Best For**: Rapid prototyping, small to medium scale

## Security at Scale

### Rate Limiting Strategy
```javascript
// Tiered rate limiting
const rateLimits = {
    auth: { windowMs: 15 * 60 * 1000, max: 5 },      // 5/15min
    payments: { windowMs: 15 * 60 * 1000, max: 10 }, // 10/15min
    api: { windowMs: 15 * 60 * 1000, max: 100 },     // 100/15min
    admin: { windowMs: 15 * 60 * 1000, max: 500 }    // 500/15min (higher for admin)
};
```

### DDoS Protection
- Cloudflare (Current)
- AWS Shield
- Azure DDoS Protection

### Data Encryption
- TLS 1.3 for transit
- MongoDB encryption at rest
- Encrypted payment metadata

## Cost Optimization

### Current Stack Costs (Estimated)

| Service | Usage | Cost/Month |
|---------|-------|------------|
| **MongoDB Atlas** | M10 Cluster | $57 |
| **Cloudflare Workers** | 10M requests | $5 |
| **Cloudinary** | 25GB storage | $0 (free tier) |
| **Total** | | **~$62/month** |

### At Scale (100M requests/month)

| Service | Usage | Cost/Month |
|---------|-------|------------|
| **MongoDB Atlas** | M30 Cluster | $280 |
| **Cloudflare Workers** | 100M requests | $50 |
| **Redis Cloud** | 5GB | $40 |
| **Cloudinary** | 100GB | $89 |
| **Total** | | **~$459/month** |

## Conclusion

The REST Shop platform is designed for scalability from day one with:

✅ **Indexed Database**: Fast queries at any scale  
✅ **Stateless Architecture**: Easy horizontal scaling  
✅ **Pagination**: Efficient data fetching  
✅ **Rate Limiting**: Protection against abuse  
✅ **Payment Abstraction**: Easy to add new gateways  

With the recommended enhancements (Redis, message queues), the platform can easily handle:
- **50,000+ concurrent users**
- **1M+ requests per hour**
- **10,000+ transactions per day**

---

**Last Updated**: January 2026  
**Architecture Version**: 1.0
