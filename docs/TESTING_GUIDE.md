# Testing Guide

## Table of Contents
1. [Overview](#overview)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Load Testing](#load-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Contract Testing](#contract-testing)
7. [Test Coverage](#test-coverage)
8. [CI/CD Integration](#cicd-integration)

---

## Overview

This project uses a comprehensive testing strategy to ensure quality, reliability, and performance.

### Testing Stack
- **Unit/Integration Tests**: Mocha, Chai, Sinon, Supertest
- **Load Testing**: Artillery
- **E2E Testing**: Cypress (to be added)
- **Coverage**: NYC/Istanbul
- **CI/CD**: GitHub Actions

### Current Test Coverage
- Unit tests: ✅ Implemented
- Integration tests: ✅ Implemented
- Load tests: ✅ Implemented
- E2E tests: 📋 Planned
- Contract tests: 📋 Planned

**Target Coverage**: > 90%

---

## Unit Tests

### Running Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx mocha test/controllers/user.test.js

# Run with coverage
npm run coverage  # (add this script to package.json)
```

### Test Structure

```
test/
├── setup.js                    # Global test setup
├── controllers/
│   ├── user.test.js           # User controller tests
│   ├── products.test.js       # Products controller tests
│   ├── orders.test.js         # Orders controller tests
│   ├── payments.test.js       # Payments controller tests
│   ├── auth.test.js           # Auth controller tests (email/password reset)
│   └── twoFactor.test.js      # 2FA controller tests
└── middleware/
    └── check-auth.test.js     # Auth middleware tests
```

### Writing Tests

#### Example Test Structure
```javascript
const request = require('supertest');
const app = require('../../app');
const User = require('../../api/models/user');
const mongoose = require('mongoose');

describe('User Controller', () => {
    // Setup - runs before each test
    beforeEach(async () => {
        // Clear database
        await User.deleteMany({});
        
        // Create test data
        const testUser = new User({
            _id: new mongoose.Types.ObjectId(),
            email: 'test@example.com',
            password: hashedPassword
        });
        await testUser.save();
    });

    // Cleanup - runs after each test
    afterEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /user/signup', () => {
        it('should create a new user successfully', async () => {
            const res = await request(app)
                .post('/user/signup')
                .send({
                    email: 'newuser@example.com',
                    password: 'SecurePass123!'
                });

            res.should.have.status(201);
            res.body.should.have.property('message').eql('User created');
        });

        it('should return 409 if user already exists', async () => {
            const res = await request(app)
                .post('/user/signup')
                .send({
                    email: 'test@example.com',
                    password: 'SecurePass123!'
                });

            res.should.have.status(409);
        });
    });
});
```

### Test Best Practices

1. **Isolation**: Each test should be independent
2. **AAA Pattern**: Arrange, Act, Assert
3. **Descriptive Names**: Test names should describe expected behavior
4. **Fast**: Tests should run quickly
5. **Deterministic**: Tests should produce consistent results

### Mocking External Services

```javascript
const sinon = require('sinon');
const Payment = require('../../api/models/payment');

describe('Payment Service', () => {
    let findStub;

    beforeEach(() => {
        // Create stub
        findStub = sinon.stub(Payment, 'findOne');
    });

    afterEach(() => {
        // Restore original function
        findStub.restore();
    });

    it('should handle payment not found', async () => {
        // Configure stub
        findStub.resolves(null);

        // Test logic...
    });
});
```

---

## Integration Tests

### Running Integration Tests

Integration tests use the same test runner (Mocha) but test complete workflows.

```bash
npm test
```

### Integration Test Examples

#### Complete User Registration Flow
```javascript
describe('User Registration Flow', () => {
    it('should complete full registration workflow', async () => {
        // 1. Register
        const signupRes = await request(app)
            .post('/user/signup')
            .send({ email: 'newuser@example.com', password: 'Test123!' });
        signupRes.should.have.status(201);

        // 2. Request verification
        const verifyRes = await request(app)
            .post('/user/request-verification')
            .send({ email: 'newuser@example.com' });
        verifyRes.should.have.status(200);

        // 3. Login
        const loginRes = await request(app)
            .post('/user/login')
            .send({ email: 'newuser@example.com', password: 'Test123!' });
        loginRes.should.have.status(200);
        loginRes.body.should.have.property('token');
    });
});
```

#### Order Creation and Payment Flow
```javascript
describe('Order and Payment Flow', () => {
    let authToken;
    let productId;

    beforeEach(async () => {
        // Setup: Create user, product, get auth token
        // ...
    });

    it('should create order and process payment', async () => {
        // 1. Create order
        const orderRes = await request(app)
            .post('/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ productId, quantity: 1 });
        
        const orderId = orderRes.body.createdOrder._id;

        // 2. Initiate payment
        const paymentRes = await request(app)
            .post('/payments/initiate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                orderId,
                paymentMethod: 'stripe',
                paymentData: { /* ... */ }
            });

        // 3. Verify payment
        // ...
    });
});
```

---

## Load Testing

### Overview
Load tests use Artillery to simulate realistic user traffic and measure system performance under load.

### Running Load Tests

```bash
# Products endpoint load test
npm run test:load

# Authenticated user flows
npm run test:load:auth

# Spike test (sudden traffic increase)
npm run test:load:spike

# Custom artillery command
npx artillery run tests/load/your-test.yml
```

### Load Test Scenarios

#### 1. Products Load Test (`tests/load/products-load-test.yml`)

**Test Phases:**
1. **Warm-up**: 5 requests/sec for 60s
2. **Ramp-up**: 10-50 requests/sec over 120s
3. **Sustained**: 50 requests/sec for 300s
4. **Peak**: 100 requests/sec for 60s

**User Scenarios:**
- Browse products (50% weight)
- View product details (30% weight)
- Search products (20% weight)

#### 2. Authentication Load Test (`tests/load/auth-load-test.yml`)

**Flow:**
1. User login
2. Browse products
3. View orders
4. Create order

**Load Profile:**
- Steady: 10 requests/sec for 60s
- Peak: 20 requests/sec for 120s

#### 3. Spike Test (`tests/load/spike-test.yml`)

**Phases:**
1. Normal: 10 requests/sec for 60s
2. Spike: 200 requests/sec for 30s
3. Recovery: 10 requests/sec for 60s

### Performance Thresholds

```yaml
ensure:
  maxErrorRate: 1          # Max 1% error rate
  p95: 500                 # 95th percentile < 500ms
  p99: 1000                # 99th percentile < 1000ms
```

### Interpreting Results

```bash
Summary report @ 21:45:00(+0000)
  Scenarios launched:  3000
  Scenarios completed: 2998
  Requests completed:  11992
  Mean response/sec:   39.97
  Response time (msec):
    min: 42
    max: 987
    median: 156
    p95: 423
    p99: 654
  Codes:
    200: 11992
```

**Key Metrics:**
- **Response Time**: Should meet p95/p99 thresholds
- **Error Rate**: Should be < 1%
- **Throughput**: Requests per second
- **Success Rate**: % of successful requests

### Load Testing Best Practices

1. **Test in Staging**: Never load test production
2. **Gradual Increase**: Ramp up load gradually
3. **Monitor Resources**: Watch CPU, memory, database
4. **Realistic Scenarios**: Mirror actual user behavior
5. **Data Cleanup**: Clean up test data after runs

---

## End-to-End Testing

### Cypress Setup (Planned)

```bash
# Install Cypress
npm install --save-dev cypress

# Open Cypress
npx cypress open

# Run Cypress tests
npx cypress run
```

### E2E Test Structure
```
cypress/
├── e2e/
│   ├── auth.cy.js         # Authentication flows
│   ├── products.cy.js     # Product browsing
│   ├── checkout.cy.js     # Order creation
│   └── admin.cy.js        # Admin operations
├── fixtures/
│   └── users.json         # Test data
└── support/
    ├── commands.js        # Custom commands
    └── e2e.js             # Global config
```

### E2E Test Example
```javascript
describe('User Registration and Login', () => {
    it('should register and login successfully', () => {
        // Visit registration page
        cy.visit('/register');

        // Fill form
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('SecurePass123!');
        cy.get('button[type="submit"]').click();

        // Verify success
        cy.contains('Registration successful');

        // Login
        cy.visit('/login');
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('SecurePass123!');
        cy.get('button[type="submit"]').click();

        // Verify logged in
        cy.url().should('include', '/dashboard');
    });
});
```

---

## Contract Testing

### Overview
Contract testing ensures API compatibility between versions and for API consumers.

### Tools
- **Pact**: Consumer-driven contract testing
- **OpenAPI/Swagger**: API specification

### OpenAPI Documentation

Create `openapi.yaml`:
```yaml
openapi: 3.0.0
info:
  title: REST Shop API
  version: 1.0.0
  description: E-commerce REST API

paths:
  /products:
    get:
      summary: Get all products
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  count:
                    type: integer
                  products:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'

components:
  schemas:
    Product:
      type: object
      properties:
        _id:
          type: string
        name:
          type: string
        price:
          type: number
```

### Contract Validation
```bash
# Validate API against spec
npm install -g swagger-cli
swagger-cli validate openapi.yaml

# Generate documentation
npm install -g redoc-cli
redoc-cli bundle openapi.yaml
```

---

## Test Coverage

### Measuring Coverage

```bash
# Install nyc
npm install --save-dev nyc

# Run tests with coverage
npx nyc npm test

# Generate HTML report
npx nyc --reporter=html npm test
open coverage/index.html
```

### Coverage Configuration

Create `.nycrc.json`:
```json
{
  "all": true,
  "include": [
    "api/**/*.js",
    "utils/**/*.js"
  ],
  "exclude": [
    "test/**",
    "node_modules/**",
    "**/*.test.js"
  ],
  "reporter": ["text", "html", "lcov"],
  "check-coverage": true,
  "lines": 90,
  "statements": 90,
  "functions": 90,
  "branches": 80
}
```

### Coverage Goals
- **Lines**: > 90%
- **Statements**: > 90%
- **Functions**: > 90%
- **Branches**: > 80%

---

## CI/CD Integration

### GitHub Actions Workflow

Tests are automatically run on:
- Pull requests to `main`
- Pushes to `main`
- Manual triggers

See `.github/workflows/ci-cd.yml` for configuration.

### Test Pipeline
1. **Lint**: Code quality checks
2. **Security**: npm audit, Snyk scan
3. **Unit Tests**: Mocha tests
4. **Integration Tests**: Full workflow tests
5. **Build**: Verify application builds
6. **Deploy**: Deploy to staging/production

### Running Tests Locally (CI-style)

```bash
# Install dependencies
npm ci

# Run linters
npm run lint  # (if configured)

# Run security checks
npm audit

# Run tests
npm test

# Build
npm run build
```

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Timeout
```bash
# Tests timeout waiting for MongoDB
# Solution: Check MongoDB Memory Server setup in test/setup.js
```

#### 2. Redis Connection Errors in Tests
```bash
# Redis logs ECONNREFUSED
# Solution: Normal in test environment, Redis is optional
```

#### 3. Test Timeouts
```javascript
// Increase timeout for specific test
it('slow test', async function() {
    this.timeout(30000); // 30 seconds
    // ... test code
});
```

#### 4. Flaky Tests
- Ensure proper cleanup in `afterEach`
- Avoid hardcoded timeouts
- Mock external services
- Use test isolation

---

## Best Practices Summary

1. **Test Pyramid**: More unit tests, fewer E2E tests
2. **Fast Feedback**: Tests should run quickly
3. **Isolation**: Tests don't depend on each other
4. **Maintainability**: Keep tests simple and readable
5. **Coverage**: Aim for high coverage, but quality > quantity
6. **CI Integration**: Run tests on every commit
7. **Load Testing**: Regular performance testing
8. **Contract Testing**: Ensure API compatibility

---

## Next Steps

1. ✅ Unit tests implemented
2. ✅ Integration tests implemented
3. ✅ Load testing setup complete
4. 📋 Add Cypress for E2E testing
5. 📋 Implement contract testing with Pact
6. 📋 Increase coverage to > 90%
7. 📋 Add mutation testing
8. 📋 Performance regression testing
