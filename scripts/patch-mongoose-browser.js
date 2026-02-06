#!/usr/bin/env node

/**
 * Patches mongoose browser.umd.js to add process.emitWarning polyfill
 * This is needed for Cloudflare Workers compatibility
 */

const fs = require('fs');
const path = require('path');

const mongooseBrowserPath = path.join(__dirname, '..', 'node_modules', 'mongoose', 'dist', 'browser.umd.js');

if (!fs.existsSync(mongooseBrowserPath)) {
  console.error('Error: mongoose browser.umd.js not found at:', mongooseBrowserPath);
  process.exit(1);
}

const polyfill = `// Polyfill for Cloudflare Workers compatibility
if (typeof process !== 'undefined' && typeof process.emitWarning !== 'function') {
  process.emitWarning = function(warning, type, code) {
    console.warn('[' + (type || 'Warning') + ']' + (code ? ' (' + code + ')' : '') + ': ' + warning);
  };
}

`;

try {
  const content = fs.readFileSync(mongooseBrowserPath, 'utf8');
  
  // Check if already patched
  if (content.includes('Polyfill for Cloudflare Workers compatibility')) {
    console.log('✓ Mongoose browser build already patched');
    process.exit(0);
  }
  
  const patchedContent = polyfill + content;
  fs.writeFileSync(mongooseBrowserPath, patchedContent, 'utf8');
  console.log('✓ Successfully patched mongoose browser build for Cloudflare Workers');
} catch (error) {
  console.error('Error patching mongoose:', error.message);
  process.exit(1);
}
