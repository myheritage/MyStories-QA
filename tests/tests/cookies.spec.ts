import { test, expect, Cookie } from '@playwright/test';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { CookieConsentOption } from '../pages/BasePage';
import { getAllowAllCookies, getDenyCookies, cookieMatchesConfig, CookieConfig } from '../data/cookies.config';
import { URLS } from '../data/test.config';

function formatCookieComparison(expectedCookies: CookieConfig[], actualCookies: Cookie[]) {
  console.log('\nCookie Comparison:');
  
  // Create a map of actual cookies for easier lookup
  const actualCookieMap = new Map(actualCookies.map(c => [
    `${c.name}:${c.domain}`,
    c
  ]));

  // Group expected cookies by category
  const groupedExpected = {
    Mandatory: expectedCookies.filter(c => c.category === 'mandatory'),
    Analytics: expectedCookies.filter(c => c.category === 'analytics'),
    Advertising: expectedCookies.filter(c => c.category === 'advertising')
  };

  // Print each category
  for (const [category, cookies] of Object.entries(groupedExpected)) {
    if (cookies.length === 0) continue;

    console.log(`\n${category} Cookies:`);
    const table = cookies.map(expected => {
      const key = `${expected.name}:${expected.domain}`;
      const actual = actualCookieMap.get(key);
      return {
        'Cookie Name': expected.name,
        'Domain': expected.domain,
        'Status': actual ? '✅ Found' : '❌ Missing'
      };
    });
    console.table(table);
  }

  // Check for unexpected cookies
  const unexpectedCookies = actualCookies.filter(actual => 
    !expectedCookies.some(expected => 
      cookieMatchesConfig({ name: actual.name, domain: actual.domain }, expected)
    )
  );

  if (unexpectedCookies.length > 0) {
    console.log('\nUnexpected Cookies:');
    console.table(unexpectedCookies.map(c => ({
      'Cookie Name': c.name,
      'Domain': c.domain,
      'Status': '⚠️ Unexpected'
    })));
  }
}

test.describe('Cookie Consent', () => {
  test('should only set mandatory cookies when denying consent', async ({ page, context }) => {
    // Go to homepage
    await page.goto(URLS.HOME);
    await page.waitForLoadState('domcontentloaded');

    // Handle cookie consent
    const cookieHandler = new CookieConsentHandler(page);
    await cookieHandler.handle(CookieConsentOption.DENY);

    // Verify banner is no longer visible
    const isVisible = await cookieHandler.isVisible();
    expect(isVisible).toBeFalsy();

    // Wait a bit for cookies to be set
    await page.waitForTimeout(1000);

    // Get all cookies and expected cookies
    const cookies = await context.cookies();
    const expectedCookies = getDenyCookies();

    await test.step('Verify cookies after denying consent', async () => {
      // Format and display cookie comparison
      formatCookieComparison(expectedCookies, cookies);

      // Verify only mandatory cookies are present
      for (const cookie of cookies) {
        // At least one cookie config should match this cookie
        const hasMatch = expectedCookies.some(config => cookieMatchesConfig(cookie, config));
        expect(hasMatch, `Unexpected cookie found: ${cookie.name} (${cookie.domain})`).toBeTruthy();
      }

      // Verify all mandatory cookies are present
      for (const expectedCookie of expectedCookies) {
        const found = cookies.some(cookie => cookieMatchesConfig(cookie, expectedCookie));
        expect(found, `Missing mandatory cookie: ${expectedCookie.name} (${expectedCookie.domain})`).toBeTruthy();
      }
    });
  });

  test('should set all cookies when allowing all consent', async ({ page, context }) => {
    // Go to homepage
    await page.goto(URLS.HOME);
    await page.waitForLoadState('domcontentloaded');

    // Handle cookie consent
    const cookieHandler = new CookieConsentHandler(page);
    await cookieHandler.handle(CookieConsentOption.ALLOW_ALL);

    // Verify banner is no longer visible
    const isVisible = await cookieHandler.isVisible();
    expect(isVisible).toBeFalsy();

    // Wait a bit for cookies to be set
    await page.waitForTimeout(1000);

    // Get all cookies and expected cookies
    const cookies = await context.cookies();
    const expectedCookies = getAllowAllCookies();

    await test.step('Verify cookies after allowing all consent', async () => {
      // Format and display cookie comparison
      formatCookieComparison(expectedCookies, cookies);

      // Verify all expected cookies are present
      for (const expectedCookie of expectedCookies) {
        const found = cookies.some(cookie => cookieMatchesConfig(cookie, expectedCookie));
        expect(found, `Missing cookie: ${expectedCookie.name} (${expectedCookie.domain})`).toBeTruthy();
      }

      // Verify no unexpected cookies
      for (const cookie of cookies) {
        const hasMatch = expectedCookies.some(config => cookieMatchesConfig(cookie, config));
        expect(hasMatch, `Unexpected cookie found: ${cookie.name} (${cookie.domain})`).toBeTruthy();
      }
    });
  });
});
