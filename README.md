# RESTful API for Order Management

[![CI/CD Pipeline](https://github.com/Zoe-life/rest-shop/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Zoe-life/rest-shop/actions/workflows/ci-cd.yml)
[![Security](https://img.shields.io/badge/security-helmet-brightgreen)](https://helmetjs.github.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Security Features](#security-features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Testing](#testing)
- [Contributing](#contributing)

## Overview
This RESTful API provides a comprehensive, **production-ready** solution for managing users, products, and orders in an e-commerce application. It includes enterprise-grade security features, comprehensive testing, and CI/CD pipeline for deployment to Cloudflare Workers.

## Features
✅ User authentication and management with JWT  
✅ **OAuth 2.0 integration (Google, Microsoft, Apple)**  
✅ Product management (CRUD operations)  
✅ Order management (CRUD operations)  
✅ Role-based access control (Admin/User)  
✅ File upload for product images  
✅ Comprehensive error handling  
✅ Health check endpoint for monitoring  
✅ Automated testing with Mocha/Chai  
✅ CI/CD pipeline with GitHub Actions  
✅ Cloudflare Workers deployment ready

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

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## Technologies Used
- **Runtime**: Node.js 18.x/20.x
- **Framework**: Express.js 4.x
- **Database**: MongoDB Atlas with Mongoose 8.x
- **Authentication**: JWT (jsonwebtoken), Passport.js, OAuth 2.0
- **OAuth Providers**: Google, Microsoft, Apple
- **Security**: Helmet, CORS, express-rate-limit, express-validator, xss
- **File Uploads**: Multer
- **Testing**: Mocha, Chai, Sinon, Supertest
- **Logging**: Morgan
- **Environment**: dotenv
- **Deployment**: Cloudflare Workers (Wrangler)
- **CI/CD**: GitHub Actions

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

2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration
1. Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.lifak.mongodb.net/
   MONGO_ATLAS_PW=your_mongo_password
   JWT_KEY=your_jwt_secret_key
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
   PORT=3001
   ```

2. Configure MongoDB Atlas:
   - Create a cluster at https://cloud.mongodb.com
   - Add your IP to the IP Access List
   - Create a database user
   - Get your connection string

### Running the Application

#### Development Mode
```bash
npm start
# Server runs on http://localhost:3001
```

#### Production Mode
```bash
NODE_ENV=production node server.js
```

#### Running Tests
```bash
npm test
# or with coverage
npm run coverage
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

## Deployment

### Deploy to Cloudflare Workers

See detailed guides:
- [Cloudflare Deployment Guide](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Cloudflare Secrets Setup Guide](docs/CLOUDFLARE_SECRETS_SETUP.md)

Quick start:
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Configure secrets (only needed once)
wrangler secret put JWT_KEY
wrangler secret put MONGO_ATLAS_PW
wrangler secret put ALLOWED_ORIGINS

# Deploy
wrangler deploy
```

**Note**: Secrets are persistent and only need to be configured once. The CI/CD pipeline deploys code changes without re-uploading secrets.

### Alternative Deployments

The application can also be deployed to:
- **Railway**: `railway up`
- **Render**: Connect GitHub repo
- **Heroku**: `git push heroku main`
- **Docker**: `docker build -t rest-shop .`

See [MongoDB-Cloudflare Strategy](docs/MONGODB_CLOUDFLARE_STRATEGY.md) for compatibility details.

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions CI/CD pipeline:

### Workflow Steps
1. **Code Quality & Linting** - Checks code style and runs linters
2. **Security Scanning** - npm audit and Snyk vulnerability scanning
3. **Testing** - Runs tests on Node.js 18.x and 20.x
4. **Build Verification** - Ensures the application builds successfully
5. **CodeQL Analysis** - Security analysis with CodeQL
6. **Deployment** - Auto-deploys to Cloudflare Workers on main branch

### GitHub Secrets Required
```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
JWT_KEY
MONGODB_URI
MONGO_ATLAS_PW
ALLOWED_ORIGINS
```

### Running CI Locally
```bash
# Install dependencies
npm ci

# Run tests
npm test

# Run security audit
npm audit
```

## Testing

### Test Structure
```
test/
├── setup.js                    # MongoDB Memory Server setup
├── controllers/
│   ├── user.test.js           # User controller tests
│   ├── products.test.js       # Products controller tests
│   └── orders.test.js         # Orders controller tests
└── middleware/
    └── check-auth.test.js     # Auth middleware tests
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run coverage
```

### Test Coverage
- ✅ User authentication (signup, login, delete)
- ✅ Product CRUD operations
- ✅ Order management
- ✅ JWT middleware
- ✅ Error handling

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

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration
1. Create a `.env` file in the root directory and add the following environment variables:
   ```plaintext
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.lifak.mongodb.net/
   MONGO_ATLAS_PW=<your_mongo_password>
   JWT_KEY=<your_jwt_secret>
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3001,http://yourdomain.com
   ```

### Running the Application
1. Start the server:
   ```bash
   npm start
   ```

2. The API will be available at `http://localhost:3001`.

## API Endpoints

### User Endpoints
- **POST /user/signup**: Register a new user
- **POST /user/login**: Authenticate a user and generate JWT token
- **DELETE /user/:userId**: Delete a user account (Admin only)

### Product Endpoints
- **GET /products**: Retrieve all products
- **POST /products**: Create a new product (Admin only)
- **GET /products/:productId**: Retrieve a specific product
- **PATCH /products/:productId**: Update a specific product (Admin only)
- **DELETE /products/:productId**: Delete a specific product (Admin only)

### Order Endpoints
- **GET /orders**: Retrieve all orders (Admin and User)
- **GET /orders/:orderId**: Retrieve a specific order (Admin and User)
- **POST /orders**: Create a new order (Admin and User)
- **DELETE /orders/:orderId**: Delete a specific order (Admin only)

## Middleware
- **checkAuth**: Middleware for JWT authentication
- **checkRole**: Middleware for role-based access control
- **express-rate-limit**: Middleware for limiting repeated requests to public APIs

## Error Handling
The API uses a centralized error handling mechanism to return appropriate HTTP status codes and error messages. Common error responses include:
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Authentication errors
- `403 Forbidden`: Authorization errors
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server errors

## Health Check
A health check endpoint is available at `/health` to monitor the status of the API and its database connection.

## Testing
You can use Postman or similar tools to test the API endpoints. Ensure to include the necessary headers, such as `Authorization` for protected routes.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a new branch (`git checkout -b feature/YourFeature`)
3. Make your changes and commit them (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request