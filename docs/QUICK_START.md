# Quick Start Guide

This guide will help you quickly set up the rest-shop application for local development.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Git

## Quick Setup (5 minutes)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Zoe-life/rest-shop.git
cd rest-shop

# Install all dependencies
cd api && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configure Environment Variables

#### Backend Configuration

```bash
# Copy the example environment file
cd api
cp ../.env.example .env
```

Edit `api/.env` and update these essential variables:

```env
# Essential Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.lifak.mongodb.net/
JWT_KEY=your_long_random_jwt_secret_key_here
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
FRONTEND_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3001
PORT=3001
```

#### Frontend Configuration

```bash
# Copy the example environment file
cd ../frontend
cp .env.example .env
```

The `frontend/.env` file should contain:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Seed the Database (Optional)

```bash
cd api
npm run seed:force
```

This adds 12 sample products to your database for testing.

### 4. Start the Application

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd api
npm start
```

Backend will run on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend will run on http://localhost:3000

### 5. Test the Application

Visit http://localhost:3000 in your browser. You should see:
- Products page with sample products
- Login/Signup functionality
- No "failed to fetch products" error

## Troubleshooting

### "Failed to fetch products" Error

**Cause:** The frontend can't connect to the backend API.

**Solutions:**
1. Ensure the backend is running on port 3001
2. Check that `VITE_API_URL=http://localhost:3001` in `frontend/.env`
3. Verify CORS is configured: `ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000` in `api/.env`

### OAuth Redirect Issues

**Cause:** OAuth callback URL is not properly configured.

**Solutions:**
1. Set `BACKEND_API_URL=http://localhost:3001` in `api/.env`
2. For production, set `BACKEND_API_URL` to your deployed backend URL (e.g., `https://your-app.onrender.com`)
3. Ensure OAuth callback URLs in your OAuth provider console match:
   - Google Console: `{BACKEND_API_URL}/auth/google/callback`
   - Microsoft Portal: `{BACKEND_API_URL}/auth/microsoft/callback`
   - Apple Developer: `{BACKEND_API_URL}/auth/apple/callback`

### MongoDB Connection Issues

**Cause:** Invalid MongoDB URI or network issues.

**Solutions:**
1. Verify your MongoDB Atlas credentials
2. Check IP whitelist in MongoDB Atlas (add `0.0.0.0/0` for testing)
3. Test connection string format: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dbname`

## OAuth Configuration (Optional)

To enable social login:

1. **Google OAuth:**
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
   - Add to `.env`:
     ```env
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
     ```

2. **Microsoft OAuth:**
   - Go to https://portal.azure.com
   - Register an app
   - Add redirect URI: `http://localhost:3001/auth/microsoft/callback`
   - Add to `.env`:
     ```env
     MICROSOFT_CLIENT_ID=your_microsoft_client_id
     MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
     MICROSOFT_CALLBACK_URL=http://localhost:3001/auth/microsoft/callback
     ```

3. **Apple OAuth:**
   - Go to https://developer.apple.com
   - Create Service ID
   - Add return URL: `http://localhost:3001/auth/apple/callback`
   - Add to `.env`:
     ```env
     APPLE_CLIENT_ID=your_apple_service_id
     APPLE_TEAM_ID=your_apple_team_id
     APPLE_KEY_ID=your_apple_key_id
     APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
     APPLE_CALLBACK_URL=http://localhost:3001/auth/apple/callback
     ```

## Production Deployment

When deploying to production (Render, etc.):

1. Set `BACKEND_API_URL` to your production backend URL
2. Update OAuth callback URLs in provider consoles to use production URL
3. Set `ALLOWED_ORIGINS` to include your production frontend URL
4. Set `FRONTEND_URL` to your production frontend URL

Example production `.env`:
```env
BACKEND_API_URL=https://your-app.onrender.com
ALLOWED_ORIGINS=https://your-app.onrender.com,https://rest-shop-frontend.pages.dev
FRONTEND_URL=https://rest-shop-frontend.pages.dev
GOOGLE_CALLBACK_URL=https://your-app.onrender.com/auth/google/callback
```

## Next Steps

- See [README.md](README.md) for comprehensive documentation
- See [docs/](docs/) for detailed guides on specific features
- Run tests: `cd api && npm test`
