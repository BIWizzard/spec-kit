import { Page, expect } from '@playwright/test';

// Utility functions for mobile responsiveness testing

export interface DeviceConfig {
  name: string;
  viewport: { width: number; height: number };
  userAgent: string;
  pixelRatio?: number;
  isMobile: boolean;
  hasTouch: boolean;
}

export interface ResponsiveTestResult {
  device: string;
  viewport: { width: number; height: number };
  tests: {
    viewportMeta: boolean;
    horizontalScroll: boolean;
    touchTargets: boolean;
    navigation: boolean;
    forms: boolean;
    images: boolean;
    tables: boolean;
    performance: number;
  };
  issues: string[];
  score: number;
}

// Breakpoint definitions for responsive design
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  large: 1440
} as const;

export function getDeviceCategory(width: number): string {
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  if (width < BREAKPOINTS.large) return 'desktop';
  return 'large';
}

// Check if viewport meta tag is properly configured
export async function checkViewportMeta(page: Page): Promise<boolean> {
  try {
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

    if (!viewportMeta) return false;

    const hasWidthDevice = viewportMeta.includes('width=device-width');
    const hasInitialScale = viewportMeta.includes('initial-scale=1');

    return hasWidthDevice && hasInitialScale;
  } catch {
    return false;
  }
}

// Check for horizontal scrolling (should be avoided on mobile)
export async function checkHorizontalScroll(page: Page): Promise<boolean> {
  try {
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    return !hasHorizontalScroll; // Return true if NO horizontal scroll
  } catch {
    return false;
  }
}

// Check touch target sizes meet accessibility guidelines
export async function checkTouchTargets(page: Page): Promise<{ passed: boolean; issues: string[] }> {
  const issues: string[] = [];
  const minTouchSize = 44; // Minimum 44x44px for touch targets

  try {
    const interactiveElements = await page.locator('button, a, input[type="submit"], input[type="button"], select, [role="button"], [onclick]').all();

    for (let i = 0; i < Math.min(interactiveElements.length, 20); i++) {
      const element = interactiveElements[i];
      const box = await element.boundingBox();

      if (box && (box.width < minTouchSize || box.height < minTouchSize)) {
        const elementInfo = await element.evaluate(el => ({
          tag: el.tagName.toLowerCase(),
          class: el.className,
          text: el.textContent?.slice(0, 30),
          id: el.id
        }));

        issues.push(`Touch target too small: ${elementInfo.tag}${elementInfo.id ? '#' + elementInfo.id : ''}${elementInfo.class ? '.' + elementInfo.class.split(' ')[0] : ''} - ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }

    return { passed: issues.length === 0, issues };
  } catch {
    return { passed: false, issues: ['Failed to check touch targets'] };
  }
}

// Check mobile navigation functionality
export async function checkMobileNavigation(page: Page): Promise<{ hasNavigation: boolean; isResponsive: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Look for navigation elements
    const navElements = await page.locator('nav, [role="navigation"], .navbar, .nav, .navigation').count();

    if (navElements === 0) {
      return { hasNavigation: false, isResponsive: false, issues: ['No navigation elements found'] };
    }

    // Look for mobile-specific navigation patterns
    const mobileNavPatterns = [
      '[data-testid*="mobile"], [class*="mobile"]',
      'button[aria-label*="menu"], button[aria-label*="Menu"]',
      '.hamburger, .menu-toggle, .nav-toggle',
      '[aria-expanded], [data-toggle]'
    ];

    let hasMobileNav = false;
    for (const pattern of mobileNavPatterns) {
      const elements = await page.locator(pattern).count();
      if (elements > 0) {
        hasMobileNav = true;

        // Test if mobile nav actually works
        try {
          const trigger = page.locator(pattern).first();
          if (await trigger.isVisible()) {
            await trigger.click();

            // Check for menu state change
            const ariaExpanded = await trigger.getAttribute('aria-expanded');
            if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
              issues.push('Invalid aria-expanded attribute value');
            }
          }
        } catch (e) {
          issues.push('Mobile navigation not functional');
        }
        break;
      }
    }

    return {
      hasNavigation: true,
      isResponsive: hasMobileNav,
      issues
    };
  } catch {
    return { hasNavigation: false, isResponsive: false, issues: ['Failed to check navigation'] };
  }
}

// Check form responsiveness and mobile optimization
export async function checkFormResponsiveness(page: Page): Promise<{ passed: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    const forms = await page.locator('form').count();
    if (forms === 0) return { passed: true, issues: [] };

    // Check input sizes
    const inputs = await page.locator('input, select, textarea').all();

    for (const input of inputs.slice(0, 10)) { // Check first 10 inputs
      const box = await input.boundingBox();
      if (box && box.height < 40) {
        const type = await input.getAttribute('type') || 'text';
        issues.push(`Input too small for mobile: ${type} input - ${Math.round(box.height)}px height`);
      }
    }

    // Check for mobile-optimized input types
    const numberInputs = await page.locator('input[type="number"], input[type="tel"]').count();
    const emailInputs = await page.locator('input[type="email"]').count();

    if (numberInputs > 0 || emailInputs > 0) {
      // Check for inputmode attributes for better mobile experience
      const numberWithInputMode = await page.locator('input[type="number"][inputmode], input[type="tel"][inputmode]').count();
      if (numberInputs > numberWithInputMode) {
        issues.push('Number inputs missing inputmode attribute for mobile keyboards');
      }
    }

    return { passed: issues.length === 0, issues };
  } catch {
    return { passed: false, issues: ['Failed to check form responsiveness'] };
  }
}

// Check image responsiveness
export async function checkImageResponsiveness(page: Page): Promise<{ passed: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    const images = await page.locator('img').all();
    const viewportWidth = await page.viewportSize()?.width || 375;

    for (const img of images.slice(0, 10)) { // Check first 10 images
      const box = await img.boundingBox();

      if (box && box.width > viewportWidth) {
        const src = await img.getAttribute('src') || 'unknown';
        const srcset = await img.getAttribute('srcset');
        const sizes = await img.getAttribute('sizes');

        if (!srcset && !sizes) {
          issues.push(`Image may not be responsive: ${src.slice(0, 50)} - ${Math.round(box.width)}px wide on ${viewportWidth}px viewport`);
        }
      }
    }

    return { passed: issues.length === 0, issues };
  } catch {
    return { passed: false, issues: ['Failed to check image responsiveness'] };
  }
}

// Check table responsiveness
export async function checkTableResponsiveness(page: Page): Promise<{ passed: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    const tables = await page.locator('table').all();
    const viewportWidth = await page.viewportSize()?.width || 375;

    for (const table of tables) {
      const box = await table.boundingBox();

      if (box && box.width > viewportWidth) {
        // Check if table has scrollable container
        const parent = table.locator('xpath=..');
        const parentStyle = await parent.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            overflowX: style.overflowX,
            width: style.width
          };
        });

        if (!['auto', 'scroll'].includes(parentStyle.overflowX)) {
          issues.push(`Table wider than viewport without horizontal scrolling: ${Math.round(box.width)}px`);
        }
      }
    }

    return { passed: issues.length === 0, issues };
  } catch {
    return { passed: false, issues: ['Failed to check table responsiveness'] };
  }
}

// Measure page load performance
export async function measurePerformance(page: Page, url: string): Promise<number> {
  try {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    return loadTime;
  } catch {
    return -1; // Indicates failure
  }
}

// Check text readability on mobile
export async function checkTextReadability(page: Page): Promise<{ passed: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Check base font size
    const bodyFontSize = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return parseInt(computedStyle.fontSize);
    });

    if (bodyFontSize < 14) {
      issues.push(`Base font size too small for mobile: ${bodyFontSize}px (minimum 14px recommended)`);
    }

    // Check line height
    const lineHeight = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      const fontSize = parseInt(computedStyle.fontSize);
      const lineHeightValue = computedStyle.lineHeight;

      if (lineHeightValue === 'normal') return 1.2; // Browser default

      const lineHeightPx = parseInt(lineHeightValue);
      return lineHeightPx / fontSize;
    });

    if (lineHeight < 1.3) {
      issues.push(`Line height too tight for mobile: ${lineHeight} (minimum 1.3 recommended)`);
    }

    // Check contrast (basic check)
    const hasLowContrastText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6'));

      for (const el of elements.slice(0, 20)) {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // Simple check for very light text on light background
        if (color.includes('rgb(200') || color.includes('rgb(240') || color.includes('#ccc') || color.includes('#eee')) {
          return true;
        }
      }

      return false;
    });

    if (hasLowContrastText) {
      issues.push('Potential low contrast text detected');
    }

    return { passed: issues.length === 0, issues };
  } catch {
    return { passed: false, issues: ['Failed to check text readability'] };
  }
}

// Run comprehensive responsiveness test suite
export async function runResponsivenessTests(page: Page, deviceConfig: DeviceConfig): Promise<ResponsiveTestResult> {
  const issues: string[] = [];
  const tests = {
    viewportMeta: false,
    horizontalScroll: false,
    touchTargets: false,
    navigation: false,
    forms: false,
    images: false,
    tables: false,
    performance: -1
  };

  try {
    // Run all tests
    tests.viewportMeta = await checkViewportMeta(page);
    tests.horizontalScroll = await checkHorizontalScroll(page);

    const touchTargetResult = await checkTouchTargets(page);
    tests.touchTargets = touchTargetResult.passed;
    issues.push(...touchTargetResult.issues);

    const navResult = await checkMobileNavigation(page);
    tests.navigation = navResult.hasNavigation && (deviceConfig.viewport.width > 768 || navResult.isResponsive);
    issues.push(...navResult.issues);

    const formResult = await checkFormResponsiveness(page);
    tests.forms = formResult.passed;
    issues.push(...formResult.issues);

    const imageResult = await checkImageResponsiveness(page);
    tests.images = imageResult.passed;
    issues.push(...imageResult.issues);

    const tableResult = await checkTableResponsiveness(page);
    tests.tables = tableResult.passed;
    issues.push(...tableResult.issues);

    tests.performance = await measurePerformance(page, page.url());

    // Calculate overall score
    const testResults = Object.values(tests).filter(v => typeof v === 'boolean') as boolean[];
    const passedTests = testResults.filter(Boolean).length;
    const baseScore = (passedTests / testResults.length) * 100;

    // Performance penalty
    let performancePenalty = 0;
    if (tests.performance > 8000) performancePenalty = 20;
    else if (tests.performance > 5000) performancePenalty = 10;

    const score = Math.max(0, Math.round(baseScore - performancePenalty));

    return {
      device: deviceConfig.name,
      viewport: deviceConfig.viewport,
      tests,
      issues,
      score
    };
  } catch (error) {
    issues.push(`Test execution error: ${error}`);

    return {
      device: deviceConfig.name,
      viewport: deviceConfig.viewport,
      tests,
      issues,
      score: 0
    };
  }
}

// Generate responsiveness report
export function generateResponsivenessReport(results: ResponsiveTestResult[]): string {
  const report = ['# Mobile Responsiveness Test Report\n'];
  report.push(`Generated: ${new Date().toISOString()}\n`);

  // Summary
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  report.push(`## Summary`);
  report.push(`- Average Score: ${Math.round(averageScore)}/100`);
  report.push(`- Devices Tested: ${results.length}`);
  report.push(`- Total Issues Found: ${results.reduce((sum, r) => sum + r.issues.length, 0)}\n`);

  // Device results
  report.push(`## Device Results\n`);

  for (const result of results) {
    report.push(`### ${result.device} (${result.viewport.width}x${result.viewport.height})`);
    report.push(`**Score: ${result.score}/100**\n`);

    report.push(`#### Test Results:`);
    report.push(`- Viewport Meta: ${result.tests.viewportMeta ? '✅' : '❌'}`);
    report.push(`- No Horizontal Scroll: ${result.tests.horizontalScroll ? '✅' : '❌'}`);
    report.push(`- Touch Targets: ${result.tests.touchTargets ? '✅' : '❌'}`);
    report.push(`- Navigation: ${result.tests.navigation ? '✅' : '❌'}`);
    report.push(`- Forms: ${result.tests.forms ? '✅' : '❌'}`);
    report.push(`- Images: ${result.tests.images ? '✅' : '❌'}`);
    report.push(`- Tables: ${result.tests.tables ? '✅' : '❌'}`);
    report.push(`- Performance: ${result.tests.performance > 0 ? `${result.tests.performance}ms` : 'Failed'}\n`);

    if (result.issues.length > 0) {
      report.push(`#### Issues:`);
      result.issues.forEach(issue => report.push(`- ${issue}`));
      report.push('');
    }
  }

  // Recommendations
  report.push(`## Recommendations\n`);

  const commonIssues = new Map<string, number>();
  results.forEach(result => {
    result.issues.forEach(issue => {
      const key = issue.split(':')[0]; // Group by issue type
      commonIssues.set(key, (commonIssues.get(key) || 0) + 1);
    });
  });

  if (commonIssues.size > 0) {
    Array.from(commonIssues.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([issue, count]) => {
        report.push(`- ${issue} (affects ${count}/${results.length} devices)`);
      });
  } else {
    report.push('- All devices passed responsiveness tests! 🎉');
  }

  return report.join('\n');
}