#!/bin/bash

# Configuration Helper Script for Cloudflare Worker
# This script helps you configure the BACKEND_API_URL for your worker

set -e

echo "═══════════════════════════════════════"
echo " Worker Configuration Helper"
echo "═══════════════════════════════════════"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed"
    echo ""
    echo "Install it with:"
    echo "  npm install -g wrangler"
    echo ""
    exit 1
fi

echo "✅ Wrangler CLI is installed"
echo ""

# Check if we're in the worker directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ wrangler.toml not found"
    echo "Please run this script from the worker directory:"
    echo "  cd worker"
    echo "  ./configure.sh"
    echo ""
    exit 1
fi

echo "✅ Found wrangler.toml"
echo ""

# Display current configuration
echo "─── Current Configuration ───"
echo ""
echo "This worker needs to know where your Node.js backend is running."
echo "The backend URL should be set in the BACKEND_API_URL secret."
echo ""

# Ask for backend URL
echo "─── Backend URL Configuration ───"
echo ""
echo "Where is your Node.js backend running?"
echo ""
echo "Examples:"
echo "  - Render:  https://rest-shop-backend.onrender.com"
echo "  - VPS:     https://api.yourdomain.com"
echo "  - Local:   http://localhost:3001"
echo ""

read -p "Enter your backend URL: " BACKEND_URL

# Validate URL
if [ -z "$BACKEND_URL" ]; then
    echo "❌ Backend URL cannot be empty"
    exit 1
fi

# Remove trailing slash if present
BACKEND_URL=${BACKEND_URL%/}

echo ""
echo "─── Testing Backend Connection ───"
echo ""
echo "Testing connection to: $BACKEND_URL/health"
echo ""

# Test if backend is accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is accessible and healthy!"
    echo ""
else
    echo "⚠️  Warning: Could not reach backend (HTTP $HTTP_CODE)"
    echo ""
    echo "This might be because:"
    echo "  - Backend is not running yet"
    echo "  - URL is incorrect"
    echo "  - Backend is not publicly accessible"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    echo ""
fi

# Set the secret in Cloudflare
echo "─── Setting BACKEND_API_URL in Cloudflare ───"
echo ""
echo "This will securely store your backend URL in Cloudflare."
echo ""

# Use wrangler to set the secret
echo "$BACKEND_URL" | wrangler secret put BACKEND_API_URL

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BACKEND_API_URL has been configured!"
    echo ""
else
    echo ""
    echo "❌ Failed to set BACKEND_API_URL"
    echo ""
    exit 1
fi

# Ask about deployment
echo "─── Deployment ───"
echo ""
read -p "Do you want to deploy the worker now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying worker..."
    echo ""
    wrangler deploy
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Worker deployed successfully!"
        echo ""
        
        # Get worker URL from wrangler.toml
        WORKER_NAME=$(grep "^name" wrangler.toml | cut -d'"' -f2)
        
        echo "─── Testing Worker ───"
        echo ""
        echo "Your worker should now be able to communicate with your backend."
        echo ""
        echo "Test it with:"
        echo "  curl https://$WORKER_NAME.your-subdomain.workers.dev/health"
        echo ""
        echo "Or use the validation script:"
        echo "  node ../api/scripts/validate-connection.js $BACKEND_URL https://$WORKER_NAME.your-subdomain.workers.dev"
        echo ""
    else
        echo ""
        echo "❌ Deployment failed"
        echo ""
        exit 1
    fi
else
    echo ""
    echo "Skipping deployment. Deploy later with:"
    echo "  wrangler deploy"
    echo ""
fi

echo "─── Configuration Complete ───"
echo ""
echo "Next steps:"
echo "  1. Test worker health: curl https://your-worker.workers.dev/health"
echo "  2. Test API endpoint: curl https://your-worker.workers.dev/products"
echo "  3. Connect your frontend to the worker URL"
echo ""
echo "For more help, see: ../docs/CONNECTION_GUIDE.md"
echo ""
