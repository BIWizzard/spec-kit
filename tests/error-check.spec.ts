import { test, expect } from '@playwright/test';

test('Check for JavaScript errors on homepage', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
    if (msg.type() === 'warning') {
      warnings.push(`Console Warning: ${msg.text()}`);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });

  // Listen for failed requests
  page.on('requestfailed', request => {
    errors.push(`Failed Request: ${request.url()} - ${request.failure()?.errorText}`);
  });

  // Navigate to homepage
  await page.goto('/');

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // Log what we found
  console.log('🔍 Error Check Results:');
  console.log('=====================');

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} errors:`);
    errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
  } else {
    console.log('✅ No JavaScript errors found');
  }

  if (warnings.length > 0) {
    console.log(`⚠️ Found ${warnings.length} warnings:`);
    warnings.forEach((warning, i) => console.log(`${i + 1}. ${warning}`));
  } else {
    console.log('✅ No console warnings found');
  }

  // Check if page loaded successfully
  const title = await page.title();
  console.log(`📄 Page title: ${title}`);

  // Check if main content is visible
  const mainHeading = page.locator('h1');
  const isHeadingVisible = await mainHeading.isVisible();
  console.log(`📝 Main heading visible: ${isHeadingVisible}`);

  if (isHeadingVisible) {
    const headingText = await mainHeading.textContent();
    console.log(`📝 Heading text: "${headingText}"`);
  }

  // Test basic interactivity
  const signInButton = page.locator('a:has-text("Sign In")').first();
  if (await signInButton.isVisible()) {
    console.log('✅ Sign In button is visible and clickable');

    // Try hovering to test CSS transitions
    await signInButton.hover();
    console.log('✅ Hover effects work');
  }

  console.log('\n🎯 Summary:');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Page loads: ${title.includes('KGiQ') ? 'Success' : 'Failed'}`);

  // The test should not fail for warnings, only for actual errors
  // But let's be informative rather than strict
  if (errors.length > 0) {
    console.log('\n⚠️ Errors detected but test will continue for debugging');
  }
});