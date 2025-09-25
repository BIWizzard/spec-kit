import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up any test data or resources
  // This could include:
  // - Cleaning test database
  // - Removing uploaded files
  // - Resetting application state

  // Clean up environment variables
  delete process.env.E2E_SETUP_COMPLETE;

  console.log('✅ E2E test environment cleanup complete');
}

export default globalTeardown;