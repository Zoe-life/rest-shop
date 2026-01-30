# Production Payment Gateway Setup

This guide explains how to enable production payment gateways (Stripe and PayPal) by installing the official SDKs.

## Overview

The REST Shop includes **mock implementations** of Stripe and PayPal services that work out of the box for development and testing. To enable **real payment processing**, you need to install the official SDKs and configure your credentials.

## Current Status

| Gateway | Status | Action Required |
|---------|--------|-----------------|
| **M-Pesa** | ✅ Production Ready | Configure credentials only |
| **Stripe** | ⚠️ Mock Implementation | Install SDK + Configure |
| **PayPal** | ⚠️ Mock Implementation | Install SDK + Configure |

## Enabling Stripe

### Step 1: Install Stripe SDK

```bash
npm install stripe
```

### Step 2: Update Configuration

Create a Stripe account at [https://stripe.com](https://stripe.com) and get your API keys.

Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_51... # Your secret key
STRIPE_PUBLISHABLE_KEY=pk_test_51... # Your publishable key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret
```

### Step 3: Update Service Implementation

Edit `api/services/stripeService.js`:

```javascript
// Remove or comment out this line:
// this is a mock implementation

// Add at the top of the constructor:
const stripe = require('stripe');
this.stripe = stripe(this.apiKey);
```

Then uncomment the production code blocks (marked with comments like `// In production, use:`).

### Step 4: Setup Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/payments/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.failed`
4. Copy the webhook signing secret to your `.env`

### Step 5: Test

```bash
# Test in sandbox mode first
stripe listen --forward-to localhost:3001/payments/stripe/webhook
```

---

## Enabling PayPal

### Step 1: Install PayPal SDK

```bash
npm install @paypal/checkout-server-sdk
```

### Step 2: Update Configuration

Create a PayPal developer account at [https://developer.paypal.com](https://developer.paypal.com).

Add to `.env`:
```env
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_ENVIRONMENT=sandbox # Use 'production' for live
```

### Step 3: Update Service Implementation

Edit `api/services/paypalService.js`:

```javascript
// Add at the top:
const paypal = require('@paypal/checkout-server-sdk');

// In the constructor, uncomment:
const Environment = this.environment === 'production' 
    ? paypal.core.LiveEnvironment 
    : paypal.core.SandboxEnvironment;
    
this.client = new paypal.core.PayPalHttpClient(
    new Environment(this.clientId, this.clientSecret)
);
```

Then uncomment the production code blocks throughout the file.

### Step 4: Setup Webhook

1. Go to PayPal Developer Dashboard > Apps & Credentials
2. Select your app
3. Add webhook: `https://yourdomain.com/payments/paypal/webhook`
4. Select events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

### Step 5: Create Routes for PayPal Webhook

Add to `api/routes/payments.js`:

```javascript
/**
 * @route POST /payments/paypal/webhook
 * @desc Handle PayPal payment webhook
 */
router.post('/paypal/webhook', PaymentsController.payments_paypal_webhook);
```

Add handler to `api/controllers/payments.js`:

```javascript
exports.payments_paypal_webhook = async (req, res) => {
    try {
        const webhookData = req.body;
        const headers = req.headers;
        
        const paypalService = PaymentFactory.getPaymentService('paypal');
        const result = await paypalService.handleWebhook(webhookData, headers);
        
        // Update payment and order status based on result
        // ... similar to M-Pesa callback handler
        
        res.status(200).json({ success: true });
    } catch (error) {
        logError('PayPal webhook processing failed', error);
        res.status(200).json({ success: true }); // Always return 200
    }
};
```

---

## Testing Payment Gateways

### Stripe Test Cards

| Card Number | Brand | Result |
|-------------|-------|--------|
| 4242 4242 4242 4242 | Visa | Success |
| 4000 0000 0000 0002 | Visa | Declined |
| 4000 0000 0000 9995 | Visa | Insufficient funds |

**Test Details**:
- CVV: Any 3 digits
- Expiry: Any future date
- ZIP: Any 5 digits

### PayPal Sandbox Accounts

PayPal provides test accounts in the sandbox:

1. Go to PayPal Developer Dashboard
2. Navigate to "Sandbox > Accounts"
3. Create personal and business test accounts
4. Use these credentials for testing

**Test Credentials**:
- Email: Provided by PayPal sandbox
- Password: Provided by PayPal sandbox

### M-Pesa Sandbox

See [M-Pesa Setup Guide](./MPESA_SETUP_GUIDE.md) for complete testing instructions.

---

## Production Checklist

Before going live with real payments:

### General
- [ ] Environment variables configured correctly
- [ ] SSL certificate installed and valid
- [ ] Webhook URLs publicly accessible
- [ ] Database backups configured
- [ ] Transaction logging verified
- [ ] Error monitoring setup (e.g., Sentry)

### Stripe
- [ ] Stripe SDK installed (`npm install stripe`)
- [ ] Production API keys configured
- [ ] Webhook endpoint created and verified
- [ ] Webhook signing secret configured
- [ ] Test transactions completed successfully
- [ ] Account verified and activated by Stripe

### PayPal
- [ ] PayPal SDK installed (`npm install @paypal/checkout-server-sdk`)
- [ ] Production credentials configured
- [ ] Business account verified
- [ ] Webhook endpoint created and verified
- [ ] Test transactions completed successfully
- [ ] IPN settings configured

### M-Pesa
- [ ] Production credentials obtained from Safaricom
- [ ] Business shortcode registered
- [ ] Callback URL whitelisted
- [ ] Live testing with real phone numbers
- [ ] Production approval received from Safaricom

---

## Security Considerations

### PCI Compliance

When handling real card payments:

1. **Never store card numbers** - Always use tokens
2. **Use HTTPS everywhere** - All payment pages must use SSL
3. **Validate on server-side** - Never trust client-side validation alone
4. **Log sensitively** - Don't log full card numbers or CVV
5. **Keep SDKs updated** - Regularly update payment gateway SDKs

### Webhook Security

Protect your webhooks:

```javascript
// Stripe webhook verification
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
    req.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
);

// PayPal webhook verification
const isValid = await paypalClient.verifyWebhookSignature(
    req.headers,
    req.body
);

// M-Pesa IP whitelisting
const SAFARICOM_IPS = ['196.201.214.200', /* ... */];
if (!SAFARICOM_IPS.includes(req.ip)) {
    return res.status(403).json({ error: 'Forbidden' });
}
```

### Rate Limiting

Implement stricter rate limits for payment endpoints:

```javascript
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit to 10 requests per window
    message: 'Too many payment requests, please try again later'
});

app.use('/payments', paymentLimiter);
```

---

## Monitoring and Logging

### Transaction Logging

All payment operations are automatically logged:

```javascript
logInfo('Payment initiated', { 
    orderId, 
    paymentMethod, 
    amount 
});

logError('Payment failed', {
    orderId,
    error: error.message,
    stack: error.stack
});
```

### Recommended Monitoring Tools

- **Application Monitoring**: New Relic, Datadog
- **Error Tracking**: Sentry, Rollbar
- **Payment Analytics**: Stripe Dashboard, PayPal Reports
- **Custom Dashboards**: Grafana, Kibana

### Key Metrics to Monitor

- Payment success rate
- Average payment processing time
- Failed payment reasons
- Webhook delivery success rate
- API error rates

---

## Troubleshooting

### Common Issues

#### "Invalid API credentials"
- Verify environment variables are set correctly
- Check if using test vs. production keys
- Ensure no trailing spaces in credentials

#### "Webhook not received"
- Verify URL is publicly accessible
- Check SSL certificate is valid
- Ensure firewall allows gateway IPs
- Check server logs for incoming requests

#### "Payment succeeded but order not updated"
- Check webhook handler is processing correctly
- Verify database connection is stable
- Check transaction logs for errors

### Getting Help

- **Stripe**: [https://support.stripe.com](https://support.stripe.com)
- **PayPal**: [https://developer.paypal.com/support](https://developer.paypal.com/support)
- **M-Pesa**: apisupport@safaricom.co.ke
- **REST Shop Issues**: [GitHub Issues](https://github.com/Zoe-life/rest-shop/issues)

---

## Cost Considerations

### Payment Processing Fees

| Gateway | Transaction Fee | Additional Fees |
|---------|----------------|-----------------|
| **Stripe** | 2.9% + $0.30 | Currency conversion: +1% |
| **PayPal** | 2.9% + $0.30 | International: +1.5% |
| **M-Pesa** | Varies by country | Safaricom charges apply |

### Development Costs

- **Stripe**: Free sandbox, unlimited testing
- **PayPal**: Free sandbox, unlimited testing
- **M-Pesa**: Free sandbox, production fees apply

---

## Next Steps

1. Choose which payment gateways to enable
2. Install required SDKs
3. Configure credentials
4. Update service implementations
5. Test in sandbox environments
6. Setup webhooks and monitoring
7. Complete production checklist
8. Go live!

---

**Last Updated**: January 2026  
**Maintained By**: REST Shop Team
