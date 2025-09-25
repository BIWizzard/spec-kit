import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Wait for the application to be available
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  try {
    // Check if the app is running
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    console.log('✅ Application is running and ready for E2E tests');
  } catch (error) {
    console.error('❌ Application is not running. Please start the development server first.');
    console.error('Run: npm run dev');
    throw error;
  } finally {
    await browser.close();
  }

  // Set up test database or clean state if needed
  console.log('🧹 Preparing clean test environment...');

  // Store global state that can be used across tests
  process.env.E2E_SETUP_COMPLETE = 'true';

  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;