#!/usr/bin/env node
/**
 * @file restore-demo-stock.js
 * @description Restores stock > 0 for three demo products so that the
 *   Add-to-Cart and Buy-Now buttons are enabled and the full checkout
 *   flow can be tested end-to-end.
 *
 * Usage:
 *   node scripts/restore-demo-stock.js
 *
 * The three products are identified by their SKU codes so the script is
 * safe to run multiple times (idempotent).
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product');

// The three demo SKUs that will be made available for purchase.
// Adjust DEMO_STOCK to control how many units are restored.
const DEMO_STOCK = 50;
const DEMO_SKUS = [
  'ELECT-HEAD-001', // Wireless Bluetooth Headphones
  'ELECT-WATCH-002', // Smart Watch Series 5
  'ACCS-BAG-003',    // Leather Messenger Bag
];

async function restoreDemoStock() {
  const mongoUri =
    process.env.MONGO_ATLAS_URI ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/rest-shop';

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let updated = 0;
    for (const sku of DEMO_SKUS) {
      const result = await Product.updateOne(
        { sku },
        { $set: { stock: DEMO_STOCK } }
      );

      if (result.matchedCount === 0) {
        console.warn(`  [WARNING] SKU "${sku}" not found - skipping`);
      } else if (result.modifiedCount === 0) {
        console.log(`  [OK] SKU "${sku}" already has stock ${DEMO_STOCK} - no change needed`);
        updated++;
      } else {
        console.log(`  [OK] SKU "${sku}" stock set to ${DEMO_STOCK}`);
        updated++;
      }
    }

    if (updated === 0) {
      console.log('\n[WARNING] No products were updated. Run "npm run seed" first if the database is empty.');
    } else {
      console.log(`\n[OK] Demo stock restored for ${updated} product(s).`);
      console.log('You can now test Add-to-Cart and Buy-Now for these products:');
      DEMO_SKUS.forEach((sku) => console.log(`  - ${sku}`));
    }
  } catch (error) {
    console.error('[ERROR] Failed to restore demo stock:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

if (require.main === module) {
  restoreDemoStock();
}

module.exports = restoreDemoStock;
