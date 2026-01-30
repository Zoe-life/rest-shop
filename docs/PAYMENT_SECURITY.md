# Payment Security Implementation

## Overview
This document describes the security measures implemented for payment processing, particularly for webhook endpoints.

## M-Pesa Webhook Security

### 1. IP Allowlist Protection
The M-Pesa callback endpoint (`POST /payments/mpesa/callback`) is protected by IP allowlist validation.

#### Configuration
Set the `MPESA_ALLOWED_IPS` environment variable with comma-separated list of M-Pesa server IPs:

```bash
MPESA_ALLOWED_IPS=196.201.214.200,196.201.214.206,196.201.213.114
```

#### M-Pesa Server IPs
Obtain the official M-Pesa server IP addresses from Safaricom Daraja API documentation:
- **Sandbox Environment**: Contact Safaricom for sandbox IPs
- **Production Environment**: Must be obtained from official Safaricom documentation

⚠️ **Important**: Always verify IP addresses from official Safaricom sources before deploying to production.

#### Behavior
- **Development**: If `MPESA_ALLOWED_IPS` is not set, a warning is logged but requests are allowed
- **Production**: If `MPESA_ALLOWED_IPS` is not set, a warning is logged (should be configured!)
- **Any Environment**: If `MPESA_ALLOWED_IPS` is set, only requests from listed IPs are accepted

### 2. Additional Security Measures

#### Request Validation
- Webhook requests are validated for proper structure
- Only expected callback data format is processed
- Invalid requests return appropriate error codes to M-Pesa

#### PII Protection
- Sensitive data (phone numbers, transaction IDs) is not logged
- Callback data is sanitized before any logging
- Only essential metadata is stored in the database

#### Error Handling
- All webhook errors are handled gracefully
- M-Pesa always receives success response to avoid retry storms
- Internal errors are logged for debugging without exposing sensitive data

## Authorization Checks

### Payment Verification
The payment verification endpoint (`GET /payments/verify/:paymentId`) includes authorization checks:
- Users can only verify their own payments
- Admin users can verify any payment
- Unauthorized access attempts return 403 Forbidden

### Payment Retrieval
The get payment endpoint (`GET /payments/:paymentId`) includes authorization checks:
- Users can only view their own payments
- Admin users can view any payment
- Unauthorized access attempts return 403 Forbidden

## Secure Error Handling

### User-Facing Errors
- Generic error messages are returned to users
- No internal error details or stack traces are exposed
- Specific error information is only logged internally

### Example
```javascript
// ❌ Bad - Exposes internal details
res.status(500).json({ error: error.message });

// ✅ Good - Generic message
res.status(500).json({ 
    message: 'Server error occurred while processing payment' 
});
```

## Secure Logging

### Sensitive Fields
The following fields are automatically redacted from logs:
- `password`, `hash`, `token`
- `accessToken`, `refreshToken`, `secret`
- `apiKey`, `privateKey`
- `phoneNumber`, `phone`
- `mpesaReceiptNumber`, `transactionId`, `checkoutRequestId`

### Audit Trails
All payment operations are logged with:
- User ID of the actor
- Timestamp
- Operation outcome (success/failure)
- Payment ID and relevant identifiers

## Deployment Recommendations

### Required Environment Variables
```bash
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-domain.com/payments/mpesa/callback
MPESA_ENVIRONMENT=production

# Security Configuration
MPESA_ALLOWED_IPS=196.201.214.200,196.201.214.206
```

### Additional Security Layers

1. **Reverse Proxy Configuration**
   - Configure Nginx/Apache to block unauthorized IPs at the network level
   - Use fail2ban for automatic IP blocking on suspicious activity

2. **SSL/TLS**
   - Always use HTTPS for webhook endpoints
   - Ensure valid SSL certificates are installed

3. **Rate Limiting**
   - Webhook endpoints should have appropriate rate limits
   - Prevent abuse from repeated invalid requests

4. **Monitoring**
   - Set up alerts for webhook validation failures
   - Monitor for unusual patterns in callback requests
   - Track failed authorization attempts

5. **Regular Updates**
   - Keep M-Pesa IP allowlist updated
   - Review Safaricom documentation for changes
   - Update security configurations as needed

## Testing

### Development Testing
When testing webhooks in development:
1. Leave `MPESA_ALLOWED_IPS` empty or use your development IP
2. Monitor logs for security warnings
3. Test with invalid IPs to ensure blocking works

### Production Testing
1. Use M-Pesa sandbox environment first
2. Verify IP allowlist configuration
3. Test with both valid and invalid source IPs
4. Monitor logs for security events

## Security Incident Response

If unauthorized webhook access is detected:
1. Review audit logs for the incident
2. Verify `MPESA_ALLOWED_IPS` configuration
3. Check for IP spoofing attempts
4. Update IP allowlist if needed
5. Report to Safaricom if suspicious activity detected

## Compliance

This implementation addresses the following security compliance requirements:
- ✅ Webhook forgery risk mitigation via IP allowlist
- ✅ Sensitive data exposure prevention
- ✅ Comprehensive audit trails with user context
- ✅ Robust error handling with null checks
- ✅ Secure error messages without internal details
- ✅ Secure logging practices without PII
- ✅ Authorization checks for payment operations
