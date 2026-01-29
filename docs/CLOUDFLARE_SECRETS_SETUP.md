# Cloudflare Workers Secrets Setup Guide

This guide explains how to configure secrets for the rest-shop-api Cloudflare Worker.

## Why Secrets Are Not in CI/CD

The CI/CD pipeline does NOT upload secrets during deployment to avoid "Binding name already in use" errors. Secrets are persistent in Cloudflare Workers and only need to be configured once.

## Required Secrets

The following secrets must be configured in Cloudflare Workers:

1. **JWT_KEY** - Secret key for JWT token generation
2. **MONGO_ATLAS_PW** - MongoDB Atlas password
3. **ALLOWED_ORIGINS** - Comma-separated list of allowed CORS origins

## Setup Methods

### Method 1: Using Wrangler CLI (Recommended)

```bash
# Install and authenticate wrangler
npm install -g wrangler
wrangler login

# Navigate to your project directory
cd /path/to/rest-shop

# Set each secret (you'll be prompted to enter the value)
wrangler secret put JWT_KEY
wrangler secret put MONGO_ATLAS_PW
wrangler secret put ALLOWED_ORIGINS
```

**Example values:**
- `JWT_KEY`: A random string (e.g., generated with `openssl rand -base64 32`)
- `MONGO_ATLAS_PW`: Your MongoDB Atlas database password
- `ALLOWED_ORIGINS`: `https://rest-shop.pages.dev,https://yourdomain.com`

### Method 2: Using Cloudflare Dashboard

1. Log in to https://dash.cloudflare.com/
2. Go to **Workers & Pages**
3. Select your worker (**rest-shop-api**)
4. Click on **Settings** tab
5. Scroll to **Environment Variables** section
6. Click **Add variable** for each secret:
   - Name: `JWT_KEY`, Value: [your secret], Type: **Encrypted**
   - Name: `MONGO_ATLAS_PW`, Value: [your password], Type: **Encrypted**
   - Name: `ALLOWED_ORIGINS`, Value: [your origins], Type: **Encrypted**
7. Click **Save and Deploy**

## Updating Secrets

If you need to update a secret:

**Using CLI:**
```bash
wrangler secret put JWT_KEY
# Enter new value when prompted
```

**Using Dashboard:**
1. Go to Worker Settings > Environment Variables
2. Click **Edit** next to the secret
3. Enter new value
4. Click **Save**

## Verifying Secrets

To verify secrets are configured correctly:

```bash
# List all secrets (values are hidden)
wrangler secret list

# Expected output:
# [
#   {
#     "name": "JWT_KEY",
#     "type": "secret_text"
#   },
#   {
#     "name": "MONGO_ATLAS_PW",
#     "type": "secret_text"
#   },
#   {
#     "name": "ALLOWED_ORIGINS",
#     "type": "secret_text"
#   }
# ]
```

## Troubleshooting

### Error: "Binding name already in use"
This error should no longer occur with the updated CI/CD configuration. If you still see it:
1. Verify secrets exist in Cloudflare: `wrangler secret list`
2. Check that CI/CD workflow does NOT have `secrets:` parameter
3. Ensure secrets are not defined in `wrangler.toml` under `[vars]`

### Secret Not Available in Worker
If your worker can't access a secret:
1. Verify secret is set: `wrangler secret list`
2. Check secret name matches exactly (case-sensitive)
3. Redeploy the worker: `wrangler deploy`
4. Check worker logs for errors

## Security Best Practices

- ✅ Never commit secrets to version control
- ✅ Use Cloudflare's encrypted secret storage
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use different secrets for development/production
- ✅ Limit secret access to necessary team members
- ✅ Monitor secret access in Cloudflare audit logs

## Additional Resources

- [Cloudflare Workers Secrets Documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler Secret Commands](https://developers.cloudflare.com/workers/wrangler/commands/#secret)
- [Environment Variables Best Practices](https://developers.cloudflare.com/workers/configuration/environment-variables/)
