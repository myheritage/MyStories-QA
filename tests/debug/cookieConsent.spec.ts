import { test, expect } from '@playwright/test';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { CookieConsentOption } from '../pages/BasePage';

test.describe('Cookie Consent Debug', () => {
  test('should handle Allow all cookie consent', async ({ page }) => {
    // Go to homepage
    await page.goto('https://www.mystories.com/');
    await page.waitForLoadState('domcontentloaded');

    // Create cookie consent handler
    const cookieHandler = new CookieConsentHandler(page);

    // Handle cookie consent
    await cookieHandler.handle(CookieConsentOption.ALLOW_ALL);

    // Verify banner is no longer visible
    const isVisible = await cookieHandler.isVisible();
    expect(isVisible).toBeFalsy();
  });

  test('should handle Deny cookie consent', async ({ page }) => {
    // Go to homepage
    await page.goto('https://www.mystories.com/');
    await page.waitForLoadState('domcontentloaded');

    // Create cookie consent handler
    const cookieHandler = new CookieConsentHandler(page);

    // Handle cookie consent
    await cookieHandler.handle(CookieConsentOption.DENY);

    // Verify banner is no longer visible
    const isVisible = await cookieHandler.isVisible();
    expect(isVisible).toBeFalsy();
  });
});
