# OAuth 2.0 Integration Guide

## Overview
This API supports OAuth 2.0 authentication with the following providers:
- **Google** - Sign in with Google
- **Microsoft** - Sign in with Microsoft Account
- **Apple** - Sign in with Apple

## OAuth Flow

### 1. User initiates authentication
```
Frontend → GET /auth/google (or /microsoft, /apple)
```

### 2. User is redirected to provider
```
API → OAuth Provider Login Page
```

### 3. User authorizes the application
```
OAuth Provider → User Authorization
```

### 4. Provider redirects back to callback URL
```
OAuth Provider → GET /auth/google/callback?code=...
```

### 5. API exchanges code for user info
```
API ← OAuth Provider (User Profile Data)
```

### 6. API creates/updates user and generates JWT
```
API → MongoDB (Create/Update User)
API → Generate JWT Token
```

### 7. User is redirected to frontend with token
```
API → Frontend: /auth/success?token=<JWT>
```

## Setup Instructions

### Google OAuth 2.0

1. **Create Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new project or select existing
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback` (development)
     - `https://your-domain.com/auth/google/callback` (production)
   - Save Client ID and Client Secret

2. **Configure Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
   ```

3. **Test the Integration**
   ```bash
   # Start the server
   npm start
   
   # Open in browser
   http://localhost:3001/auth/google
   ```

### Microsoft OAuth 2.0

1. **Register Application in Azure**
   - Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
   - Click "New registration"
   - Name: "REST Shop API"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI (Web): `http://localhost:3001/auth/microsoft/callback`
   - Register and note Application (client) ID

2. **Create Client Secret**
   - In app registration, go to "Certificates & secrets"
   - Click "New client secret"
   - Add description and expiry
   - Copy the secret value immediately

3. **Configure API Permissions**
   - Go to "API permissions"
   - Add permission → Microsoft Graph → Delegated
   - Select: `User.Read`
   - Grant admin consent

4. **Configure Environment Variables**
   ```env
   MICROSOFT_CLIENT_ID=your_application_client_id
   MICROSOFT_CLIENT_SECRET=your_client_secret
   MICROSOFT_CALLBACK_URL=http://localhost:3001/auth/microsoft/callback
   ```

5. **Test the Integration**
   ```bash
   http://localhost:3001/auth/microsoft
   ```

### Apple Sign In

1. **Create App ID**
   - Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers)
   - Click "+" to create new identifier
   - Select "App IDs" → Continue
   - Select "App" → Continue
   - Description: "REST Shop"
   - Bundle ID: `com.yourcompany.restshop`
   - Enable "Sign in with Apple"
   - Register

2. **Create Service ID**
   - Go to Identifiers
   - Click "+" → Select "Services IDs" → Continue
   - Description: "REST Shop Web Auth"
   - Identifier: `com.yourcompany.restshop.web`
   - Enable "Sign in with Apple"
   - Configure:
     - Primary App ID: Select your App ID
     - Domains: `your-domain.com`
     - Return URLs: `https://your-domain.com/auth/apple/callback`
   - Register

3. **Create Private Key**
   - Go to "Keys"
   - Click "+" to create new key
   - Key Name: "REST Shop Auth Key"
   - Enable "Sign in with Apple"
   - Configure: Select your Primary App ID
   - Register and download the `.p8` file
   - Note the Key ID

4. **Get Team ID**
   - Go to [Membership Details](https://developer.apple.com/account/#/membership)
   - Note your Team ID

5. **Configure Environment Variables**
   ```env
   APPLE_CLIENT_ID=com.yourcompany.restshop.web
   APPLE_TEAM_ID=YOUR_TEAM_ID
   APPLE_KEY_ID=YOUR_KEY_ID
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   (contents of your .p8 file)
   -----END PRIVATE KEY-----"
   APPLE_CALLBACK_URL=https://your-domain.com/auth/apple/callback
   ```

6. **Test the Integration**
   ```bash
   http://localhost:3001/auth/apple
   ```

## API Endpoints

### Initiate Google Authentication
```http
GET /auth/google
```
Redirects user to Google login page

### Google Callback
```http
GET /auth/google/callback?code=...
```
Handles Google OAuth callback

### Initiate Microsoft Authentication
```http
GET /auth/microsoft
```
Redirects user to Microsoft login page

### Microsoft Callback
```http
GET /auth/microsoft/callback?code=...
```
Handles Microsoft OAuth callback

### Initiate Apple Authentication
```http
GET /auth/apple
```
Redirects user to Apple login page

### Apple Callback
```http
POST /auth/apple/callback
```
Handles Apple OAuth callback (POST request)

### Authentication Failure
```http
GET /auth/failure
```
Returns:
```json
{
  "message": "Authentication failed",
  "error": "OAuth authentication was unsuccessful"
}
```

### Logout
```http
GET /auth/logout
```
Returns:
```json
{
  "message": "Logged out successfully",
  "note": "Please delete your JWT token on the client side"
}
```

## Frontend Integration

### React Example

```javascript
// Login button component
const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/google';
  };

  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  );
};

// Success page to handle OAuth callback
const AuthSuccess = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Store token in localStorage
      localStorage.setItem('jwt_token', token);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, []);

  return <div>Authenticating...</div>;
};
```

### Vue.js Example

```javascript
// Login methods
methods: {
  loginWithGoogle() {
    window.location.href = 'http://localhost:3001/auth/google';
  },
  loginWithMicrosoft() {
    window.location.href = 'http://localhost:3001/auth/microsoft';
  },
  loginWithApple() {
    window.location.href = 'http://localhost:3001/auth/apple';
  }
}

// Success page
mounted() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    localStorage.setItem('jwt_token', token);
    this.$router.push('/dashboard');
  }
}
```

## User Model Updates

The User model now supports OAuth authentication with these fields:

```javascript
{
  email: String,           // Required, unique
  password: String,        // Optional (null for OAuth users)
  role: String,           // 'user' or 'admin'
  googleId: String,       // Google OAuth ID
  microsoftId: String,    // Microsoft OAuth ID
  appleId: String,        // Apple OAuth ID
  provider: String,       // 'local', 'google', 'microsoft', 'apple'
  displayName: String,    // User's display name
  emailVerified: Boolean  // Email verification status
}
```

## Security Considerations

### JWT Token Security
- Tokens expire after 1 hour
- Store tokens securely (httpOnly cookies recommended for production)
- Implement token refresh mechanism

### CORS Configuration
- Configure allowed origins in `.env` file
- Restrict to your frontend domain in production

### HTTPS Requirement
- OAuth providers require HTTPS in production
- Use Cloudflare for SSL/TLS termination

### Rate Limiting
- OAuth endpoints have rate limiting
- Monitor for suspicious activity

## Troubleshooting

### "redirect_uri_mismatch" Error
**Solution**: Ensure callback URLs match exactly in OAuth provider settings

### "invalid_client" Error
**Solution**: Verify Client ID and Client Secret are correct

### User email already exists
**Solution**: The system will link OAuth account to existing email

### Apple Sign In not working
**Solution**: Apple requires HTTPS. Use ngrok for local testing:
```bash
ngrok http 3001
```

## Testing

### Manual Testing
1. Start server: `npm start`
2. Navigate to: `http://localhost:3001/auth/google`
3. Complete OAuth flow
4. Check redirect URL for JWT token

### Automated Testing
```bash
# Set test environment variables
export GOOGLE_CLIENT_ID=test_client_id
export JWT_KEY=test_key

# Run tests
npm test
```

## Production Deployment

### Environment Variables Checklist
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] MICROSOFT_CLIENT_ID
- [ ] MICROSOFT_CLIENT_SECRET
- [ ] APPLE_CLIENT_ID
- [ ] APPLE_TEAM_ID
- [ ] APPLE_KEY_ID
- [ ] APPLE_PRIVATE_KEY
- [ ] FRONTEND_URL
- [ ] JWT_KEY

### Update Callback URLs
Update OAuth provider settings with production URLs:
- Google: `https://api.yourdomain.com/auth/google/callback`
- Microsoft: `https://api.yourdomain.com/auth/microsoft/callback`
- Apple: `https://api.yourdomain.com/auth/apple/callback`

### Cloudflare Workers
OAuth works with Cloudflare Workers using Node.js compatibility mode.

## Support

For issues:
- Check provider-specific documentation
- Verify environment variables
- Test callback URLs
- Check CORS configuration
- Review rate limits
