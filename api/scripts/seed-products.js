#!/usr/bin/env node
/**
 * @file seed-products.js
 * @description Seeds the database with sample products for a professional e-commerce look
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product');

// Professional sample products with descriptions and placeholder images
const sampleProducts = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Wireless Bluetooth Headphones',
    price: 79.99,
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear sound quality. Perfect for music lovers and professionals on the go.',
    category: 'Electronics',
    stock: 45,
    sku: 'ELECT-HEAD-001',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Smart Watch Series 5',
    price: 299.99,
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    description: 'Advanced fitness tracking, heart rate monitoring, GPS, and smartphone notifications. Water-resistant with a stunning AMOLED display and 5-day battery life.',
    category: 'Electronics',
    stock: 32,
    sku: 'ELECT-WATCH-002',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Leather Messenger Bag',
    price: 129.99,
    productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    description: 'Handcrafted genuine leather messenger bag with multiple compartments. Ideal for laptops up to 15 inches. Timeless style meets modern functionality.',
    category: 'Accessories',
    stock: 18,
    sku: 'ACCS-BAG-003',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Portable Bluetooth Speaker',
    price: 49.99,
    productImage: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop',
    description: '360-degree sound with deep bass, IPX7 waterproof rating, and 12-hour playtime. Perfect for outdoor adventures, pool parties, and travel.',
    category: 'Electronics',
    stock: 67,
    sku: 'ELECT-SPEAK-004',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Premium Yoga Mat',
    price: 39.99,
    productImage: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    description: 'Extra-thick 6mm eco-friendly TPE yoga mat with excellent cushioning and non-slip surface. Includes carrying strap. Perfect for yoga, pilates, and meditation.',
    category: 'Sports & Fitness',
    stock: 54,
    sku: 'SPORT-YOGA-005',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Stainless Steel Water Bottle',
    price: 24.99,
    productImage: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
    description: 'Double-wall insulated stainless steel bottle keeps drinks cold for 24 hours or hot for 12 hours. BPA-free, leak-proof design. 750ml capacity.',
    category: 'Sports & Fitness',
    stock: 89,
    sku: 'SPORT-BOTTLE-006',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Organic Cotton T-Shirt',
    price: 29.99,
    productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    description: 'Soft, breathable 100% organic cotton t-shirt with a classic fit. Sustainably sourced and ethically manufactured. Available in multiple colors.',
    category: 'Clothing',
    stock: 120,
    sku: 'CLOTH-SHIRT-007',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Wireless Keyboard & Mouse Combo',
    price: 59.99,
    productImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop',
    description: 'Ergonomic wireless keyboard and mouse set with quiet keys and precision tracking. 2.4GHz wireless connectivity with up to 18-month battery life.',
    category: 'Electronics',
    stock: 41,
    sku: 'ELECT-KEYBD-008',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Bamboo Sunglasses',
    price: 69.99,
    productImage: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop',
    description: 'Eco-friendly sunglasses with handcrafted bamboo frames and polarized UV400 lenses. Stylish, sustainable, and comfortable for all-day wear.',
    category: 'Accessories',
    stock: 34,
    sku: 'ACCS-SUNG-009',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Ceramic Coffee Mug Set',
    price: 34.99,
    productImage: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
    description: 'Set of 4 handcrafted ceramic mugs with elegant design. Microwave and dishwasher safe. 12oz capacity each. Perfect for your morning coffee or tea.',
    category: 'Home & Kitchen',
    stock: 76,
    sku: 'HOME-MUG-010',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'LED Desk Lamp',
    price: 44.99,
    productImage: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
    description: 'Adjustable LED desk lamp with touch control, 3 color modes, and 5 brightness levels. USB charging port included. Eye-caring technology reduces eye strain.',
    category: 'Home & Kitchen',
    stock: 28,
    sku: 'HOME-LAMP-011',
    isActive: true
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Running Shoes - Performance',
    price: 89.99,
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper. Engineered for speed and comfort during long runs and training sessions.',
    category: 'Sports & Fitness',
    stock: 52,
    sku: 'SPORT-SHOE-012',
    isActive: true
  }
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_ATLAS_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/rest-shop';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if products already exist
    const existingCount = await Product.countDocuments();
    if (existingCount > 0) {
      console.log(`INFO: Database already has ${existingCount} products`);
      console.log('Do you want to:');
      console.log('  1. Skip seeding (keep existing products)');
      console.log('  2. Add sample products alongside existing ones');
      console.log('  3. Clear all and reseed');
      console.log('\nTo proceed, run with --force flag to add alongside existing products');
      console.log('Or run with --clear flag to clear and reseed\n');
      
      // Check for command line flags
      const args = process.argv.slice(2);
      if (args.includes('--clear')) {
        console.log('Clearing existing products...');
        await Product.deleteMany({});
        console.log('Cleared existing products');
      } else if (!args.includes('--force')) {
        await mongoose.connection.close();
        return;
      }
    }

    // Insert sample products
    console.log('Seeding sample products...');
    await Product.insertMany(sampleProducts);
    
    console.log(`Successfully seeded ${sampleProducts.length} products!`);
    console.log('\nSample products added:');
    sampleProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - $${product.price}`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedProducts();
}

module.exports = seedProducts;
