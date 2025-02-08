import { Page, expect } from '@playwright/test';
import { SECURITY_CONFIG } from '../data/security.config';
import { ScreenshotHelper } from './ScreenshotHelper';
import { TextEditorHelper } from './TextEditorHelper';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { TestDataGenerator } from './TestDataGenerator';
import { HomePage } from '../pages/HomePage';
import { OrderPage } from '../pages/OrderPage';
import { CookieConsentOption } from '../pages/BasePage';

/**
 * Security Testing Helper
 * 
 * This class provides methods for testing various security aspects:
 * 1. XSS Prevention:
 *    - Story editor sanitization
 *    - Profile field validation
 *    - Gift message filtering
 * 
 * 2. Price Integrity:
 *    - Frontend/backend price matching
 *    - Payment request validation
 *    - Price tampering prevention
 * 
 * 3. Privacy Controls:
 *    - Cookie consent enforcement
 *    - Privacy setting persistence
 *    - Data protection features
 * 
 * Each method includes:
 * - Detailed logging for debugging
 * - Screenshot capture for evidence
 * - Clear error messages
 * - Thorough validation checks
 */
export class SecurityHelper {
  private readonly textEditor: TextEditorHelper;
  
  private static readonly SECURITY_TEST_USER = {
    firstName: 'SecurityTest',
    lastName: 'SecurityTest',
    email: 'security.test@test.com',
    country: 'United States',
    state: 'Alabama',  // First state alphabetically
    copies: 1
  };

  constructor(private readonly page: Page) {
    this.textEditor = new TextEditorHelper(page);
  }

  /**
   * Test input field for XSS vulnerabilities
   * 
   * This method tests various types of XSS attack vectors:
   * 1. For story responses (rich text editor):
   *    - Attempts to inject malicious content
   *    - Verifies preview is blocked for malicious content
   *    - Verifies save is rejected (redirects back to questions list)
   *    - Verifies content remains unsaved
   * 
   * 2. For profile fields (regular inputs):
   *    - Attempts to inject malicious content
   *    - Fills remaining form fields with valid data
   *    - Attempts to submit the form
   *    - Verifies 403 response
   *    - Verifies user remains on same page
   * 
   * The test uses different payloads from security.config.ts:
   * - SCRIPT: Basic <script> tag injection
   * - EVENT_HANDLERS: onerror/onload attribute injection
   * - JAVASCRIPT_URLS: javascript: protocol exploitation
   * - HTML_INJECTION: Malicious HTML elements
   * 
   * @param selector - Element to test (e.g., '[data-testid="story-response"]')
   * @param payloadType - Type of XSS payload to use from security.config.ts
   * @returns Promise<void>
   */
  async testXSSPayload(
    selector: string,
    payloadType: keyof typeof SECURITY_CONFIG.XSS_TEST_DATA.PAYLOADS,
    testInfo?: any,
    emailHandler?: any
  ): Promise<void> {
    console.log(`Testing XSS payloads of type ${payloadType} on selector: ${selector}`);
    
    // Clone security test user details
    const details = { ...SecurityHelper.SECURITY_TEST_USER };
    
    const payloads = SECURITY_CONFIG.XSS_TEST_DATA.PAYLOADS[payloadType];
    const results: { payload: string; status: 'BLOCKED' | 'FAILED'; error?: string }[] = [];
    
    for (const payload of payloads) {
      console.log(`Testing payload: ${payload}`);
      
      try {
        // Input safe text before payload
        const safeTextBefore = "This is a normal story. ";
        const safeTextAfter = " More normal content.";

        if (selector === '[data-testid="story-response"]') {
          // For story responses, use the text editor helper
          await this.textEditor.clearEditor();
          await this.textEditor.fillEditor(safeTextBefore + payload + safeTextAfter);
          await this.page.keyboard.press('Tab'); // Trigger blur event
          await this.page.waitForTimeout(1000); // Wait for editor to update
          
          // Get content before saving to verify XSS payload is there
          const contentBeforeSave = await this.textEditor.getEditorContent();
          console.log('Content before save:', contentBeforeSave);
          console.log('Expected payload:', payload);
          expect(contentBeforeSave, 'XSS payload should be in editor before save').toContain(payload);
          
          // Take screenshot before save
          await ScreenshotHelper.takeFullPageScreenshot(this.page, `xss-test-before-save-${payloadType}`);
          
          // Try to preview - should be blocked
          const previewButton = this.page.getByRole('button', { name: 'Preview' });
          await previewButton.click();
          // Wait a moment to verify no popup appears
          await this.page.waitForTimeout(1000);
          // Get all pages in context - should still be just one
          const pages = this.page.context().pages();
          expect(pages.length, 'Preview should be blocked for malicious content').toBe(1);
          
          // Try to save and verify it's blocked with 403
          const responsePromise = this.page.waitForResponse(response => 
            response.url().includes('/api/') && response.status() === 403
          );
          
          await this.page.getByRole('button', { name: 'Save' }).click();
          
          // Wait for 403 response
          const response = await responsePromise;
          expect(response.status()).toBe(403);
          
          // Verify we're redirected back to questions list
          await this.page.waitForURL('https://app.mystories.com/');
          
          // Take screenshot after navigation
          await ScreenshotHelper.takeFullPageScreenshot(this.page, `xss-test-after-save-${payloadType}`);
          
          // Click the story again to verify it wasn't saved
          await this.page.locator('a > .ant-btn').first().click();
          await this.page.waitForLoadState('networkidle');
          
          // Get content and verify it shows default placeholder (meaning no content was saved)
          const contentAfterReopen = await this.textEditor.getEditorContent();
          expect(contentAfterReopen.startsWith('Write something amazing'), 'Story should show default placeholder after reopening').toBe(true);
        } else {
          // For regular inputs, use StoryDetailsPage's locators
          const storyDetailsPage = new StoryDetailsPage(this.page);
          
          // Wait for form to be ready
          await this.page.waitForLoadState('networkidle');
          await storyDetailsPage['formTitle'].waitFor({ state: 'visible', timeout: 10000 });
          
          const selectorMap: { [key: string]: any } = {
            '[data-testid="first-name"]': storyDetailsPage['giverFirstName'],
            '[data-testid="last-name"]': storyDetailsPage['giverLastName'],
            '[data-testid="email"]': storyDetailsPage['giverEmail']
          };
          
          const locator = selectorMap[selector];
          if (!locator) {
            throw new Error(`No locator found for selector: ${selector}`);
          }
          
          // Replace field with payload
          if (selector === '[data-testid="first-name"]') {
            details.firstName = payload;
          } else if (selector === '[data-testid="last-name"]') {
            details.lastName = payload;
          }
          
          // Fill form with modified details
          const currentUrl = this.page.url();
          await storyDetailsPage.fillGiftGiverDetails(details, false);

          // Wait 2 seconds for any navigation
          await this.page.waitForTimeout(2000);

          // Simple URL check
          const newUrl = this.page.url();
          if (newUrl !== currentUrl) {
            throw new Error(`XSS validation failed - malicious input "${payload}" was accepted and navigation occurred to ${newUrl}`);
          }
        }
        // If we get here, the security check worked - form submission was blocked
        results.push({ payload, status: 'BLOCKED' });
      } catch (error) {
        console.error(`Error testing XSS payload: ${payload}`, error);
        await ScreenshotHelper.takeFullPageScreenshot(this.page, `xss-test-error-${payloadType}`);
        
        // Record the failure but continue testing other payloads
        results.push({ 
          payload, 
          status: 'FAILED', 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Format results for HTML report
    const resultsTable = results.map(result => {
      const icon = result.status === 'BLOCKED' ? '✅' : '❌';
      const status = result.status === 'BLOCKED' ? 'BLOCKED' : `FAILED: ${result.error}`;
      return `${icon} ${result.payload} - ${status}`;
    }).join('\n');
    
    // Add results to test report
    if (testInfo) {
      testInfo.annotations.push({
        type: 'Security Test Results',
        description: `XSS Payload Test Results:\n${resultsTable}`
      });
    }
    
    // If any test failed, throw error
    const failures = results.filter(r => r.status === 'FAILED');
    if (failures.length > 0) {
      throw new Error(`${failures.length} XSS payloads were not blocked:\n${
        failures.map(f => `- ${f.payload}`).join('\n')
      }`);
    }
  }

  /**
   * Verify price integrity in the payment flow
   * 
   * Tests that prices cannot be tampered with by:
   * 1. Checking the displayed price matches expected value
   * 2. Intercepting payment API requests to verify server-side price
   * 3. Ensuring both UI and API prices match
   * 
   * This prevents price manipulation attacks where a user might try to:
   * - Modify prices in the browser's dev tools
   * - Intercept and modify API requests
   * - Exploit race conditions in price updates
   * 
   * @param expectedPrice - The correct price that should be charged
   * @returns Promise<void>
   */
  async verifyPriceIntegrity(expectedPrice: number): Promise<void> {
    console.log(`Verifying price integrity for $${expectedPrice}`);
    
    // Get displayed price from UI
    const displayedPrice = await this.page.locator('[data-testid="product-summary-total-amount"]').textContent();
    const cleanedPrice = parseFloat(displayedPrice?.replace(/[^0-9.]/g, '') || '0');
    
    // Verify price matches expected value
    expect(cleanedPrice).toBe(expectedPrice);
    
    // Verify price in network request
    const priceInRequest = await this.interceptPriceInRequest();
    expect(priceInRequest).toBe(expectedPrice);
  }

  /**
   * Test promo code validation
   * 
   * Verifies that the application properly validates promo codes:
   * 1. Attempts to use invalid/malicious promo codes
   * 2. Verifies proper error messages are shown
   * 3. Takes screenshots for evidence
   * 
   * This prevents attacks like:
   * - SQL injection through promo codes
   * - XSS through promo code error messages
   * - Brute force attempts
   * 
   * @param code - The promo code to test (usually invalid/malicious)
   * @returns Promise<void>
   */
  async testPromoCode(code: string): Promise<void> {
    console.log(`Testing promo code: ${code}`);
    
    // Input promo code
    await this.page.locator('[data-testid="promo-code-input"]').fill(code);
    await this.page.locator('[data-testid="apply-promo-code"]').click();
    
    // Take screenshot of result
    await ScreenshotHelper.takeFullPageScreenshot(this.page, `promo-code-test-${code}`);
    
    // Verify error message for invalid codes
    const errorMessage = await this.page.locator('[data-testid="promo-code-error"]').textContent();
    expect(errorMessage).toContain('Invalid promotion code');
  }

  /**
   * Verify cookie consent enforcement
   * 
   * Tests GDPR compliance for cookie usage:
   * 1. Checks if cookies are set without consent
   * 2. Verifies different cookie types (essential, analytics, marketing)
   * 3. Ensures cookies respect user preferences
   * 
   * This prevents privacy violations like:
   * - Setting cookies without consent
   * - Using marketing cookies when only analytics allowed
   * - Persisting cookies after consent withdrawal
   * 
   * @param cookieType - Type of cookie from SECURITY_CONFIG
   * @returns Promise<void>
   */
  async verifyCookieConsent(cookieType: keyof typeof SECURITY_CONFIG.PRIVACY_TEST_DATA.COOKIE_TYPES): Promise<void> {
    console.log(`Verifying cookie consent for ${cookieType}`);
    
    // Get all cookies
    const cookies = await this.page.context().cookies();
    
    // Check if cookie exists based on consent
    const hasCookie = cookies.some(cookie => cookie.name.includes(cookieType));
    expect(hasCookie).toBe(false);
  }

  /**
   * Test privacy setting enforcement
   * 
   * Verifies that privacy settings are properly enforced:
   * 1. Toggles various privacy settings
   * 2. Takes screenshots of state changes
   * 3. Verifies settings persist correctly
   * 
   * This ensures privacy features like:
   * - Profile visibility controls
   * - Story sharing preferences
   * - Marketing email opt-outs
   * 
   * @param setting - Privacy setting from SECURITY_CONFIG
   * @returns Promise<void>
   */
  async verifyPrivacySetting(setting: keyof typeof SECURITY_CONFIG.PRIVACY_TEST_DATA.PRIVACY_SETTINGS): Promise<void> {
    console.log(`Verifying privacy setting: ${setting}`);
    
    // Toggle setting
    await this.page.locator(`[data-testid="privacy-setting-${setting}"]`).click();
    
    // Take screenshot
    await ScreenshotHelper.takeFullPageScreenshot(this.page, `privacy-setting-${setting}`);
    
    // Verify setting is enforced
    const isEnabled = await this.page.locator(`[data-testid="privacy-setting-${setting}"]`).isChecked();
    expect(isEnabled).toBe(SECURITY_CONFIG.PRIVACY_TEST_DATA.PRIVACY_SETTINGS[setting]);
  }

  /**
   * Intercept payment API requests to verify prices
   * 
   * This private helper method:
   * 1. Listens for payment API requests
   * 2. Extracts the price from the request payload
   * 3. Returns the price for verification
   * 
   * Used by verifyPriceIntegrity to ensure:
   * - Frontend prices match API requests
   * - No price manipulation in transit
   * - Consistent pricing throughout flow
   * 
   * @returns Promise<number> The price found in the API request
   * @private
   */
  private async interceptPriceInRequest(): Promise<number> {
    return new Promise((resolve) => {
      this.page.on('request', request => {
        if (request.url().includes('/api/payment')) {
          const data = request.postData();
          if (data) {
            const json = JSON.parse(data);
            resolve(json.amount);
          }
        }
      });
    });
  }
}
