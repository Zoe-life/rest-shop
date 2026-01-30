# Payment Integration API Documentation

Complete API reference for the payment system including Stripe, PayPal, and M-Pesa integrations.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Payment Methods](#payment-methods)
- [API Endpoints](#api-endpoints)
- [Order Endpoints](#order-endpoints)
- [Product Endpoints](#product-endpoints)
- [Error Handling](#error-handling)
- [Testing](#testing)

## Overview

The REST Shop now supports multiple payment gateways:
- **Stripe**: Credit/Debit card payments
- **PayPal**: PayPal account payments
- **M-Pesa**: Mobile money for Kenyan users

All payment operations are secured with JWT authentication and include comprehensive transaction logging.

## Authentication

All payment endpoints require JWT authentication via Bearer token.

**Header**:
```
Authorization: Bearer <JWT_TOKEN>
```

Get a token by logging in:
```bash
POST /user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

## Payment Methods

### Supported Methods

| Method | Description | Currency | Region |
|--------|-------------|----------|--------|
| `stripe` | Credit/Debit cards | USD, EUR, GBP, KES | Global |
| `card` | Alias for Stripe | USD, EUR, GBP, KES | Global |
| `paypal` | PayPal account | USD, EUR, GBP | Global |
| `mpesa` | Mobile money | KES | Kenya |

## API Endpoints

### Initiate Payment

Create a payment for an existing order.

**Endpoint**: `POST /payments/initiate`

**Authentication**: Required

**Request Body**:
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "paymentMethod": "mpesa",
  "paymentData": {
    "phoneNumber": "254712345678",
    "amount": 1000
  }
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | string | Yes | MongoDB ObjectId of the order |
| `paymentMethod` | string | Yes | Payment method: `stripe`, `paypal`, or `mpesa` |
| `paymentData` | object | Yes | Payment-specific data (varies by method) |

**Payment Data by Method**:

#### Stripe/Card
```json
{
  "paymentMethodId": "pm_card_visa",
  "saveCard": false
}
```

#### PayPal
```json
{
  "returnUrl": "https://yoursite.com/payment/success",
  "cancelUrl": "https://yoursite.com/payment/cancel"
}
```

#### M-Pesa
```json
{
  "phoneNumber": "254712345678"
}
```

**Success Response** (201 Created):
```json
{
  "message": "Payment initiated successfully",
  "payment": {
    "_id": "507f1f77bcf86cd799439012",
    "orderId": "507f1f77bcf86cd799439011",
    "paymentMethod": "mpesa",
    "status": "pending",
    "amount": 1000,
    "currency": "KES",
    "transactionId": "ws_CO_DMZ_123456_12345678"
  },
  "paymentDetails": {
    "customerMessage": "Success. Request accepted for processing",
    "approvalUrl": null,
    "clientSecret": null
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "message": "Payment method 'unknown' is not supported",
  "supportedMethods": ["stripe", "card", "paypal", "mpesa"]
}
```

---

### Verify Payment

Check the status of a payment.

**Endpoint**: `GET /payments/verify/:paymentId`

**Authentication**: Required

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paymentId` | string | Yes | MongoDB ObjectId of the payment |

**Success Response** (200 OK):
```json
{
  "message": "Payment verified successfully",
  "payment": {
    "_id": "507f1f77bcf86cd799439012",
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

**Error Response** (404 Not Found):
```json
{
  "message": "Payment not found"
}
```

---

### Get Payment Details

Retrieve complete information about a specific payment.

**Endpoint**: `GET /payments/:paymentId`

**Authentication**: Required

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paymentId` | string | Yes | MongoDB ObjectId of the payment |

**Success Response** (200 OK):
```json
{
  "payment": {
    "_id": "507f1f77bcf86cd799439012",
    "orderId": {
      "_id": "507f1f77bcf86cd799439011",
      "status": "confirmed",
      "totalAmount": 1000
    },
    "userId": {
      "_id": "507f1f77bcf86cd799439010",
      "email": "user@example.com"
    },
    "paymentMethod": "mpesa",
    "status": "completed",
    "amount": 1000,
    "currency": "KES",
    "transactionId": "ws_CO_DMZ_123456_12345678",
    "metadata": {
      "mpesaReceiptNumber": "NLJ7RT61SV",
      "phoneNumber": "254712345678",
      "transactionDate": "20210906152459"
    },
    "createdAt": "2024-01-29T10:15:30.000Z",
    "updatedAt": "2024-01-29T10:16:00.000Z"
  }
}
```

**Error Response** (403 Forbidden):
```json
{
  "message": "Access denied"
}
```

---

### Get Payment History

Retrieve payment history for the authenticated user.

**Endpoint**: `GET /payments/history`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of results per page |

**Success Response** (200 OK):
```json
{
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "orderId": {
        "_id": "507f1f77bcf86cd799439011",
        "status": "confirmed",
        "totalAmount": 1000
      },
      "paymentMethod": "mpesa",
      "status": "completed",
      "amount": 1000,
      "currency": "KES",
      "transactionId": "ws_CO_DMZ_123456_12345678",
      "createdAt": "2024-01-29T10:15:30.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "pages": 1,
    "limit": 10
  }
}
```

---

### M-Pesa Callback (Webhook)

**Endpoint**: `POST /payments/mpesa/callback`

**Authentication**: None (called by M-Pesa servers)

**Note**: This endpoint should be secured with IP whitelisting in production.

**Request Body** (from M-Pesa):
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

**Success Response** (200 OK):
```json
{
  "ResultCode": 0,
  "ResultDesc": "Success"
}
```

---

## Order Endpoints

### Create Order

Create a new order with optional payment details.

**Endpoint**: `POST /orders`

**Authentication**: Required

**Request Body**:
```json
{
  "productId": "507f1f77bcf86cd799439013",
  "quantity": 2,
  "currency": "KES",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Nairobi",
    "postalCode": "00100",
    "country": "Kenya",
    "phone": "254712345678"
  }
}
```

**Success Response** (201 Created):
```json
{
  "message": "Order saved",
  "createdOrder": {
    "_id": "507f1f77bcf86cd799439011",
    "product": "507f1f77bcf86cd799439013",
    "quantity": 2,
    "totalAmount": 2000,
    "currency": "KES",
    "status": "pending",
    "paymentStatus": "pending"
  }
}
```

---

### Get All Orders

Retrieve all orders with filtering and pagination.

**Endpoint**: `GET /orders`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Results per page |
| `status` | string | - | Filter by order status |
| `paymentStatus` | string | - | Filter by payment status |

**Status Values**:
- Order Status: `pending`, `processing`, `confirmed`, `shipped`, `delivered`, `cancelled`
- Payment Status: `pending`, `completed`, `failed`, `refunded`

**Success Response** (200 OK):
```json
{
  "count": 2,
  "total": 15,
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "product": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Product Name",
        "price": 1000
      },
      "quantity": 2,
      "userId": {
        "_id": "507f1f77bcf86cd799439010",
        "email": "user@example.com"
      },
      "status": "confirmed",
      "totalAmount": 2000,
      "currency": "KES",
      "paymentStatus": "completed",
      "paymentMethod": "mpesa",
      "createdAt": "2024-01-29T10:15:30.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

---

### Update Order Status

Update the status of an order (Admin only).

**Endpoint**: `PATCH /orders/:orderId/status`

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "status": "shipped"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Order status updated successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "shipped",
    "updatedAt": "2024-01-29T10:20:00.000Z"
  }
}
```

---

## Product Endpoints

### Get All Products

Retrieve products with search, filtering, and pagination.

**Endpoint**: `GET /products`

**Authentication**: None

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page |
| `category` | string | - | Filter by category |
| `search` | string | - | Search in name and description |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `sort` | string | - | Sort by: `price_asc`, `price_desc`, `name` |

**Success Response** (200 OK):
```json
{
  "count": 5,
  "total": 50,
  "products": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Product Name",
      "price": 1000,
      "productImage": "/uploads/product.jpg",
      "description": "Product description",
      "category": "electronics",
      "stock": 50
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

## Error Handling

All endpoints follow consistent error response format:

**Error Response Structure**:
```json
{
  "message": "Error description",
  "error": "Detailed error message (optional)"
}
```

**Common HTTP Status Codes**:

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

**Example Error Responses**:

```json
// 400 Bad Request
{
  "message": "Payment method 'unknown' is not supported",
  "supportedMethods": ["stripe", "card", "paypal", "mpesa"]
}

// 401 Unauthorized
{
  "message": "Auth failed"
}

// 404 Not Found
{
  "message": "Order not found"
}

// 500 Internal Server Error
{
  "message": "Server error occurred while initiating payment",
  "error": "Database connection failed"
}
```

---

## Testing

### Test with cURL

#### Initiate M-Pesa Payment
```bash
curl -X POST http://localhost:3001/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderId": "507f1f77bcf86cd799439011",
    "paymentMethod": "mpesa",
    "paymentData": {
      "phoneNumber": "254708374149"
    }
  }'
```

#### Get Payment History
```bash
curl -X GET "http://localhost:3001/payments/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Order
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productId": "507f1f77bcf86cd799439013",
    "quantity": 2
  }'
```

### Test with Postman

Import the Postman collection from `postman_collection.json` for complete API testing.

---

## Rate Limits

Payment endpoints inherit the global rate limits:
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes

---

## Security

### Payment Security Features

1. **JWT Authentication**: All payment operations require valid JWT
2. **Transaction Logging**: All payment attempts are logged
3. **Input Validation**: Strict validation on all payment inputs
4. **Encrypted Metadata**: Sensitive payment data stored encrypted
5. **Webhook Verification**: IP whitelisting recommended for callbacks

### Best Practices

1. **Never store card details** - Use Stripe tokens
2. **Always use HTTPS** in production
3. **Validate webhook signatures** for Stripe/PayPal
4. **Whitelist Safaricom IPs** for M-Pesa callbacks
5. **Log all transactions** for audit trail
6. **Handle timeouts gracefully** - M-Pesa users have 60 seconds to respond

---

## Support

For issues or questions:
- Check the [M-Pesa Setup Guide](./MPESA_SETUP_GUIDE.md)
- Review the [Main README](../README.md)
- Open an issue on GitHub

---

**Last Updated**: January 2026  
**API Version**: 1.0.0
