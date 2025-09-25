import { test, expect } from '@playwright/test';

test('View landing page UI', async ({ page }) => {
  // Navigate to the landing page
  await page.goto('/');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Take a screenshot
  await page.screenshot({ path: 'landing-page.png', fullPage: true });

  // Check what's visible on the page
  console.log('📱 Landing Page Content:');
  console.log('======================');

  // Check the title
  const title = await page.title();
  console.log(`Title: ${title}`);

  // Check main heading
  const mainHeading = page.locator('h1').first();
  if (await mainHeading.isVisible()) {
    const headingText = await mainHeading.textContent();
    console.log(`Main Heading: ${headingText}`);
  }

  // Check for feature cards
  const featureCards = page.locator('div').filter({ hasText: 'Income Attribution' });
  if (await featureCards.count() > 0) {
    console.log('✅ Feature cards are visible');
  }

  // Check navigation links
  const navLinks = page.locator('a');
  const navCount = await navLinks.count();
  console.log(`📍 Found ${navCount} navigation links`);

  // List some key links
  const keyLinks = ['Sign In', 'Get Started', 'Dashboard', 'Income'];
  for (const linkText of keyLinks) {
    const link = page.locator(`a:has-text("${linkText}")`);
    if (await link.count() > 0) {
      console.log(`✅ "${linkText}" link found`);
    } else {
      console.log(`❌ "${linkText}" link not found`);
    }
  }

  // Check for KGiQ branding
  const kgiqText = page.locator('text=KGiQ');
  if (await kgiqText.count() > 0) {
    console.log('✅ KGiQ branding visible');
  }

  // Check background styling
  const bodyClass = await page.locator('body').getAttribute('class');
  console.log(`Body classes: ${bodyClass}`);

  // Get page dimensions
  const viewport = page.viewportSize();
  console.log(`Viewport: ${viewport?.width}x${viewport?.height}`);

  console.log('\n📸 Screenshot saved as: landing-page.png');
  console.log('🎨 Page styling and layout captured!');
});