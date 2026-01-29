# Report and Log Book Images

This directory contains 12 professional diagrams generated for the Industrial Attachment Report and Engineering Log Book. These SVG images illustrate the architecture, design, and workflows of the RESTful API Order Management System.

## Image List

### Architecture Diagrams

1. **1-system-architecture.svg** - System Architecture Overview
   - Illustrates the complete system architecture
   - Shows client-server relationship
   - Displays security, authentication, controllers, models, and database layers
   - Highlights the multi-tier architecture design

2. **2-api-architecture.svg** - RESTful API Architecture
   - Details all API routes (User, Product, Order, OAuth)
   - Shows middleware pipeline (Security, Rate Limiting, CORS, Authentication, Validation)
   - Illustrates business logic layer with controllers
   - Displays data access layer with Mongoose ODM

3. **3-database-schema.svg** - MongoDB Database Schema
   - User schema with authentication fields
   - Product schema with pricing and image handling
   - Order schema with relationships
   - Shows all field types, validations, and relationships

### Authentication & Security

4. **4-authentication-flow.svg** - Authentication Flow Diagram
   - JWT authentication process (local login)
   - OAuth 2.0 flow (Google, Microsoft, Apple)
   - Protected request flow with middleware
   - Security features (password hashing, token validation)

5. **7-security-architecture.svg** - Security Architecture
   - Defense in depth strategy (4 layers)
   - Layer 1: Network security (HTTPS, CORS, Helmet, Rate Limiting)
   - Layer 2: Authentication & Authorization (JWT, OAuth, RBAC)
   - Layer 3: Input validation & sanitization
   - Layer 4: Data security (Bcrypt, MongoDB Auth, Audit Logging)

### CI/CD & Deployment

6. **5-cicd-pipeline.svg** - CI/CD Pipeline Architecture
   - 6-stage pipeline workflow
   - Stage 1: Install & Setup
   - Stage 2: Code Quality (ESLint, Formatting)
   - Stage 3: Security Scanning (npm audit, Snyk, CodeQL)
   - Stage 4: Testing (Unit, Integration, Coverage)
   - Stage 5: Build Verification
   - Stage 6: Deployment to Cloudflare Workers

7. **8-deployment-architecture.svg** - Deployment Architecture
   - Development environment setup
   - GitHub repository and version control
   - GitHub Actions CI/CD pipeline
   - Production deployment to Cloudflare Workers
   - MongoDB Atlas cloud database
   - Global client access via CDN

### Workflows & Flows

8. **6-request-response-flow.svg** - Request-Response Flow Diagram
   - Complete request cycle for POST /orders endpoint
   - Shows all 12 steps from client to database and back
   - Security checks, authentication, validation
   - Controller logic, model operations, database interaction

9. **9-testing-workflow.svg** - Testing Workflow & Strategy
   - Test environment setup with MongoDB Memory Server
   - Four test types: Unit, Integration, Controller, Middleware
   - Test execution workflow (Setup, Execute, Assert, Teardown)
   - Testing tools: Mocha, Chai, Sinon, Supertest

10. **10-order-management-flow.svg** - Order Management Flow
    - Create order workflow (authentication, validation, calculation)
    - Get all orders workflow
    - Shows interaction between client, API server, and database

11. **11-product-management-flow.svg** - Product Management Flow
    - Create product flow (admin only, with file upload)
    - Get all products flow (public access)
    - Update/delete product flow (admin only)
    - File storage with Multer

12. **12-error-handling-flow.svg** - Error Handling Flow
    - Seven error types with HTTP status codes
    - Centralized error handler middleware
    - Error processing steps (logging, sanitization)
    - Standard JSON error response format

## Usage in Documents

These images can be inserted into:

1. **Engineering Log Book** - To illustrate weekly technical work
   - System architecture diagrams for Week 1-2
   - Authentication flows for Week 3-4
   - CI/CD pipeline for Week 5-6
   - Testing workflows for Week 7-8
   - Complete flows for Week 9-12

2. **Industrial Attachment Report**
   - Technical Implementation Details section
   - System Architecture section
   - Detailed System Architecture appendix
   - System Diagrams and Schematics appendix

## File Format

- **Format**: SVG (Scalable Vector Graphics)
- **Advantages**: 
  - Scalable without quality loss
  - Can be opened in any modern browser
  - Can be embedded in Word documents
  - Can be converted to PNG/JPEG if needed
  - Small file size
  - Professional appearance

## Converting to Other Formats

### To PNG (for Word documents):
1. Open SVG in a browser (Chrome, Firefox, Edge)
2. Right-click and "Take screenshot" or use browser screenshot tool
3. Or use online converters like CloudConvert, Convertio

### To PDF:
1. Open SVG in browser
2. Print to PDF (Ctrl+P, select "Save as PDF")

### Inserting into Word:
1. **Method 1**: Insert → Pictures → select SVG file directly (Word 2016+)
2. **Method 2**: Convert to PNG first, then Insert → Pictures
3. **Method 3**: Open SVG in browser, copy screenshot, paste into Word

## Color Scheme

The diagrams use a consistent, professional color scheme:

- **Blue (#3498db)**: Client applications, general components
- **Green (#27ae60)**: Controllers, database, success states
- **Red (#e74c3c)**: Security, errors, admin functions
- **Orange (#f39c12)**: Storage, results, warnings
- **Purple (#9b59b6)**: Middleware, authentication
- **Gray (#ecf0f1)**: Background boxes, details

## Technical Details

- **Created**: January 29, 2026
- **Format**: SVG 1.1
- **Encoding**: UTF-8
- **Viewbox**: Optimized for each diagram (800-900px wide)
- **Fonts**: Sans-serif (system fonts for compatibility)
- **Arrows**: Custom markers with proper directionality

## Recommendations

- Use high-quality print settings when printing
- For presentations, SVG format maintains clarity at any zoom level
- Include figure captions in your report referencing the diagram name
- Number figures sequentially in your report (Figure 1, Figure 2, etc.)

## Author

**Merlyn Zawadi**  
Department of Electrical and Electronics Engineering  
Dedan Kimathi University of Technology
