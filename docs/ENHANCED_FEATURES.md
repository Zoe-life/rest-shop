# Enhanced Features Documentation

## Table of Contents
1. [Email Verification](#email-verification)
2. [Password Reset](#password-reset)
3. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
4. [Real-Time Notifications](#real-time-notifications)
5. [Response Caching](#response-caching)
6. [API Versioning](#api-versioning)

## Email Verification

### Overview
Users can verify their email addresses to enhance account security.

### Environment Variables
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@rest-shop.com
FRONTEND_URL=http://localhost:3000
```

### Endpoints

#### Request Email Verification
```http
POST /user/request-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent successfully"
}
```

#### Verify Email
```http
GET /user/verify-email/:token
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

---

## Password Reset

### Overview
Secure password reset functionality with time-limited tokens.

### Endpoints

#### Request Password Reset
```http
POST /user/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent successfully"
}
```

#### Reset Password
```http
POST /user/reset-password/:token
Content-Type: application/json

{
  "password": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

**Notes:**
- Reset tokens expire after 1 hour
- Passwords must be at least 8 characters long
- Security: Endpoints don't reveal if an email exists in the system

---

## Two-Factor Authentication (2FA)

### Overview
TOTP-based two-factor authentication with backup codes for enhanced security.

### Endpoints

#### Setup 2FA
```http
POST /user/2fa/setup
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "2FA setup initiated",
  "secret": "BASE32_SECRET",
  "qrCode": "data:image/png;base64,..."
}
```

**Usage:**
1. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
2. Use the code from the app to enable 2FA

#### Enable 2FA
```http
POST /user/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}
```

**Response:**
```json
{
  "message": "2FA enabled successfully",
  "backupCodes": [
    "BACKUP1",
    "BACKUP2",
    ...10 codes total
  ]
}
```

**Important:** Save backup codes in a secure location. They can be used if you lose access to your authenticator app.

#### Verify 2FA Token
```http
POST /user/2fa/verify
Content-Type: application/json

{
  "userId": "user_id",
  "token": "123456"
}
```

**Response:**
```json
{
  "message": "2FA verified successfully",
  "verified": true
}
```

**Notes:**
- Accepts both TOTP codes and backup codes
- Backup codes are single-use

#### Disable 2FA
```http
POST /user/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "YourPassword123!"
}
```

**Response:**
```json
{
  "message": "2FA disabled successfully"
}
```

---

## Real-Time Notifications

### Overview
WebSocket-based real-time notifications for order and payment status updates.

### Client Setup

#### JavaScript Example
```javascript
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling']
});

// Authenticate
socket.emit('authenticate', { userId: 'your-user-id' });

socket.on('authenticated', (data) => {
  console.log('Authentication successful:', data);
});

// Listen for order updates
socket.on('order:status-updated', (data) => {
  console.log('Order updated:', data);
  // data: { orderId, status, message, timestamp }
});

// Listen for payment updates
socket.on('payment:status-updated', (data) => {
  console.log('Payment updated:', data);
});

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

### Event Types

#### `order:status-updated`
Emitted when an order status changes.

**Payload:**
```json
{
  "orderId": "order_id",
  "status": "shipped",
  "message": "Your order status has been updated to shipped",
  "timestamp": "2026-02-08T21:00:00.000Z"
}
```

#### `payment:status-updated`
Emitted when a payment status changes.

**Payload:**
```json
{
  "paymentId": "payment_id",
  "status": "completed",
  "message": "Payment completed successfully",
  "timestamp": "2026-02-08T21:00:00.000Z"
}
```

### Environment Variables
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## Response Caching

### Overview
Redis-based response caching for improved performance.

### Environment Variables
```env
REDIS_URL=redis://localhost:6379
# OR individual settings:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password (optional)
```

### How It Works
- GET requests are automatically cached
- Cache invalidation on POST, PATCH, DELETE operations
- Default TTL: 5 minutes (configurable per route)

### Cache Control
To bypass cache for a specific request, add `?nocache=true` query parameter:
```http
GET /products?nocache=true
```

### Cached Endpoints
- `GET /products` - Cached for 5 minutes
- `GET /products/:id` - Cached for 10 minutes
- `GET /orders` - No caching (user-specific data)

### Monitoring Cache
The cache service logs all operations (hits, misses, sets, deletions).

---

## API Versioning

### Overview
API versioning for backward compatibility as the API evolves.

### Versioned Endpoints
All API endpoints are available under `/api/v1`:

```http
GET /api/v1/products
POST /api/v1/orders
GET /api/v1/user/2fa/setup
```

### Backward Compatibility
Legacy endpoints (without version prefix) are still supported:

```http
GET /products  # Still works
POST /orders   # Still works
```

### Version Info
```http
GET /api/v1
```

**Response:**
```json
{
  "version": "1.0.0",
  "apiVersion": "v1",
  "endpoints": [
    "/api/v1/products",
    "/api/v1/orders",
    "/api/v1/user",
    "/api/v1/auth",
    "/api/v1/payments"
  ]
}
```

### Best Practices
- Use versioned endpoints for new integrations
- Legacy endpoints maintained for existing integrations
- Future versions will be added as `/api/v2`, etc.

---

## Testing

### Running Tests
```bash
npm test
```

### Test Coverage
Tests are provided for:
- Email verification flow
- Password reset flow
- 2FA setup, enable, verify, disable
- WebSocket connections
- Cache operations

### Integration Tests
```bash
npm run test:integration  # (to be added)
```

---

## Security Considerations

### Email Verification
- Tokens expire after 24 hours
- Tokens are cryptographically secure (32 bytes)
- Tokens are invalidated after use

### Password Reset
- Tokens expire after 1 hour
- Rate limited to prevent abuse
- Does not reveal if email exists

### 2FA
- TOTP implementation follows RFC 6238
- Backup codes are single-use
- Requires password confirmation to disable
- Time window: ±2 intervals (60 seconds)

### WebSocket
- Authentication required before receiving notifications
- CORS configured for allowed origins
- User isolation (users only receive their own notifications)

### Caching
- Sensitive data not cached
- User-specific data not cached
- Cache keys include request context

---

## Troubleshooting

### Email Not Sending
1. Check SMTP configuration
2. Verify email service credentials
3. Check logs for email service errors
4. In development, emails are logged to console

### 2FA Not Working
1. Ensure server time is synchronized (TOTP is time-based)
2. Check that the secret is properly stored
3. Try using a backup code

### WebSocket Connection Fails
1. Check CORS configuration
2. Verify allowed origins
3. Check firewall rules
4. Try polling transport first

### Cache Not Working
1. Verify Redis is running
2. Check Redis connection settings
3. Review cache logs
4. Cache gracefully degrades if Redis is unavailable

---

## Performance Metrics

### With Caching
- Product list endpoint: ~50-100ms (cached) vs 200-500ms (uncached)
- Individual product: ~20-50ms (cached) vs 100-200ms (uncached)
- Cache hit rate: Expected 70-90% for popular endpoints

### WebSocket Benefits
- Real-time updates (< 100ms latency)
- Reduced polling overhead
- Lower server load compared to HTTP polling

---

## Future Enhancements

Planned features:
- [ ] Email templates with HTML formatting
- [ ] SMS-based 2FA option
- [ ] WebSocket message persistence
- [ ] Advanced cache strategies (LRU, LFU)
- [ ] Cache warming on application start
- [ ] API rate limiting per version
