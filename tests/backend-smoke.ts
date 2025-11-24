/**
 * Backend API Smoke Tests
 * Validates that core API endpoints respond without crashing
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  error?: string;
  note?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: string,
  path: string,
  expectedStatus: number | number[],
  body?: any,
  note?: string
): Promise<void> {
  const url = `${API_BASE}${path}`;
  const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const status = response.status;
    
    if (expectedStatuses.includes(status)) {
      results.push({
        endpoint: path,
        method,
        status: 'PASS',
        statusCode: status,
        note,
      });
      console.log(`✓ ${method} ${path} → ${status}`);
    } else {
      results.push({
        endpoint: path,
        method,
        status: 'FAIL',
        statusCode: status,
        error: `Expected ${expectedStatuses.join(' or ')}, got ${status}`,
        note,
      });
      console.log(`✗ ${method} ${path} → ${status} (expected ${expectedStatuses.join(' or ')})`);
    }
  } catch (error: any) {
    results.push({
      endpoint: path,
      method,
      status: 'FAIL',
      error: error.message,
      note,
    });
    console.log(`✗ ${method} ${path} → ERROR: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n🧪 Starting Backend Smoke Tests...\n');
  console.log(`Testing API at: ${API_BASE}\n`);
  
  // Test public/unauthenticated endpoints
  console.log('📋 Public Endpoints:');
  await testEndpoint('GET', '/', 200, undefined, 'Landing page');
  await testEndpoint('GET', '/api/login', [302, 200], undefined, 'Login redirect');
  
  // Test authenticated endpoints (expect 401 without auth)
  console.log('\n📋 Protected Endpoints (should require auth):');
  await testEndpoint('GET', '/api/auth/user', [401, 403], undefined, 'User profile endpoint');
  await testEndpoint('GET', '/api/employees', [401, 403], undefined, 'List employees');
  await testEndpoint('GET', '/api/checks/standalone', [401, 403], undefined, 'Standalone checks');
  await testEndpoint('POST', '/api/employees', [401, 403], {
    firstName: 'Test',
    lastName: 'User',
  }, 'Create employee');
  
  // Test public upload validation (token-based, should return 400 without token)
  console.log('\n📋 Public Upload Endpoints:');
  await testEndpoint('POST', '/api/public-upload/validate', [400, 401], {}, 'Validate upload token');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary:');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  if (skipped > 0) console.log(`⊘ Skipped: ${skipped}`);
  console.log(`Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}: ${r.error}`);
    });
  }
  
  console.log('\n');
  
  // Write results to JSON for diagnostics report
  const fs = await import('fs/promises');
  await fs.writeFile(
    'tests/backend-smoke-results.json',
    JSON.stringify(results, null, 2)
  );
  
  return failed === 0;
}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
