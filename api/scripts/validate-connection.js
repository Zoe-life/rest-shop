#!/usr/bin/env node

/**
 * Connection Validation Script
 * 
 * This script helps validate that the Cloudflare Worker can communicate
 * with the Node.js backend by checking configuration and testing connectivity.
 */

const https = require('https');
const http = require('http');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`SUCCESS: ${message}`, 'green');
}

function logError(message) {
  log(`ERROR: ${message}`, 'red');
}

function logWarning(message) {
  log(`WARNING: ${message}`, 'yellow');
}

function logInfo(message) {
  log(`INFO: ${message}`, 'cyan');
}

function logSection(message) {
  console.log('');
  log(`═══════════════════════════════════════`, 'blue');
  log(` ${message}`, 'blue');
  log(`═══════════════════════════════════════`, 'blue');
  console.log('');
}

/**
 * Test HTTP/HTTPS endpoint
 */
function testEndpoint(url, expectJson = true) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'REST-Shop-Validator/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = expectJson ? JSON.parse(data) : { raw: data };
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after 10 seconds'));
    });

    req.end();
  });
}

/**
 * Validate backend configuration
 */
async function validateBackend(backendUrl) {
  logSection('Backend Validation');

  if (!backendUrl) {
    logError('No backend URL provided');
    logInfo('Usage: node validate-connection.js <backend-url> [worker-url]');
    logInfo('Example: node validate-connection.js https://your-app.onrender.com');
    return false;
  }

  logInfo(`Testing backend at: ${backendUrl}`);

  // Test backend health endpoint
  try {
    const healthUrl = `${backendUrl}/health`;
    logInfo(`Checking ${healthUrl}...`);
    
    const response = await testEndpoint(healthUrl);

    if (response.statusCode === 200) {
      logSuccess('Backend is accessible');
      
      // Check response structure
      if (response.data.status === 'ok') {
        logSuccess('Backend reports healthy status');
      } else {
        logWarning(`Backend status: ${response.data.status || 'unknown'}`);
      }

      // Check database connection
      if (response.data.database === 'connected') {
        logSuccess('Database is connected');
      } else {
        logError('Database is not connected');
        logInfo('Check MONGODB_URI in your backend environment');
      }

      // Check environment
      if (response.data.environment) {
        logInfo(`Environment: ${response.data.environment}`);
      }

      return true;
    } else {
      logError(`Backend returned status code: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to connect to backend: ${error.message}`);
    logInfo('Possible reasons:');
    logInfo('  - Backend is not running');
    logInfo('  - URL is incorrect');
    logInfo('  - Firewall blocking the connection');
    logInfo('  - Backend takes too long to respond');
    return false;
  }
}

/**
 * Validate worker configuration
 */
async function validateWorker(workerUrl, backendUrl) {
  logSection('Worker Validation');

  if (!workerUrl) {
    logWarning('No worker URL provided, skipping worker validation');
    logInfo('To validate worker: node validate-connection.js <backend-url> <worker-url>');
    return null;
  }

  logInfo(`Testing worker at: ${workerUrl}`);

  // Test worker health endpoint
  try {
    const healthUrl = `${workerUrl}/health`;
    logInfo(`Checking ${healthUrl}...`);
    
    const response = await testEndpoint(healthUrl);

    if (response.statusCode === 200) {
      logSuccess('Worker is accessible');

      // Check worker status
      if (response.data.worker === 'ok') {
        logSuccess('Worker reports healthy status');
      } else {
        logWarning(`Worker status: ${response.data.worker || 'unknown'}`);
      }

      // Check backend connection from worker
      if (response.data.backend) {
        if (typeof response.data.backend === 'string') {
          if (response.data.backend === 'unreachable') {
            logError('Worker cannot reach backend');
            logInfo('Possible reasons:');
            logInfo('  - BACKEND_API_URL is not set in Cloudflare Worker');
            logInfo('  - BACKEND_API_URL points to wrong URL');
            logInfo('  - Backend is not accessible from Cloudflare');
            return false;
          }
        } else if (response.data.backend.status === 'ok') {
          logSuccess('Worker can communicate with backend');
          
          // Check if backend database is connected
          if (response.data.backend.database === 'connected') {
            logSuccess('Backend database is connected (verified through worker)');
          } else {
            logWarning('Backend database appears disconnected');
          }
          
          return true;
        }
      } else {
        logWarning('Cannot determine backend connection status from worker');
      }

      return true;
    } else if (response.statusCode === 503) {
      logError('Worker is running but backend is unavailable');
      
      if (response.data.backend === 'unreachable') {
        logError('Worker reports backend as unreachable');
        logInfo('Check BACKEND_API_URL in Cloudflare Worker settings');
      }
      
      return false;
    } else {
      logError(`Worker returned status code: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to connect to worker: ${error.message}`);
    logInfo('Possible reasons:');
    logInfo('  - Worker is not deployed yet');
    logInfo('  - Worker URL is incorrect');
    logInfo('  - Worker deployment failed');
    return false;
  }
}

/**
 * Test worker-backend proxy
 */
async function testProxyConnection(workerUrl) {
  logSection('Proxy Connection Test');

  if (!workerUrl) {
    logWarning('No worker URL provided, skipping proxy test');
    return null;
  }

  logInfo('Testing if worker can proxy requests to backend...');

  try {
    // Test a simple endpoint through the worker
    const productsUrl = `${workerUrl}/products`;
    logInfo(`Checking ${productsUrl}...`);
    
    const response = await testEndpoint(productsUrl);

    if (response.statusCode === 200) {
      logSuccess('Worker successfully proxied request to backend');
      logSuccess('Products endpoint is working through worker');
      
      if (Array.isArray(response.data)) {
        logInfo(`Found ${response.data.length} products`);
      }
      
      return true;
    } else if (response.statusCode === 502) {
      logError('Worker returned 502 Bad Gateway');
      logError('Backend service is unavailable');
      return false;
    } else if (response.statusCode === 500) {
      logError('Worker returned 500 Internal Server Error');
      
      if (response.data && response.data.error) {
        if (response.data.error.code === 'BACKEND_NOT_CONFIGURED') {
          logError('BACKEND_API_URL is not configured in worker');
          logInfo('Fix: Run "wrangler secret put BACKEND_API_URL" in worker directory');
        }
      }
      
      return false;
    } else {
      logWarning(`Unexpected status code: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Proxy test failed: ${error.message}`);
    return false;
  }
}

/**
 * Show configuration summary
 */
function showConfigurationSummary(backendUrl, workerUrl) {
  logSection('Configuration Summary');

  console.log('Backend URL:');
  if (backendUrl) {
    log(`  ${backendUrl}`, 'cyan');
  } else {
    log('  Not provided', 'red');
  }

  console.log('\nWorker URL:');
  if (workerUrl) {
    log(`  ${workerUrl}`, 'cyan');
  } else {
    log('  Not provided (optional for this test)', 'yellow');
  }
}

/**
 * Show next steps
 */
function showNextSteps(backendOk, workerOk) {
  logSection('Next Steps');

  if (!backendOk) {
    log('Backend Issues Detected:', 'yellow');
    console.log('  1. Ensure your Node.js backend is deployed and running');
    console.log('  2. Check backend logs for errors');
    console.log('  3. Verify MONGODB_URI is set correctly');
    console.log('  4. Verify backend is accessible from the internet');
    console.log('  5. Test backend health: curl https://your-backend-url/health');
  } else if (!workerOk) {
    log('Worker Issues Detected:', 'yellow');
    console.log('  1. Deploy your worker: cd worker && wrangler deploy');
    console.log('  2. Set BACKEND_API_URL: wrangler secret put BACKEND_API_URL');
    console.log('  3. Enter your backend URL when prompted');
    console.log('  4. Test worker health: curl https://your-worker-url/health');
  } else {
    log('Everything looks good!', 'green');
    console.log('\nYour setup is working correctly:');
    console.log('  - Backend is running and accessible');
    console.log('  - Worker is deployed');
    console.log('  - Worker can communicate with backend');
    console.log('\nYou can now:');
    console.log('  - Connect your frontend to the worker URL');
    console.log('  - Test API endpoints through the worker');
    console.log('  - Monitor your backend and worker logs');
  }
}

/**
 * Main function
 */
async function main() {
  log('═══════════════════════════════════════', 'magenta');
  log(' REST Shop Connection Validator', 'magenta');
  log('═══════════════════════════════════════', 'magenta');
  console.log('');

  // Get URLs from command line arguments
  const backendUrl = process.argv[2];
  const workerUrl = process.argv[3];

  // Show configuration
  showConfigurationSummary(backendUrl, workerUrl);

  // Validate backend
  const backendOk = await validateBackend(backendUrl);

  // Validate worker (if URL provided)
  let workerOk = null;
  if (workerUrl) {
    workerOk = await validateWorker(workerUrl, backendUrl);

    // Test proxy if both are OK
    if (backendOk && workerOk) {
      await testProxyConnection(workerUrl);
    }
  }

  // Show next steps
  showNextSteps(backendOk, workerOk);

  // Exit with appropriate code
  if (!backendOk || (workerUrl && !workerOk)) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}
