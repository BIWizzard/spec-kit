/**
 * TDD Verification Script
 * Task: T135a - Verify all contract tests fail before implementation begins
 *
 * This script runs all contract tests and ensures they FAIL as expected in TDD.
 * If any contract test passes, it indicates premature implementation.
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  error?: string;
  output?: string;
}

class TDDVerifier {
  private contractTestsDir = '/Users/kmgdev/dev_projects/spec-kit/tests/contract';
  private results: TestResult[] = [];

  async run(): Promise<void> {
    console.log('🔍 TDD Verification: Ensuring all contract tests fail before implementation');
    console.log('=' .repeat(80));

    const contractTests = this.getContractTestFiles();
    
    if (contractTests.length === 0) {
      console.error('❌ ERROR: No contract test files found!');
      process.exit(1);
    }

    console.log(`Found ${contractTests.length} contract test files to verify`);
    console.log('');

    for (const testFile of contractTests) {
      await this.runSingleTest(testFile);
    }

    this.printResults();
    this.validateTDDCompliance();
  }

  private getContractTestFiles(): string[] {
    try {
      return readdirSync(this.contractTestsDir)
        .filter(file => file.startsWith('test_') && file.endsWith('.ts'))
        .sort();
    } catch (error) {
      console.error('❌ ERROR: Cannot read contract tests directory:', error);
      process.exit(1);
    }
  }

  private async runSingleTest(testFile: string): Promise<void> {
    const testPath = join(this.contractTestsDir, testFile);
    const testResult: TestResult = {
      testFile,
      passed: false
    };

    try {
      // Run the specific test file
      const output = execSync(
        `npx jest ${testPath} --verbose --no-cache --forceExit`,
        { 
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout per test file
        }
      );
      
      testResult.passed = true;
      testResult.output = output;
      
    } catch (error: any) {
      testResult.passed = false;
      testResult.error = error.message;
      testResult.output = error.stdout || error.stderr || '';
    }

    this.results.push(testResult);
    
    // Print immediate feedback
    if (testResult.passed) {
      console.log(`❌ ${testFile}: PASSED (TDD VIOLATION!)`);
    } else {
      console.log(`✅ ${testFile}: FAILED (Expected for TDD)`);
    }
  }

  private printResults(): void {
    console.log('');
    console.log('📊 TDD Verification Results');
    console.log('=' .repeat(80));
    
    const passedTests = this.results.filter(r => r.passed);
    const failedTests = this.results.filter(r => !r.passed);
    
    console.log(`Total contract tests: ${this.results.length}`);
    console.log(`Expected failures (TDD compliant): ${failedTests.length}`);
    console.log(`Unexpected passes (TDD violations): ${passedTests.length}`);
    console.log('');

    if (passedTests.length > 0) {
      console.log('🚨 TDD VIOLATIONS - These tests should FAIL:');
      passedTests.forEach(test => {
        console.log(`  - ${test.testFile}`);
      });
      console.log('');
    }

    if (failedTests.length > 0) {
      console.log('✅ TDD COMPLIANT - These tests correctly fail:');
      failedTests.forEach(test => {
        console.log(`  - ${test.testFile}`);
      });
      console.log('');
    }
  }

  private validateTDDCompliance(): void {
    const passedTests = this.results.filter(r => r.passed);
    
    if (passedTests.length > 0) {
      console.log('❌ TDD VERIFICATION FAILED!');
      console.log('');
      console.log('The following contract tests are passing, indicating premature implementation:');
      
      passedTests.forEach(test => {
        console.log(`\n🚨 ${test.testFile}:`);
        if (test.output) {
          // Show first few lines of output to understand why it passed
          const lines = test.output.split('\n').slice(0, 10);
          lines.forEach(line => console.log(`   ${line}`));
        }
      });
      
      console.log('');
      console.log('❗ ACTION REQUIRED:');
      console.log('1. Remove any premature API implementations');
      console.log('2. Ensure all endpoints return 404 or connection refused');
      console.log('3. Re-run this verification script');
      console.log('4. Only proceed with implementation after ALL tests fail');
      
      process.exit(1);
    } else {
      console.log('✅ TDD VERIFICATION PASSED!');
      console.log('');
      console.log(`All ${this.results.length} contract tests are correctly failing.`);
      console.log('This confirms no premature implementation exists.');
      console.log('');
      console.log('🚀 Ready to proceed with TDD implementation:');
      console.log('1. ✅ Contract tests written and failing');
      console.log('2. ⏭️  Next: Implement service layer (Phase 4)');
      console.log('3. ⏭️  Then: Implement API endpoints (Phase 5)');
      console.log('4. ✅ Tests will pass as implementation progresses');
      
      process.exit(0);
    }
  }

  // Additional method to check test quality
  private analyzeTestQuality(): void {
    console.log('');
    console.log('🔍 Test Quality Analysis');
    console.log('-'.repeat(40));
    
    this.results.forEach(result => {
      if (!result.passed && result.output) {
        // Analyze the failure reason
        const output = result.output.toLowerCase();
        
        if (output.includes('econnrefused') || output.includes('connect econnrefused')) {
          console.log(`✅ ${result.testFile}: Properly failing (connection refused)`);
        } else if (output.includes('404') || output.includes('not found')) {
          console.log(`✅ ${result.testFile}: Properly failing (endpoint not found)`);
        } else if (output.includes('timeout')) {
          console.log(`⚠️  ${result.testFile}: Timeout (may need server setup)`);
        } else {
          console.log(`❓ ${result.testFile}: Unknown failure reason`);
        }
      }
    });
  }
}

// Run the TDD verification
if (require.main === module) {
  const verifier = new TDDVerifier();
  verifier.run().catch(error => {
    console.error('💥 TDD Verification crashed:', error);
    process.exit(1);
  });
}

export { TDDVerifier };
