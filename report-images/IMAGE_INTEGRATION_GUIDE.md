# Image Integration Guide for Report and Log Book

This guide helps you integrate the 12 generated diagrams into your Industrial Attachment Report and Engineering Log Book.

## Quick Reference

All images are located in the `report-images/` directory in SVG format.

## For the Engineering Log Book

### Week-by-Week Image Suggestions

**Week 1-2: Project Setup & Architecture**
- Use: `1-system-architecture.svg` - Shows overall system design
- Use: `8-deployment-architecture.svg` - Development environment setup

**Week 3-4: Authentication Implementation**
- Use: `4-authentication-flow.svg` - JWT and OAuth flows
- Use: `7-security-architecture.svg` - Security layers

**Week 5-6: API Development**
- Use: `2-api-architecture.svg` - RESTful API structure
- Use: `3-database-schema.svg` - Database design

**Week 7-8: Business Logic**
- Use: `10-order-management-flow.svg` - Order processing
- Use: `11-product-management-flow.svg` - Product CRUD operations

**Week 9-10: Testing & Quality**
- Use: `9-testing-workflow.svg` - Testing strategy
- Use: `12-error-handling-flow.svg` - Error management

**Week 11-12: Deployment & CI/CD**
- Use: `5-cicd-pipeline.svg` - Automated pipeline
- Use: `6-request-response-flow.svg` - Complete request cycle

## For the Industrial Attachment Report

### Section Mapping

1. **Introduction & Overview**
   - Figure 1: System Architecture (`1-system-architecture.svg`)
   - Figure 2: API Architecture (`2-api-architecture.svg`)

2. **Technical Implementation Details**
   - Figure 3: Database Schema (`3-database-schema.svg`)
   - Figure 4: Authentication Flow (`4-authentication-flow.svg`)
   - Figure 5: Request-Response Flow (`6-request-response-flow.svg`)

3. **Security Implementation**
   - Figure 6: Security Architecture (`7-security-architecture.svg`)
   - Figure 7: Error Handling Flow (`12-error-handling-flow.svg`)

4. **Testing and Quality Assurance**
   - Figure 8: Testing Workflow (`9-testing-workflow.svg`)

5. **Deployment and CI/CD**
   - Figure 9: CI/CD Pipeline (`5-cicd-pipeline.svg`)
   - Figure 10: Deployment Architecture (`8-deployment-architecture.svg`)

6. **Appendices - System Diagrams**
   - Figure 11: Order Management Flow (`10-order-management-flow.svg`)
   - Figure 12: Product Management Flow (`11-product-management-flow.svg`)

## How to Insert Images in Microsoft Word

### Method 1: Direct SVG Insert (Recommended for Word 2016+)
1. Place cursor where you want the image
2. Click `Insert` → `Pictures` → `This Device`
3. Navigate to `report-images` folder
4. Select the SVG file and click Insert
5. Resize as needed (images are scalable without quality loss)

### Method 2: Convert to PNG First
If SVG doesn't work in your Word version:

**Using a Web Browser:**
1. Open the SVG file in Chrome, Firefox, or Edge
2. Right-click on the image
3. Select "Take Screenshot" or use browser screenshot extension
4. Save as PNG
5. Insert PNG into Word

**Using Online Converter:**
1. Visit CloudConvert.com or Convertio.co
2. Upload SVG file
3. Convert to PNG (choose high resolution, e.g., 2000px width)
4. Download PNG
5. Insert into Word

### Method 3: Copy-Paste from Browser
1. Open SVG file in a web browser
2. Take a screenshot using Windows Snipping Tool (Win+Shift+S) or macOS Screenshot (Cmd+Shift+4)
3. Paste directly into Word (Ctrl+V or Cmd+V)

## Figure Captions Format

Use this format for figure captions in your report:

```
Figure 1: System Architecture Overview
This diagram illustrates the complete REST API system architecture, showing the client-server relationship, security layers, authentication, controllers, models, and database connections.

Figure 2: RESTful API Architecture
The API architecture displays all routes (User, Product, Order, OAuth), the middleware pipeline (Security, Rate Limiting, CORS, Authentication, Validation), business logic layer with controllers, and data access layer with Mongoose ODM.

Figure 3: MongoDB Database Schema
Database schema showing User, Product, and Order collections with their fields, data types, validations, and relationships. Includes role-based access control and order status management.

Figure 4: Authentication Flow Diagram
Complete authentication workflow including JWT local authentication, OAuth 2.0 flow for Google/Microsoft/Apple, and protected request handling with middleware validation.

Figure 5: CI/CD Pipeline Architecture
Six-stage automated pipeline covering installation, code quality checks, security scanning, testing, build verification, and deployment to Cloudflare Workers.

Figure 6: Request-Response Flow Diagram
Detailed flow of a typical API request (POST /orders) showing all 12 steps from client through security checks, authentication, validation, controller logic, database operations, and response generation.

Figure 7: Security Architecture
Defense-in-depth security strategy with four layers: Network Security (HTTPS, CORS, Helmet, Rate Limiting), Authentication & Authorization (JWT, OAuth, RBAC), Input Validation & Sanitization, and Data Security (Bcrypt, MongoDB Auth, Audit Logging).

Figure 8: Deployment Architecture
Production deployment architecture showing development environment, GitHub repository, CI/CD pipeline, Cloudflare Workers edge computing platform, MongoDB Atlas cloud database, and global client access.

Figure 9: Testing Workflow & Strategy
Comprehensive testing strategy using MongoDB Memory Server, covering Unit Tests, Integration Tests, Controller Tests, and Middleware Tests with Mocha, Chai, Sinon, and Supertest frameworks.

Figure 10: Order Management Flow
Complete order creation and retrieval workflow showing authentication, product validation, price calculation, database operations, and response generation for authenticated users.

Figure 11: Product Management Flow
Product CRUD operations including admin-only product creation with file upload using Multer, public product listing, and admin-only update/delete operations with role-based access control.

Figure 12: Error Handling Flow
Centralized error handling system covering seven error types (validation, authentication, permission, not found, conflict, rate limit, server errors) with consistent JSON response format.
```

## Image Sizing Recommendations

For professional appearance in your report:

- **Full-page diagrams**: 6.5 inches wide (fits within 1-inch margins on A4/Letter paper)
- **Half-page diagrams**: 3.25 inches wide
- **In-line diagrams**: 4-5 inches wide

### Setting Image Size in Word:
1. Right-click on inserted image
2. Select "Size and Position" or "Format Picture"
3. Set width (height adjusts automatically to maintain aspect ratio)
4. Check "Lock aspect ratio"

## Tips for Best Results

1. **Consistent Formatting**: Use the same width for similar diagrams
2. **Page Breaks**: Place large diagrams on their own page for clarity
3. **Captions Below**: Always place captions below figures (Word: References → Insert Caption)
4. **Cross-References**: Reference figures in text (e.g., "as shown in Figure 1")
5. **List of Figures**: Add Table of Figures after Table of Contents (References → Insert Table of Figures)

## Image Quality Settings

When exporting/converting:
- **Resolution**: Minimum 150 DPI, recommended 300 DPI for print
- **Format**: SVG for digital, PNG for print
- **Color Mode**: RGB for screen, CMYK for professional print
- **Background**: Transparent or white

## Printing Considerations

- SVG files maintain quality at any size
- For professional printing, convert to high-resolution PNG or PDF
- Ensure color printer is used for best results
- Use "High Quality" or "Best" print settings

## Digital Submission

If submitting electronically:
- Keep images as SVG for smallest file size and best quality
- Embed images in Word document (don't link)
- Save as PDF for final submission to preserve formatting

## Contact

For questions about these images or integration assistance:
- Check the main README.md in the report-images folder
- Review individual SVG files - they open in any modern web browser
- All diagrams are professionally formatted and ready for academic use

---

**Note**: These diagrams were specifically created to meet academic documentation standards for engineering reports and log books. They provide comprehensive visual representation of the REST API system architecture, workflows, and technical implementations.
