#!/bin/bash

# Microservices Structure Validation Script
# Validates that all required files are present and properly configured

set -e

echo "=========================================="
echo "Validating Microservices Structure"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

errors=0

# Check for required files
echo -e "${BLUE}Checking required files...${NC}"

files=(
    "src/gateway-worker.js"
    "src/payment-worker.js"
    "src/worker.js"
    "wrangler-gateway.toml"
    "wrangler-payments.toml"
    "wrangler.toml"
    "app.js"
    "scripts/deploy-microservices.sh"
    "docs/MICROSERVICES_ARCHITECTURE.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (missing)"
        errors=$((errors+1))
    fi
done

echo ""
echo -e "${BLUE}Checking configuration files...${NC}"

# Check wrangler-gateway.toml has service bindings
if grep -q "PAYMENT_SERVICE" wrangler-gateway.toml && grep -q "BASE_SERVICE" wrangler-gateway.toml; then
    echo -e "${GREEN}✓${NC} Gateway has service bindings configured"
else
    echo -e "${RED}✗${NC} Gateway missing service bindings"
    errors=$((errors+1))
fi

# Check that payment routes are removed from app.js
if ! grep -q "require('./api/routes/payments')" app.js; then
    echo -e "${GREEN}✓${NC} Payment routes removed from app.js"
else
    echo -e "${RED}✗${NC} Payment routes still in app.js"
    errors=$((errors+1))
fi

if ! grep -q "app.use('/payments'" app.js; then
    echo -e "${GREEN}✓${NC} Payment route mounting removed from app.js"
else
    echo -e "${RED}✗${NC} Payment route mounting still in app.js"
    errors=$((errors+1))
fi

# Check that gateway worker routes correctly
if grep -q "/api/payments" src/gateway-worker.js; then
    echo -e "${GREEN}✓${NC} Gateway routes /api/payments"
else
    echo -e "${RED}✗${NC} Gateway doesn't route /api/payments"
    errors=$((errors+1))
fi

# Check that payment worker has payment routes
if grep -q "paymentRoutes" src/payment-worker.js; then
    echo -e "${GREEN}✓${NC} Payment worker imports payment routes"
else
    echo -e "${RED}✗${NC} Payment worker missing payment routes"
    errors=$((errors+1))
fi

# Check package.json has deployment scripts
if grep -q "deploy:all" package.json && grep -q "deploy:gateway" package.json; then
    echo -e "${GREEN}✓${NC} Deployment scripts added to package.json"
else
    echo -e "${RED}✗${NC} Deployment scripts missing from package.json"
    errors=$((errors+1))
fi

echo ""
echo "=========================================="
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✓ All validation checks passed!${NC}"
    echo "=========================================="
    exit 0
else
    echo -e "${RED}✗ Validation failed with $errors error(s)${NC}"
    echo "=========================================="
    exit 1
fi
