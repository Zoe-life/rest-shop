/**
 * Cloudflare Workers Polyfills
 * 
 * This file MUST be imported first in worker.js to ensure polyfills
 * are available before any other modules are loaded.
 * 
 * Critical: process.emitWarning is used by many Node.js modules during
 * initialization (mongoose, mongodb, undici, etc.) and must be polyfilled
 * before those modules are imported.
 */

// Ensure globalThis.process exists
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    version: 'v20.0.0', // Fake Node version for compatibility checks
    versions: { node: '20.0.0' },
    platform: 'cloudflare',
    arch: 'x64',
    env: {},
  };
}

// Polyfill process.emitWarning for Cloudflare Workers
// Many Node.js modules call this during initialization
// Use a more defensive check to avoid accessing undefined properties
if (!globalThis.process.emitWarning || typeof globalThis.process.emitWarning !== 'function') {
  globalThis.process.emitWarning = function(warning, type, code) {
    // In Cloudflare Workers, we log warnings to console instead
    const warningType = type || 'Warning';
    const warningCode = code ? ` (${code})` : '';
    console.warn(`[${warningType}]${warningCode}: ${warning}`);
  };
}

// Also ensure process is available on global scope (not just globalThis)
if (typeof global !== 'undefined' && typeof global.process === 'undefined') {
  global.process = globalThis.process;
}

// Export for explicit imports if needed
export const polyfillsInitialized = true;
