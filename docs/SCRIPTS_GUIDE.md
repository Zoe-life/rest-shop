# Seeding Sample Products

This directory contains scripts for managing database seed data.

## seed-products.js

Seeds the database with professional sample products including:
- Product names and descriptions
- Realistic pricing
- Product categories
- Stock quantities
- High-quality placeholder images from Unsplash

### Usage

```bash
# View what would be seeded (safe mode)
node api/scripts/seed-products.js

# Add sample products alongside existing ones
node api/scripts/seed-products.js --force

# Clear existing products and reseed
node api/scripts/seed-products.js --clear
```

### Sample Products Include:
- Electronics (headphones, smart watches, speakers, keyboards)
- Accessories (bags, sunglasses)
- Sports & Fitness (yoga mats, water bottles, running shoes)
- Clothing (organic cotton t-shirts)
- Home & Kitchen (coffee mugs, desk lamps)

All products include:
- Professional descriptions
- Realistic pricing ($24.99 - $299.99)
- High-quality product images
- Stock quantities
- SKU numbers
- Categories

### Environment Variables

The script uses the following MongoDB connection (in order of preference):
1. `MONGO_ATLAS_URI`
2. `MONGODB_URI`
3. Default: `mongodb://localhost:27017/rest-shop`
