# RESTful API for Order Management

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Product Endpoints](#product-endpoints)
  - [Order Endpoints](#order-endpoints)
- [Middleware](#middleware)
- [Error Handling](#error-handling)
- [Health Check](#health-check)
- [Testing](#testing)
- [Contributing](#contributing)

## Overview
This RESTful API provides a comprehensive solution for managing users, products, and orders in an e-commerce application. It allows users to register, authenticate, create orders, and manage products.

## Features
- User authentication and management
- Product management (CRUD operations)
- Order management (CRUD operations)
- Role-based access control
- File upload for product images
- Comprehensive error handling
- Health check endpoint for monitoring

## Technologies Used
- Node.js
- Express.js
- MongoDB (with Mongoose)
- JWT for authentication
- Multer for file uploads
- dotenv for environment variable management
- morgan for logging
- express-rate-limit for rate limiting
- body-parser for parsing incoming request bodies

## Getting Started

### Prerequisites
- Node.js (v12 or higher)
- MongoDB Atlas account
- Postman or similar tool for API testing

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