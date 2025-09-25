import { test, expect } from '@playwright/test';

test('Check for errors when navigating to different pages', async ({ page }) => {
  const errors: { page: string; error: string }[] = [];

  // Listen for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ page: page.url(), error: `Console Error: ${msg.text()}` });
    }
  });

  page.on('pageerror', error => {
    errors.push({ page: page.url(), error: `Page Error: ${error.message}` });
  });

  // Test pages that should exist
  const testPages = [
    { path: '/', name: 'Homepage' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/income', name: 'Income' },
    { path: '/payments', name: 'Payments' }
  ];

  console.log('🧪 Testing navigation to different pages...');
  console.log('===============================================');

  for (const testPage of testPages) {
    try {
      console.log(`\n📍 Testing ${testPage.name} (${testPage.path})`);

      const response = await page.goto(testPage.path);
      const status = response?.status();

      console.log(`   Status: ${status}`);

      if (status === 200) {
        console.log('   ✅ Page loaded successfully');

        // Wait a moment for any JavaScript to execute
        await page.waitForTimeout(1000);

        // Check if there's any content
        const body = await page.locator('body').textContent();
        if (body && body.length > 100) {
          console.log('   ✅ Content loaded');
        } else {
          console.log('   ⚠️ Limited content found');
        }
      } else {
        console.log(`   ❌ Page returned ${status}`);
        errors.push({ page: testPage.path, error: `HTTP ${status}` });
      }

    } catch (error) {
      console.log(`   ❌ Navigation failed: ${error}`);
      errors.push({ page: testPage.path, error: `Navigation failed: ${error}` });
    }
  }

  console.log('\n📋 Error Summary:');
  console.log('==================');

  if (errors.length === 0) {
    console.log('✅ No errors found during navigation!');
  } else {
    console.log(`❌ Found ${errors.length} errors:`);
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.page}: ${err.error}`);
    });
  }
});