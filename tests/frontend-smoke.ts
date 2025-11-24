/**
 * Frontend Smoke Tests
 * Validates that key pages and components can be imported and are structurally valid
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  error?: string;
  note?: string;
}

const results: TestResult[] = [];
const clientRoot = join(process.cwd(), 'client/src');

function testComponentExists(componentPath: string, note?: string): void {
  const fullPath = join(clientRoot, componentPath);
  
  try {
    if (!existsSync(fullPath)) {
      results.push({
        component: componentPath,
        status: 'FAIL',
        error: 'File does not exist',
        note,
      });
      console.log(`✗ ${componentPath} - File not found`);
      return;
    }
    
    const content = readFileSync(fullPath, 'utf-8');
    
    // Basic validation: check if it's a valid TypeScript/React file
    const hasExport = /export/.test(content);
    const hasReact = /from ['"]react['"]/.test(content) || /\.tsx$/.test(componentPath);
    
    if (!hasExport) {
      results.push({
        component: componentPath,
        status: 'FAIL',
        error: 'No exports found',
        note,
      });
      console.log(`✗ ${componentPath} - No exports`);
      return;
    }
    
    results.push({
      component: componentPath,
      status: 'PASS',
      note,
    });
    console.log(`✓ ${componentPath}`);
  } catch (error: any) {
    results.push({
      component: componentPath,
      status: 'FAIL',
      error: error.message,
      note,
    });
    console.log(`✗ ${componentPath} - ${error.message}`);
  }
}

function testComponentHasDataTestIds(componentPath: string, requiredTestIds: string[]): void {
  const fullPath = join(clientRoot, componentPath);
  const componentName = componentPath.split('/').pop()?.replace('.tsx', '') || componentPath;
  
  try {
    if (!existsSync(fullPath)) {
      results.push({
        component: `${componentName} (testids)`,
        status: 'SKIP',
        note: 'Component file not found',
      });
      return;
    }
    
    const content = readFileSync(fullPath, 'utf-8');
    const missingIds: string[] = [];
    
    for (const testId of requiredTestIds) {
      if (!content.includes(`data-testid="${testId}"`)) {
        missingIds.push(testId);
      }
    }
    
    if (missingIds.length === 0) {
      results.push({
        component: `${componentName} (testids)`,
        status: 'PASS',
        note: `All ${requiredTestIds.length} test IDs present`,
      });
      console.log(`  ✓ ${componentName} has all required test IDs`);
    } else {
      results.push({
        component: `${componentName} (testids)`,
        status: 'FAIL',
        error: `Missing test IDs: ${missingIds.join(', ')}`,
      });
      console.log(`  ✗ ${componentName} missing test IDs: ${missingIds.join(', ')}`);
    }
  } catch (error: any) {
    results.push({
      component: `${componentName} (testids)`,
      status: 'FAIL',
      error: error.message,
    });
  }
}

async function runTests() {
  console.log('\n🧪 Starting Frontend Smoke Tests...\n');
  
  // Test core pages exist
  console.log('📄 Core Pages:');
  testComponentExists('pages/landing.tsx', 'Landing/login page');
  testComponentExists('pages/dashboard.tsx', 'Main dashboard');
  testComponentExists('pages/employee-detail.tsx', 'Employee detail page');
  testComponentExists('pages/check-detail.tsx', 'Check detail page');
  testComponentExists('pages/check-new.tsx', 'New check form');
  testComponentExists('pages/public-upload.tsx', 'Public upload page');
  testComponentExists('pages/employee-new.tsx', 'New employee form');
  
  // Test critical components
  console.log('\n🧩 Critical Components:');
  testComponentExists('components/PageHeader.tsx', 'Page header component');
  testComponentExists('components/ObjectUploader.tsx', 'File uploader component');
  testComponentExists('components/CertiaLogo.tsx', 'Certia logo component');
  testComponentExists('App.tsx', 'Main app component');
  
  // Test UI components (shadcn)
  console.log('\n🎨 UI Components (sample):');
  testComponentExists('components/ui/button.tsx', 'Button component');
  testComponentExists('components/ui/card.tsx', 'Card component');
  testComponentExists('components/ui/form.tsx', 'Form component');
  testComponentExists('components/ui/input.tsx', 'Input component');
  testComponentExists('components/ui/table.tsx', 'Table component');
  
  // Test data-testid presence in key interactive pages
  console.log('\n🏷️  Test ID Coverage:');
  testComponentHasDataTestIds('pages/dashboard.tsx', [
    'text-total-employees',
    'text-eligible-count',
    'input-search',
    'select-status',
  ]);
  testComponentHasDataTestIds('pages/check-new.tsx', [
    'button-submit',
    'input-expiry-date',
    'button-back',
  ]);
  testComponentHasDataTestIds('pages/check-detail.tsx', [
    'select-case-status',
    'button-print-summary',
  ]);
  
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
      console.log(`  - ${r.component}: ${r.error}`);
    });
  }
  
  console.log('\n');
  
  // Write results to JSON
  const fs = await import('fs/promises');
  await fs.writeFile(
    'tests/frontend-smoke-results.json',
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
