import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { URLS, PAGE_TITLES } from '../data/test.config';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { CookieConsentOption } from '../pages/BasePage';
import { LinkCheckerHelper, LinkCheckResult } from '../helpers/LinkCheckerHelper';
import path from 'path';

test.describe('Homepage Basic Validations', () => {
  test('should have correct window title', {
    tag: ['@CD']
  }, async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(page).toHaveTitle(PAGE_TITLES.HOME);
  });

  test('should have favicon', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toBeVisible();
    
    // Verify favicon loads successfully
    const faviconHref = await favicon.getAttribute('href');
    const response = await page.goto(faviconHref!);
    expect(response?.status()).toBe(200);
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    const homePage = new HomePage(page);
    await homePage.goto();
    expect(errors.length).toBe(0);
  });

  test('should have proper HTTP status and headers', async ({ page }) => {
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

  test('cookie consent banner functionality', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    
    // Verify banner appears
    const cookieHandler = new CookieConsentHandler(page);
    expect(await cookieHandler.isVisible()).toBe(true);
    
    // Test "Allow All" flow
    await cookieHandler.handle(CookieConsentOption.ALLOW_ALL);
    await cookieHandler.waitForHidden();
    expect(await cookieHandler.isVisible()).toBe(false);
    
    // Reload page and verify banner doesn't reappear
    await page.reload();
    expect(await cookieHandler.isVisible()).toBe(false);
    
    // Clear cookies and verify banner reappears
    await page.context().clearCookies();
    await page.reload();
    expect(await cookieHandler.isVisible()).toBe(true);
    
    // Test "Deny" flow
    await cookieHandler.handle(CookieConsentOption.DENY);
    await cookieHandler.waitForHidden();
    expect(await cookieHandler.isVisible()).toBe(false);
  });
});
