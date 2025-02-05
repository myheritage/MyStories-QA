import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { URLS, PAGE_TITLES } from '../data/test.config';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { CookieConsentOption } from '../pages/BasePage';
import { LinkCheckerHelper, LinkCheckResult } from '../helpers/LinkCheckerHelper';
import path from 'path';

test.describe('Homepage Basic Validations', {
  tag: ['@Full', '@Sanity']
}, () => {
  test('should have correct window title', {
    tag: ['@CD']
  }, async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(page).toHaveTitle(PAGE_TITLES.HOME);
  });

  test('should have favicon', {
    tag: ['@CD']
  }, async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    // Find favicon link element
    const favicon = page.locator('link[rel="icon"]');
    
    // Verify favicon link exists and has required attributes
    await expect(favicon).toHaveAttribute('rel', 'icon');
    await expect(favicon).toHaveAttribute('href');
    
    // Get favicon URL and verify it loads successfully
    const faviconHref = await favicon.getAttribute('href');
    console.log('Verifying favicon URL:', faviconHref);
    const response = await page.goto(faviconHref!);
    expect(response?.status(), 'Favicon should load successfully').toBe(200);
  });

  test('should not have console errors', {
    tag: ['@CD']
  }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    const homePage = new HomePage(page);
    await homePage.goto();
    expect(errors.length).toBe(0);
  });

  test('should have proper HTTP status and headers', {
    tag: ['@CD']
  }, async ({ page }) => {
    const response = await page.goto(URLS.HOME);
    expect(response?.status()).toBe(200);
    const headers = response?.headers();
    expect(headers?.['content-type']).toContain('text/html');
  });

  test('should not have broken links', async ({ page }, testInfo) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    
    const linkChecker = new LinkCheckerHelper(page, testInfo);
    const results = await linkChecker.scanAndCheckLinks({
      mode: 'status', // Link check modes:
                      // - 'status' (default): Fast check using HEAD requests only, no page loading
                      //   * Verifies HTTP status codes
                      //
                      // - 'visual': Full page load with screenshots
                      //   * Opens each link in a new page
                      //   * Captures full-page screenshots
      // Use absolute path for screenshot directory
      screenshotDir: path.resolve(process.cwd(), 'test-results/link-screenshots'), // Required for visual mode
      skipPatterns: ['mailto:', '#', 'tel:', 'javascript:', 'http://parastorage.com/']
    });
    
    const failedLinks = results.filter((r: LinkCheckResult) => !r.passed);
    expect(failedLinks, `Failed links:\n${JSON.stringify(failedLinks, null, 2)}`).toHaveLength(0);
  });

  test('cookie consent banner functionality', {
    tag: ['@CD']
  }, async ({ page }) => {
    console.log('Starting cookie consent banner test...');
    const homePage = new HomePage(page);
    await homePage.goto();
    
    console.log('Verifying initial banner visibility...');
    const cookieHandler = new CookieConsentHandler(page);
    await expect(
      cookieHandler.isVisible(),
      'Cookie banner should be visible on first visit'
    ).resolves.toBe(true);
    
    console.log('Testing Allow All flow...');
    await cookieHandler.handle(CookieConsentOption.ALLOW_ALL);
    await cookieHandler.waitForHidden();
    await expect(
      cookieHandler.isVisible(),
      'Cookie banner should be hidden after Allow All'
    ).resolves.toBe(false);
    
    console.log('Verifying banner stays hidden after reload...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(
      cookieHandler.isVisible(),
      'Cookie banner should stay hidden after page reload'
    ).resolves.toBe(false);
    
    console.log('Clearing cookies and verifying banner reappears...');
    await page.context().clearCookies();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Allow time for banner initialization
    
    const bannerVisible = await cookieHandler.waitForVisible({
      timeout: 5000,
      interval: 500
    });
    await expect(
      Promise.resolve(bannerVisible),
      'Cookie banner should reappear after clearing cookies and page reload'
    ).resolves.toBe(true);
    
    console.log('Testing Deny flow...');
    await cookieHandler.handle(CookieConsentOption.DENY);
    await cookieHandler.waitForHidden();
    await expect(
      cookieHandler.isVisible(),
      'Cookie banner should be hidden after Deny'
    ).resolves.toBe(false);
  });
});
