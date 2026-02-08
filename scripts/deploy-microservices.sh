#!/bin/bash

# Microservices Deployment Script
# Deploys all three workers in the correct order

set -e

echo "=========================================="
echo "Deploying Rest Shop Microservices"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Deploy Base Service (Products, Orders, User, Auth)
echo -e "${BLUE}Step 1/3: Deploying Base Service...${NC}"
npx wrangler deploy --config wrangler.toml
echo -e "${GREEN}✓ Base Service deployed${NC}"
echo ""

# 2. Deploy Payment Service
echo -e "${BLUE}Step 2/3: Deploying Payment Service...${NC}"
npx wrangler deploy --config wrangler-payments.toml
echo -e "${GREEN}✓ Payment Service deployed${NC}"
echo ""

# 3. Deploy Gateway (must be last so it can bind to the other services)
echo -e "${BLUE}Step 3/3: Deploying Gateway...${NC}"
npx wrangler deploy --config wrangler-gateway.toml
echo -e "${GREEN}✓ Gateway deployed${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}All services deployed successfully!${NC}"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "- Gateway (main entry point): https://rest-shop-gateway.YOUR-SUBDOMAIN.workers.dev"
echo "- Base Service: https://rest-shop-api.YOUR-SUBDOMAIN.workers.dev"
echo "- Payment Service: https://rest-shop-payments.YOUR-SUBDOMAIN.workers.dev"
echo ""
echo "Note: Use the Gateway URL for all API requests."
echo "The Gateway will automatically route to the correct service."
