# M-Pesa Payment Integration Guide

This guide explains how to integrate M-Pesa payments using the Safaricom Daraja API for the REST Shop e-commerce platform.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Getting Started with Daraja API](#getting-started-with-daraja-api)
- [Configuration](#configuration)
- [Testing in Sandbox](#testing-in-sandbox)
- [Going to Production](#going-to-production)
- [API Endpoints](#api-endpoints)
- [Webhook Configuration](#webhook-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

M-Pesa is Kenya's leading mobile money service. This integration uses the **Lipa Na M-Pesa Online (STK Push)** API, which allows customers to make payments directly from their M-Pesa mobile wallets.

### Features
- STK Push payment initiation
- Payment status verification
- Webhook callback handling
- Transaction tracking and logging
- Automatic order status updates

## Prerequisites

1. **Safaricom Developer Account**
   - Sign up at [https://developer.safaricom.co.ke](https://developer.safaricom.co.ke)
   - Verify your email address

2. **M-Pesa Account** (for production)
   - Business Till Number or Paybill Number
   - Registered with Safaricom

3. **Technical Requirements**
   - Node.js application (already set up)
   - Public HTTPS endpoint for callbacks
   - SSL certificate (Let's Encrypt recommended)

## Getting Started with Daraja API

### Step 1: Create a Daraja App

1. Log in to the [Daraja Portal](https://developer.safaricom.co.ke)
2. Navigate to **"My Apps"**
3. Click **"Add a New App"**
4. Fill in the details:
   - **App Name**: Your application name (e.g., "REST Shop Payment")
   - **Description**: Brief description of your app

### Step 2: Get API Credentials

After creating the app, you'll receive:
- **Consumer Key**: Used for authentication
- **Consumer Secret**: Used for authentication

These credentials are different for sandbox and production.

### Step 3: Register URLs (Production Only)

For production, you need to register callback URLs:
1. Go to the Daraja Portal
2. Navigate to **"Lipa Na M-Pesa Online"**
3. Register your callback URLs:
   - **Validation URL**: `https://yourdomain.com/api/mpesa/validate`
   - **Confirmation URL**: `https://yourdomain.com/api/mpesa/confirm`

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# M-Pesa Sandbox Configuration
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://yourdomain.com/payments/mpesa/callback
```

### Configuration Details

| Variable | Description | Sandbox Value | Production Value |
|----------|-------------|---------------|------------------|
| `MPESA_CONSUMER_KEY` | OAuth consumer key | From Daraja Portal | From Daraja Portal |
| `MPESA_CONSUMER_SECRET` | OAuth consumer secret | From Daraja Portal | From Daraja Portal |
| `MPESA_SHORTCODE` | Business short code | 174379 (test) | Your Till/Paybill |
| `MPESA_PASSKEY` | Lipa Na M-Pesa passkey | See above | From Daraja Portal |
| `MPESA_ENVIRONMENT` | Environment | `sandbox` | `production` |
| `MPESA_CALLBACK_URL` | Webhook endpoint | Your ngrok URL | Your domain URL |

## Testing in Sandbox

### Sandbox Credentials

**Test Shortcode**: 174379  
**Test Passkey**: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`

### Test Phone Numbers

Use these phone numbers for sandbox testing:

| Phone Number | Result |
|--------------|--------|
| 254708374149 | Success |
| 254711222333 | Insufficient Balance |
| 254799999999 | Invalid Account |

### Testing Steps

1. **Set up ngrok for local callback testing**
   ```bash
   ngrok http 3001
   ```
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

2. **Update your .env file**
   ```env
   MPESA_CALLBACK_URL=https://abc123.ngrok.io/payments/mpesa/callback
   ```

3. **Start your application**
   ```bash
   npm start
   ```

4. **Initiate a test payment**
   ```bash
   curl -X POST http://localhost:3001/payments/initiate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "orderId": "ORDER_ID",
       "paymentMethod": "mpesa",
       "paymentData": {
         "phoneNumber": "254708374149",
         "amount": 100
       }
     }'
   ```

5. **Check for STK push on test phone**
   - An STK push prompt should appear on the test device
   - Enter PIN: 1234 (sandbox test PIN)

6. **Verify callback received**
   - Check your server logs for callback data
   - Check payment status in database

## Going to Production

### Prerequisites

1. **Business Registration**
   - Register your business with Safaricom
   - Obtain a Paybill or Till number
   - Complete KYC verification

2. **Daraja Production Approval**
   - Submit your app for production approval
   - Wait for Safaricom approval (1-2 weeks)

### Production Setup

1. **Update Environment Variables**
   ```env
   MPESA_CONSUMER_KEY=your_production_consumer_key
   MPESA_CONSUMER_SECRET=your_production_consumer_secret
   MPESA_SHORTCODE=your_paybill_or_till_number
   MPESA_PASSKEY=your_production_passkey
   MPESA_ENVIRONMENT=production
   MPESA_CALLBACK_URL=https://yourdomain.com/payments/mpesa/callback
   ```

2. **Configure SSL**
   - Ensure your server has a valid SSL certificate
   - M-Pesa only calls HTTPS URLs

3. **Whitelist Safaricom IPs** (Optional but recommended)
   - Configure firewall to only accept callbacks from Safaricom IPs
   - Contact Safaricom for their IP ranges

## API Endpoints

### Initiate Payment

**POST** `/payments/initiate`

```json
{
  "orderId": "ORDER_ID",
  "paymentMethod": "mpesa",
  "paymentData": {
    "phoneNumber": "254712345678",
    "amount": 1000
  }
}
```

**Response**:
```json
{
  "message": "Payment initiated successfully",
  "payment": {
    "_id": "PAYMENT_ID",
    "transactionId": "ws_CO_DMZ_123456_12345678",
    "status": "pending"
  },
  "paymentDetails": {
    "customerMessage": "Success. Request accepted for processing"
  }
}
```

### Verify Payment

**GET** `/payments/verify/:paymentId`

**Response**:
```json
{
  "message": "Payment verified successfully",
  "payment": {
    "_id": "PAYMENT_ID",
    "status": "completed",
    "transactionId": "ws_CO_DMZ_123456_12345678"
  },
  "verification": {
    "success": true,
    "status": "completed",
    "resultCode": "0"
  }
}
```

### M-Pesa Callback (Webhook)

**POST** `/payments/mpesa/callback`

This endpoint is called by M-Pesa after payment processing.

**Callback Payload**:
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_DMZ_123456_12345678",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 1000},
          {"Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV"},
          {"Name": "TransactionDate", "Value": 20210906152459},
          {"Name": "PhoneNumber", "Value": 254712345678}
        ]
      }
    }
  }
}
```

## Webhook Configuration

### Setup with Ngrok (Development)

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3001

# Use the HTTPS URL in your .env
MPESA_CALLBACK_URL=https://abc123.ngrok.io/payments/mpesa/callback
```

### Production Webhook Requirements

1. **HTTPS Only**: M-Pesa only calls HTTPS URLs
2. **Valid SSL**: Certificate must be valid (not self-signed)
3. **Publicly Accessible**: URL must be accessible from internet
4. **Return 200**: Always return HTTP 200, even on errors
5. **Fast Response**: Process within 30 seconds

### Webhook Security

```javascript
// Recommended: Verify Safaricom IP addresses
const SAFARICOM_IPS = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.129',
  '196.201.212.136',
  '196.201.212.74',
  '196.201.212.69'
];

// In your callback handler
if (!SAFARICOM_IPS.includes(req.ip)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

## Troubleshooting

### Common Errors

#### Error: "Invalid Access Token"
**Solution**: Check your Consumer Key and Consumer Secret

#### Error: "Bad Request - Invalid PhoneNumber"
**Solution**: 
- Ensure phone number is in format: 254XXXXXXXXX
- Remove any spaces, dashes, or + signs
- Use Kenyan numbers only (254 prefix)

#### Error: "The initiator information is invalid"
**Solution**: Check your shortcode and passkey

#### Error: "Request cancelled by user"
**Result Code**: 1032  
**Solution**: This is normal - user cancelled the payment

#### No STK Push Received
**Checks**:
1. Verify phone number is correct (254 format)
2. Phone must be on Safaricom network
3. Phone must have active M-Pesa PIN
4. Check if phone has sufficient balance

### Callback Not Received

**Checks**:
1. Verify callback URL is publicly accessible
2. Check if URL has valid SSL certificate
3. Ensure server is returning HTTP 200
4. Check server logs for incoming requests
5. Verify ngrok is running (development)

### Testing Callbacks Locally

Use the M-Pesa Callback Simulator from Daraja Portal:
1. Go to Daraja Portal > API > Lipa Na M-Pesa Online
2. Use the callback simulator
3. Enter your callback URL
4. Send test callback

## Best Practices

### 1. Handle Timeouts
```javascript
// Users have 60 seconds to enter PIN
// Handle timeout gracefully
setTimeout(() => {
  checkPaymentStatus(paymentId);
}, 65000); // Check after 65 seconds
```

### 2. Implement Retry Logic
```javascript
// Retry verification if initial check fails
async function verifyWithRetry(paymentId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await verifyPayment(paymentId);
    if (result.success) return result;
    await sleep(5000); // Wait 5 seconds between retries
  }
  throw new Error('Verification failed after retries');
}
```

### 3. Log Everything
```javascript
// Log all M-Pesa interactions
logInfo('M-Pesa STK initiated', { orderId, phone, amount });
logInfo('M-Pesa callback received', { checkoutRequestId, resultCode });
```

### 4. Handle All Result Codes
```javascript
const MPESA_RESULT_CODES = {
  0: 'Success',
  1: 'Insufficient Balance',
  1032: 'Cancelled by user',
  1037: 'Timeout',
  2001: 'Invalid initiator'
  // ... handle more codes
};
```

## Support and Resources

- **Daraja Portal**: [https://developer.safaricom.co.ke](https://developer.safaricom.co.ke)
- **API Documentation**: [https://developer.safaricom.co.ke/APIs](https://developer.safaricom.co.ke/APIs)
- **Support Email**: apisupport@safaricom.co.ke
- **Community**: [Daraja Developer Community](https://developer.safaricom.co.ke/community)

## License

This integration is part of the REST Shop project under ISC License.

---

**Note**: Always test thoroughly in sandbox before going to production. Safaricom charges for production API calls.
