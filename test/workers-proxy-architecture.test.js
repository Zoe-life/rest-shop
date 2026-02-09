/**
 * Test: Verify Workers no longer import Mongoose
 * 
 * This test ensures that the Cloudflare Workers have been successfully
 * refactored to not import Mongoose, solving the runtime incompatibility.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

describe('Cloudflare Workers Proxy Architecture', function() {
  
  describe('Worker Files', function() {
    
    it('worker.js should not import mongoose', function() {
      const workerPath = path.join(__dirname, '..', 'src', 'worker.js');
      const workerContent = fs.readFileSync(workerPath, 'utf8');
      
      // Check for mongoose imports
      const hasMongooseImport = workerContent.includes('import mongoose') || 
                                workerContent.includes('require(\'mongoose\')') ||
                                workerContent.includes('require("mongoose")');
      
      assert.strictEqual(hasMongooseImport, false, 
        'worker.js should not import mongoose');
    });
    
    it('payment-worker.js should not import mongoose', function() {
      const workerPath = path.join(__dirname, '..', 'src', 'payment-worker.js');
      const workerContent = fs.readFileSync(workerPath, 'utf8');
      
      const hasMongooseImport = workerContent.includes('import mongoose') || 
                                workerContent.includes('require(\'mongoose\')') ||
                                workerContent.includes('require("mongoose")');
      
      assert.strictEqual(hasMongooseImport, false, 
        'payment-worker.js should not import mongoose');
    });
    
    it('worker.js should not import polyfills', function() {
      const workerPath = path.join(__dirname, '..', 'src', 'worker.js');
      const workerContent = fs.readFileSync(workerPath, 'utf8');
      
      const hasPolyfillImport = workerContent.includes('./polyfills');
      
      assert.strictEqual(hasPolyfillImport, false, 
        'worker.js should not import polyfills (no longer needed)');
    });
    
    it('workers should have BACKEND_API_URL configuration', function() {
      const workerPath = path.join(__dirname, '..', 'src', 'worker.js');
      const workerContent = fs.readFileSync(workerPath, 'utf8');
      
      const hasBackendUrl = workerContent.includes('BACKEND_API_URL') || 
                           workerContent.includes('NODE_BACKEND_URL');
      
      assert.strictEqual(hasBackendUrl, true, 
        'worker.js should reference BACKEND_API_URL');
    });
    
    it('workers should export default fetch handler', function() {
      const workerPath = path.join(__dirname, '..', 'src', 'worker.js');
      const workerContent = fs.readFileSync(workerPath, 'utf8');
      
      const hasExportDefault = workerContent.includes('export default');
      const hasFetchHandler = workerContent.includes('async fetch(');
      
      assert.strictEqual(hasExportDefault, true, 
        'worker.js should have export default');
      assert.strictEqual(hasFetchHandler, true, 
        'worker.js should have async fetch handler');
    });
    
    it('workers should not have Durable Objects', function() {
      const workerPath = path.join(__dirname, '..', 'src', 'worker.js');
      const workerContent = fs.readFileSync(workerPath, 'utf8');
      
      const hasDurableObject = workerContent.includes('DurableObject') ||
                              workerContent.includes('export class');
      
      assert.strictEqual(hasDurableObject, false, 
        'worker.js should not have Durable Objects (proxy architecture)');
    });
  });
  
  describe('Wrangler Configuration', function() {
    
    it('wrangler.toml should not have nodejs_compat flag', function() {
      const configPath = path.join(__dirname, '..', 'wrangler.toml');
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Check if nodejs_compat is actually in the compatibility_flags array
      // Not just mentioned in comments
      const hasNodeCompat = /compatibility_flags\s*=\s*\[.*nodejs_compat.*\]/s.test(configContent);
      
      assert.strictEqual(hasNodeCompat, false, 
        'wrangler.toml should not have nodejs_compat in compatibility_flags array');
    });
    
    it('wrangler.toml should not have Durable Objects bindings', function() {
      const configPath = path.join(__dirname, '..', 'wrangler.toml');
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      const hasDurableObjectsBinding = configContent.includes('durable_objects.bindings');
      
      assert.strictEqual(hasDurableObjectsBinding, false, 
        'wrangler.toml should not have Durable Objects bindings');
    });
    
    it('wrangler.toml should not have build command', function() {
      const configPath = path.join(__dirname, '..', 'wrangler.toml');
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Should not have a build.command line that's not commented out
      const lines = configContent.split('\n');
      const buildCommandLines = lines.filter(line => 
        line.includes('command =') && 
        line.includes('[build]') === false &&
        !line.trim().startsWith('#')
      );
      
      assert.strictEqual(buildCommandLines.length, 0, 
        'wrangler.toml should not have active build command');
    });
  });
  
  describe('Backend Files', function() {
    
    it('server.js should still import mongoose', function() {
      const serverPath = path.join(__dirname, '..', 'server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const hasMongooseImport = serverContent.includes('require(\'mongoose\')') ||
                                serverContent.includes('require("mongoose")');
      
      assert.strictEqual(hasMongooseImport, true, 
        'server.js should still import mongoose (backend handles DB)');
    });
    
    it('app.js should still import mongoose', function() {
      const appPath = path.join(__dirname, '..', 'app.js');
      const appContent = fs.readFileSync(appPath, 'utf8');
      
      const hasMongooseImport = appContent.includes('require(\'mongoose\')') ||
                                appContent.includes('require("mongoose")');
      
      assert.strictEqual(hasMongooseImport, true, 
        'app.js should still import mongoose');
    });
  });
  
  describe('Documentation', function() {
    
    it('should have proxy architecture documentation', function() {
      const docPath = path.join(__dirname, '..', 'docs', 
        'CLOUDFLARE_WORKERS_PROXY_ARCHITECTURE.md');
      
      assert.strictEqual(fs.existsSync(docPath), true, 
        'Proxy architecture documentation should exist');
    });
    
    it('should have deployment guide', function() {
      const docPath = path.join(__dirname, '..', 'docs', 'DEPLOYMENT_GUIDE.md');
      
      assert.strictEqual(fs.existsSync(docPath), true, 
        'Deployment guide should exist');
    });
  });
  
});
