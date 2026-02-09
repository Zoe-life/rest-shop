# RESTful E-Commerce Platform with React Frontend

[![CI/CD Pipeline](https://github.com/Zoe-life/rest-shop/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Zoe-life/rest-shop/actions/workflows/ci-cd.yml)
[![Security](https://img.shields.io/badge/security-helmet-brightgreen)](https://helmetjs.github.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

A modern, full-stack e-commerce platform with dual-backend architecture (Node.js + Cloudflare Workers) and React TypeScript frontend.

## 🎨 Frontend Demo

- **Live Demo**: [Cloudflare Pages](https://rest-shop-frontend.pages.dev) *(after deployment)*
- **Features**: 
  - 🌓 Day/Night mode toggle
  - 📱 Fully responsive design
  - 🎨 Saffron & Navy Blue theme
  - ⚡ Fast performance on Cloudflare Pages

## Repository Structure

```
rest-shop/
│
├─ frontend/            ← React + TypeScript + Tailwind CSS
│   ├─ src/
│   │   ├─ components/  # Reusable components
│   │   ├─ pages/       # Page components
│   │   ├─ contexts/    # React contexts (Auth, Theme)
│   │   ├─ api/         # API configuration
│   │   └─ App.tsx
│   ├─ public/
│   └─ package.json
│
├─ api/                 ← Node + Express + Mongoose
│   ├─ models/
│   ├─ routes/
│   ├─ controllers/
│   ├─ middleware/
│   ├─ services/
│   ├─ config/
│   ├─ utils/
│   ├─ test/
│   ├─ server.js
│   └─ package.json
│
├─ worker/              ← Cloudflare Worker (Edge Proxy)
│   ├─ src/
│   │   └─ index.js
│   ├─ wrangler.toml
│   └─ package.json
│
├─ docs/                ← Comprehensive documentation
└─ README.md
```

## Table of Contents
- [Overview](#overview)
- [Frontend Features](#frontend-features)
- [Architecture](#architecture)
- [Features](#features)
  - [Enhanced Features](#enhanced-features)
  - [Security Features](#security-features)
  - [Performance Features](#performance-features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Testing](#testing)
- [Monitoring and Observability](#monitoring-and-observability)
- [Contributing](#contributing)

## Overview
This is a comprehensive, **professional-grade full-stack e-commerce platform** with:
- **Modern React Frontend**: TypeScript, Tailwind CSS, responsive design
- **RESTful API Backend**: Node.js, Express, Mongoose, MongoDB
- **Edge Distribution**: Cloudflare Workers proxy for global performance
- **Enterprise Features**: Payment processing (Stripe, PayPal, M-Pesa), authentication, order management
- **Automated CI/CD**: GitHub Actions for continuous deployment

## Frontend Features

### 🎨 Modern UI/UX
- **Theme Colors**: Bright Saffron (#FF9933) and Navy Blue (#002366)
- **Dark/Light Mode**: Toggle with persistence via localStorage
- **Responsive Design**: Mobile-first, works on all screen sizes
- **Clean Interface**: Professional, intuitive, and user-friendly

### 🚀 Technology Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management
- **Axios** for API communication

### 📱 Pages & Features
- **Product Browsing**: Grid layout with images, prices, and stock status
- **Authentication**: Login and signup pages
- **Order Management**: View order history and status
- **User Profile**: Account information display
- **Theme Toggle**: Seamless day/night mode switching

See [Frontend README](./frontend/README.md) for detailed documentation.

## Architecture

### Proxy Architecture for Cloudflare Workers Compatibility

The application uses a **three-tier proxy architecture**:

```
Frontend (Cloudflare Pages)
    ↓ HTTPS
Cloudflare Workers (Edge Proxy)
    ↓ HTTPS
Node.js Backend (Railway/Render)
    ↓
MongoDB Atlas
```

**Components:**
- **Frontend** (~100KB): React SPA deployed to Cloudflare Pages
- **Cloudflare Workers** (~10KB): Lightweight edge proxy for global distribution
- **Node.js Backend**: Full API with Mongoose/MongoDB operations
- **MongoDB Atlas**: Cloud database

**Benefits:**
- ✅ Global CDN distribution for frontend
- ✅ Fast edge routing via Workers
- ✅ Reliable Mongoose/MongoDB operations in Node.js
- ✅ Independent scaling of all layers
- ✅ Industry-standard architecture pattern

**Deployment:**
- Frontend: Cloudflare Pages (automatic via GitHub Actions)
- Workers: Cloudflare Workers (automatic via GitHub Actions)
- Backend: Railway/Render (auto-deploy on push)

See detailed documentation:
- [Complete Deployment Guide](docs/FULL_DEPLOYMENT_GUIDE.md)
- [GitHub CI/CD Setup](docs/GITHUB_SECRETS_CICD_GUIDE.md)
- [Proxy Architecture Explanation](docs/CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md)

### Legacy Microservices Architecture (Deprecated)

The previous architecture attempted to run Mongoose directly in Workers using Durable Objects. This has been replaced by the proxy architecture above to resolve runtime incompatibility issues.

### Deployment Commands
```bash
# Deploy all services
npm run deploy:all

# Deploy individual services
npm run deploy:base      # Base service
npm run deploy:payments  # Payment service
npm run deploy:gateway   # Gateway (main entry point)
```

## Features

### Core Features
✅ User authentication and management with JWT  
✅ **OAuth 2.0 integration (Google, Microsoft, Apple)**  
✅ **Multi-Gateway Payment Processing (Stripe, PayPal, M-Pesa)**  
✅ Product management with search, filtering, and pagination  
✅ Advanced order management with status tracking  
✅ Role-based access control (Admin/User)  
✅ File upload for product images  
✅ Inventory tracking (stock levels, SKU)  
✅ Payment history and transaction logging  
✅ Webhook handling for payment callbacks  
✅ Comprehensive error handling  
✅ CI/CD pipeline with GitHub Actions  
✅ Cloudflare Workers deployment ready  

### Enhanced Features

#### 🔐 Security Enhancements
- **Email Verification**: Secure email verification with time-limited tokens (24-hour expiry)
- **Password Reset**: Secure password reset functionality with email notifications (1-hour expiry)
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA with authenticator apps (Google Authenticator, Authy)
  - QR code generation for easy setup
  - 10 backup codes for account recovery
  - Time-based one-time passwords (RFC 6238 compliant)
- **API Versioning**: `/api/v1` endpoints with backward compatibility for legacy routes

#### ⚡ Performance Features
- **Redis Caching**: Automatic response caching for GET requests
  - Configurable TTL per endpoint
  - Automatic cache invalidation on mutations
  - Graceful degradation if Redis unavailable
- **Database Indexing**: Optimized indexes for frequently queried fields
- **Lazy Loading**: Selective field loading with Mongoose populate
- **CDN Integration**: Cloudinary for optimized image delivery

#### 🔔 Real-Time Features
- **WebSocket Notifications**: Instant order and payment status updates
  - User-specific notification channels
  - CORS-protected WebSocket connections
  - Automatic reconnection handling
- **Email Notifications**: Automated email alerts for order status changes

#### 🧪 Testing & Quality
- **Automated Testing**: Comprehensive test suite with Mocha/Chai
- **Load Testing**: Artillery-based performance testing scenarios
- **Integration Tests**: Full workflow testing
- **Security Testing**: npm audit, Snyk, CodeQL integration

**📚 For detailed documentation, see:**
- [Enhanced Features Guide](docs/ENHANCED_FEATURES.md) - Complete setup and usage guide
- [Monitoring & Observability](docs/MONITORING_OBSERVABILITY.md) - APM, metrics, and alerting
- [Testing Guide](docs/TESTING_GUIDE.md) - Comprehensive testing documentation

## Payment Integration

### Supported Payment Methods
- **💳 Stripe**: Credit/Debit card payments (Global)
- **🅿️ PayPal**: PayPal account payments (Global)
- **📱 M-Pesa**: Mobile money for Kenyan users (Kenya-specific)

### Payment Features
- **Secure Transaction Processing**: PCI-compliant payment handling
- **Real-time Payment Verification**: Instant payment status updates
- **Webhook Integration**: Automatic callback processing
- **Multi-Currency Support**: USD, EUR, GBP, KES
- **Transaction Logging**: Complete audit trail
- **Payment Status Tracking**: Real-time order updates
- **Refund Support**: Built-in refund capabilities (Stripe, PayPal)

See the [Payment API Documentation](docs/PAYMENT_API_DOCUMENTATION.md) and [M-Pesa Setup Guide](docs/MPESA_SETUP_GUIDE.md) for detailed integration instructions.

## Security Features

### 🔒 Production-Grade Security
- **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options, XSS protection)
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: 
  - API endpoints: 100 requests/15 minutes
  - Authentication: 5 attempts/15 minutes
  - Signup: 5 accounts/hour
- **Input Validation**: express-validator on all routes
- **Password Security**: Bcrypt hashing with strength requirements
- **Request Sanitization**: Comprehensive XSS prevention with xss library
- **ObjectId Validation**: Prevents injection attacks
- **JWT**: 1-hour token expiration
- **Connection Pooling**: Optimized MongoDB connections
- **OAuth 2.0**: Secure third-party authentication
- **Payment Security**: Encrypted payment data, transaction logging
- **PCI Compliance Ready**: No card data storage on servers

### Payment Security
- **Tokenization**: Card details never stored (Stripe tokens)
- **Webhook Verification**: Cryptographic signature validation
- **IP Whitelisting**: Restrict payment callbacks to gateway IPs
- **Transaction Encryption**: Sensitive payment metadata encrypted
- **Audit Logging**: Complete transaction history

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## Technologies Used

### Frontend
- **React 18**: Modern UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API requests
- **Context API**: State management

### Backend
- **Runtime**: Node.js 18.x/20.x
- **Framework**: Express.js 4.x
- **Database**: MongoDB Atlas with Mongoose 8.x (with indexing for scalability)
  - See [Database Migration Analysis](docs/DATABASE_MIGRATION_ANALYSIS.md) for alternative options
  - See [Mongoose Troubleshooting Guide](docs/MONGOOSE_TROUBLESHOOTING.md) for common issues
- **Authentication**: JWT (jsonwebtoken), Passport.js, OAuth 2.0
- **OAuth Providers**: Google, Microsoft, Apple
- **Payment Gateways**: 
  - Stripe (Credit/Debit cards)
  - PayPal (PayPal accounts)
  - M-Pesa Daraja API (Mobile money - Kenya)
- **HTTP Client**: Axios (for payment gateway APIs)
- **Security**: Helmet, CORS, express-rate-limit, express-validator, xss
- **File Uploads**: Multer, Cloudinary
- **Testing**: Mocha, Chai, Sinon, Supertest
- **Logging**: Morgan, Custom transaction logging
- **Environment**: dotenv

### Deployment
- **Frontend**: Cloudflare Pages
- **Edge Layer**: Cloudflare Workers
- **Backend**: Railway/Render/VPS
- **CI/CD**: GitHub Actions
- **Database**: MongoDB Atlas

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account
- npm or yarn package manager
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Zoe-life/rest-shop.git
   cd rest-shop
   ```

2. Install dependencies for all components:
   ```bash
   # Install backend dependencies
   cd api && npm install
   
   # Install worker dependencies
   cd ../worker && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

### Configuration

#### 1. Backend Configuration

Create a `.env` file in the `api/` directory:
   ```env
   # Core Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster0.lifak.mongodb.net/
   MONGO_ATLAS_PW=your_mongo_password
   JWT_KEY=your_jwt_secret_key
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
   PORT=3001
   
   # Email Service (for verification & password reset)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-smtp-password
   EMAIL_FROM=noreply@rest-shop.com
   FRONTEND_URL=http://localhost:3000
   
   # Redis Cache (optional - for performance optimization)
   REDIS_URL=redis://localhost:6379
   # OR use individual settings:
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   
   # OAuth (optional - for social login)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   APPLE_CLIENT_ID=your-apple-client-id
   APPLE_TEAM_ID=your-apple-team-id
   APPLE_KEY_ID=your-apple-key-id
   
   # Payment Gateways (optional - for payment processing)
   STRIPE_SECRET_KEY=your-stripe-secret-key
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret
   MPESA_CONSUMER_KEY=your-mpesa-consumer-key
   MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
   ```

#### 2. Frontend Configuration

Create a `.env.local` file in the `frontend/` directory:
   ```env
   REACT_APP_API_URL=http://localhost:3001
   ```

#### 3. MongoDB Atlas Setup
   - Create a cluster at https://cloud.mongodb.com
   - Add your IP to the IP Access List
   - Create a database user
   - Get your connection string

**📚 Configuration Guides:**
- [OAuth Setup Guide](docs/OAUTH_SETUP.md) - Configure social login
- [Payment Setup](docs/PAYMENT_API_DOCUMENTATION.md) - Payment gateway configuration
- [M-Pesa Setup](docs/MPESA_SETUP_GUIDE.md) - M-Pesa integration
- [Enhanced Features](docs/ENHANCED_FEATURES.md) - Email, 2FA, WebSocket, Redis setup

**Troubleshooting Database Connection:**
If you encounter issues connecting to MongoDB, see the [Mongoose Troubleshooting Guide](docs/MONGOOSE_TROUBLESHOOTING.md) for common solutions.

### Running the Application

#### Seeding Sample Products (Optional)

To populate your database with professional sample products for a realistic e-commerce experience:

```bash
cd api

# View what would be seeded (safe mode)
npm run seed

# Add 12 sample products with descriptions and images
npm run seed:force

# Clear existing products and reseed
npm run seed:clear
```

This will add professional sample products including:
- Electronics (headphones, smart watches, speakers, keyboards)
- Accessories (bags, sunglasses)
- Sports & Fitness (yoga mats, water bottles, running shoes)
- Clothing (organic cotton t-shirts)
- Home & Kitchen (coffee mugs, desk lamps)

All products include professional descriptions, realistic pricing, high-quality images, and stock quantities.

#### Development Mode - Full Stack

**Terminal 1 - Backend API:**
```bash
cd api && npm start
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm start
# Frontend runs on http://localhost:3000
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

#### Development Mode - API Only
```bash
cd api && npm start
# Server runs on http://localhost:3001
```

#### Production Mode
```bash
cd api && NODE_ENV=production node server.js
```

#### Deploying the Worker
```bash
npm run deploy:worker
# OR
cd worker && npm run deploy
```

#### Running Tests
```bash
npm test
# OR
cd api && npm test
```

## API Endpoints

### Health Check
```http
GET /health
```
Returns system health status and database connection state.

### User Endpoints

#### Register a New User
```http
POST /user/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Login (Local Authentication)
```http
POST /user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### OAuth 2.0 Authentication

**Sign in with Google**
```http
GET /auth/google
# Redirects to Google login page
# On success, redirects to: FRONTEND_URL/auth/success?token=<JWT>
```

**Sign in with Microsoft**
```http
GET /auth/microsoft
# Redirects to Microsoft login page
# On success, redirects to: FRONTEND_URL/auth/success?token=<JWT>
```

**Sign in with Apple**
```http
GET /auth/apple
# Redirects to Apple login page
# On success, redirects to: FRONTEND_URL/auth/success?token=<JWT>
```

See [OAuth Setup Guide](docs/OAUTH_SETUP.md) for detailed configuration instructions.

#### Email Verification
```http
POST /user/request-verification
Content-Type: application/json

{
  "email": "user@example.com"
}

GET /user/verify-email/:token
```

#### Password Reset
```http
POST /user/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}

POST /user/reset-password/:token
Content-Type: application/json

{
  "password": "NewSecurePassword123!"
}
```

#### Two-Factor Authentication (2FA)
```http
# Setup 2FA
POST /user/2fa/setup
Authorization: Bearer <token>

# Enable 2FA
POST /user/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json
{
  "token": "123456"
}

# Verify 2FA
POST /user/2fa/verify
Content-Type: application/json
{
  "userId": "user_id",
  "token": "123456"
}

# Disable 2FA
POST /user/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json
{
  "password": "YourPassword123!"
}
```

See [Enhanced Features Documentation](docs/ENHANCED_FEATURES.md) for complete details.

#### Delete User (Admin Only)
```http
DELETE /user/:userId
Authorization: Bearer <token>
```

### Product Endpoints

#### Get All Products
```http
GET /products
```

#### Create Product (Admin Only)
```http
POST /products
Authorization: Bearer <token>
Content-Type: multipart/form-data

name: "Product Name"
price: 99.99
productImage: <file>
```

#### Get Single Product
```http
GET /products/:productId
```

#### Update Product (Admin Only)
```http
PATCH /products/:productId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 149.99
}
```

#### Delete Product (Admin Only)
```http
DELETE /products/:productId
Authorization: Bearer <token>
```

### Order Endpoints

#### Get All Orders (Authenticated)
```http
GET /orders
Authorization: Bearer <token>
```

#### Get Single Order (Authenticated)
```http
GET /orders/:orderId
Authorization: Bearer <token>
```

#### Create Order (Authenticated)
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 2
}
```

#### Delete Order (Admin Only)
```http
DELETE /orders/:orderId
Authorization: Bearer <token>
```

#### Update Order Status (Admin Only)
```http
PATCH /orders/:orderId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "shipped"
}
```

### Payment Endpoints

#### Initiate Payment
```http
POST /payments/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "507f1f77bcf86cd799439011",
  "paymentMethod": "mpesa",
  "paymentData": {
    "phoneNumber": "254712345678"
  }
}
```

**Supported Payment Methods**: `stripe`, `card`, `paypal`, `mpesa`

#### Verify Payment
```http
GET /payments/verify/:paymentId
Authorization: Bearer <token>
```

#### Get Payment Details
```http
GET /payments/:paymentId
Authorization: Bearer <token>
```

#### Get Payment History
```http
GET /payments/history?page=1&limit=10
Authorization: Bearer <token>
```

#### M-Pesa Callback (Webhook)
```http
POST /payments/mpesa/callback
Content-Type: application/json

(Called automatically by M-Pesa servers)
```

**For complete payment API documentation, see:**
- [Payment API Documentation](docs/PAYMENT_API_DOCUMENTATION.md)
- [M-Pesa Setup Guide](docs/MPESA_SETUP_GUIDE.md)

## Documentation

### 📖 Complete Documentation Library

#### Getting Started
- [Installation & Configuration](#getting-started) - Setup and configuration guide
- [OAuth Setup Guide](docs/OAUTH_SETUP.md) - Configure Google, Microsoft, and Apple OAuth

#### Architecture & Deployment
- **[Complete Deployment Guide](docs/FULL_DEPLOYMENT_GUIDE.md)** - Full-stack deployment walkthrough
- **[GitHub CI/CD Setup](docs/GITHUB_SECRETS_CICD_GUIDE.md)** - Automated deployment with GitHub Actions
- [Microservices Architecture](docs/MICROSERVICES_ARCHITECTURE.md) - Detailed architecture overview
- [Microservices Quickstart](docs/MICROSERVICES_QUICKSTART.md) - Quick deployment guide
- [Cloudflare Deployment](docs/CLOUDFLARE_DEPLOYMENT.md) - Deploy to Cloudflare Workers
- [Cloudflare Secrets Setup](docs/CLOUDFLARE_SECRETS_SETUP.md) - Configure secrets
- [Frontend README](frontend/README.md) - Frontend-specific documentation

#### Enhanced Features
- **[Enhanced Features Guide](docs/ENHANCED_FEATURES.md)** - Complete guide for:
  - Email verification and password reset
  - Two-factor authentication (2FA) setup
  - Real-time WebSocket notifications
  - Redis caching configuration
  - API versioning usage

#### Payment Integration
- [Payment API Documentation](docs/PAYMENT_API_DOCUMENTATION.md) - Complete payment API reference
- [M-Pesa Setup Guide](docs/MPESA_SETUP_GUIDE.md) - M-Pesa integration guide

#### Monitoring & Operations
- **[Monitoring & Observability](docs/MONITORING_OBSERVABILITY.md)** - Comprehensive guide for:
  - Application Performance Monitoring (APM) integration
  - Distributed tracing setup
  - Custom metrics and dashboards
  - Alerting configuration
  - Health checks and probes

#### Testing
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Complete testing documentation:
  - Unit and integration testing
  - Load testing with Artillery
  - End-to-end testing with Cypress
  - Contract testing
  - Test coverage strategies

#### Database
- [Database Migration Analysis](docs/DATABASE_MIGRATION_ANALYSIS.md) - Database options
- [MongoDB Cloudflare Strategy](docs/MONGODB_CLOUDFLARE_STRATEGY.md) - MongoDB on Cloudflare
- [Mongoose Troubleshooting](docs/MONGOOSE_TROUBLESHOOTING.md) - Common issues and solutions

#### Troubleshooting
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [Before/After Comparison](docs/BEFORE_AFTER_COMPARISON.md) - Feature evolution

## Deployment

### 🚀 Automated Deployment with GitHub Actions

The project includes full CI/CD automation via GitHub Actions for:
- ✅ Cloudflare Workers (Edge proxy)
- ✅ Cloudflare Pages (Frontend)
- ✅ Automated testing and security scanning

**Quick Setup:**
1. Configure [GitHub Secrets](docs/GITHUB_SECRETS_CICD_GUIDE.md)
2. Push to `main` branch
3. GitHub Actions handles the rest!

**See detailed guides:**
- **[GitHub CI/CD Setup Guide](docs/GITHUB_SECRETS_CICD_GUIDE.md)** - Complete automation setup
- **[Full Deployment Guide](docs/FULL_DEPLOYMENT_GUIDE.md)** - Manual deployment walkthrough

### Deploy Backend (Railway/Render)

The backend deploys automatically via Railway/Render's built-in CI/CD:

**Railway:**
```bash
# Connect GitHub repository
# Railway auto-deploys on push to main
# Configure environment variables in Railway dashboard
```

**Render:**
```bash
# Connect GitHub repository
# Render auto-deploys on push to main
# Configure environment variables in Render dashboard
```

### Manual Deployment

#### Deploy Worker Manually
```bash
cd worker
wrangler secret put BACKEND_API_URL  # One-time setup
wrangler deploy
```

#### Deploy Frontend Manually
```bash
cd frontend
npm run build
wrangler pages deploy build --project-name=rest-shop-frontend
```

## CI/CD Pipeline

The project uses GitHub Actions for automated continuous integration and deployment.

### Pipeline Stages

1. **Code Quality & Linting** - ESLint, code style checks
2. **Security Scanning** - npm audit, Snyk, CodeQL
3. **Testing** - Full test suite with MongoDB Memory Server
4. **Build Verification** - Build worker and frontend
5. **Deploy Worker** - Automatic deployment to Cloudflare Workers (main branch only)
6. **Deploy Frontend** - Automatic deployment to Cloudflare Pages (main branch only)

### Required GitHub Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

```
CLOUDFLARE_API_TOKEN     - Cloudflare API token for deployments
CLOUDFLARE_ACCOUNT_ID    - Your Cloudflare account ID
REACT_APP_API_URL        - Worker URL for frontend (e.g., https://rest-shop-worker.workers.dev)
```

Optional:
```
JWT_KEY                  - For CI tests only (not production)
SNYK_TOKEN              - For Snyk security scanning
```

### Triggering Deployments

**Automatic:**
- Push to `main` branch triggers full deployment
- Pull requests trigger testing only (no deployment)

**Manual:**
- Go to Actions tab → CI/CD Pipeline → Run workflow

**See detailed guide:** [GitHub Secrets & CI/CD Setup](docs/GITHUB_SECRETS_CICD_GUIDE.md)

## Testing

### Test Suite Overview

The project includes comprehensive testing at multiple levels:

#### Unit & Integration Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

#### Load Testing with Artillery
```bash
# Product endpoint load test
npm run test:load

# Authenticated user journey
npm run test:load:auth

# Spike test (sudden load increase)
npm run test:load:spike
```

### Test Structure
```
test/
├── setup.js                    # MongoDB Memory Server setup
├── controllers/
│   ├── user.test.js           # User authentication tests
│   ├── products.test.js       # Product CRUD tests
│   ├── orders.test.js         # Order management tests
│   ├── payments.test.js       # Payment processing tests
│   ├── auth.test.js           # Email verification & password reset
│   └── twoFactor.test.js      # 2FA functionality tests
└── middleware/
    └── check-auth.test.js     # Authentication middleware tests

tests/load/
├── products-load-test.yml     # Product browsing scenarios
├── auth-load-test.yml         # Authenticated user flows
└── spike-test.yml             # Sudden traffic spike test
```

### Prerequisites for Testing
- **MongoDB Memory Server**: Tests use an in-memory MongoDB instance
- **Node.js**: v20.x or higher
- **Ubuntu 22.04+**: Configured for OpenSSL 3.x compatibility (MongoDB 7.0.14)

> **Note**: If you encounter "libcrypto.so.1.1" errors, the project is pre-configured to use MongoDB 7.0.14 which supports OpenSSL 3.x. This is set in `package.json` under `config.mongodbMemoryServer.version`.

### Test Coverage
- ✅ User authentication (signup, login, delete, email verification, password reset)
- ✅ Two-factor authentication (setup, enable, verify, disable)
- ✅ Product CRUD operations with caching
- ✅ Order management with real-time notifications
- ✅ Payment processing (Stripe, PayPal, M-Pesa)
- ✅ JWT middleware and authorization
- ✅ WebSocket connections and notifications
- ✅ Error handling and security
- ✅ Load testing scenarios
- **Target Coverage**: > 90%

**📚 For complete testing documentation, see [Testing Guide](docs/TESTING_GUIDE.md)**

## Monitoring and Observability

### Available Monitoring Features

#### Application Monitoring
- **Health Check Endpoint**: `/health` - System health and database status
- **Structured Logging**: JSON-formatted logs with trace IDs
- **Audit Logging**: Security event tracking (logins, signups, failures)

#### Performance Metrics
- Response time tracking
- Request throughput
- Error rate monitoring
- Cache hit/miss rates
- WebSocket connection counts

#### APM Integration Support
- New Relic
- Datadog APM
- Elastic APM
- Prometheus/Grafana

#### Distributed Tracing
- Trace ID propagation across services
- Request correlation
- Performance bottleneck identification

#### Alerting
- High error rate alerts
- Slow response time notifications
- Database connection failures
- Payment gateway issues
- Memory and CPU usage warnings

**📚 For complete monitoring setup, see [Monitoring & Observability Guide](docs/MONITORING_OBSERVABILITY.md)**

## Middleware

### Security Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: express-validator
- **Sanitization**: XSS prevention

### Authentication Middleware
- **checkAuth**: Validates JWT tokens
- **checkRole**: Role-based access control

### Custom Middleware
- **Error Handler**: Centralized error handling
- **Morgan Logger**: HTTP request logging

## Error Handling

All errors return a consistent JSON format:
```json
{
  "error": {
    "message": "Error description"
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (auth failed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Follow existing code style
- Update documentation
- Ensure all tests pass
- Keep commits atomic and well-described

## License

This project is licensed under the ISC License.

## Author

**Merlyn Zawadi**

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API endpoints in Postman collection

## Acknowledgments

- Express.js community
- MongoDB Atlas
- Cloudflare Workers
- All contributors