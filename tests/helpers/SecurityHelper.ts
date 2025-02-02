import { Page, expect } from '@playwright/test';
import { SECURITY_CONFIG } from '../data/security.config';
import { ScreenshotHelper } from './ScreenshotHelper';

export class SecurityHelper {
  constructor(private readonly page: Page) {}

  /**
   * Test input field for XSS vulnerabilities
   * @param selector Element selector to test
   * @param payloadType Type of XSS payload to test
   * @returns Promise<void>
   */
  async testXSSPayload(
    selector: string,
    payloadType: keyof typeof SECURITY_CONFIG.XSS_TEST_DATA.PAYLOADS
  ): Promise<void> {
    console.log(`Testing XSS payloads of type ${payloadType} on selector: ${selector}`);
    
    const payloads = SECURITY_CONFIG.XSS_TEST_DATA.PAYLOADS[payloadType];
    for (const payload of payloads) {
      console.log(`Testing payload: ${payload}`);
      
      // Input the payload
      if (selector === '[data-testid="story-response"]') {
        // For story responses, use the rich text editor
        await this.page.locator(selector).click();
        await this.page.keyboard.type(payload);
        await this.page.keyboard.press('Tab'); // Trigger blur event
      } else {
        // For regular inputs, use fill
        await this.page.locator(selector).fill(payload);
        await this.page.keyboard.press('Tab'); // Trigger blur event
      }
      
      // Take screenshot for evidence
      await ScreenshotHelper.takeFullPageScreenshot(this.page, `xss-test-${payloadType}`);
      
      // Verify the payload is properly sanitized
      const content = selector === '[data-testid="story-response"]' ?
        (await this.page.locator(selector).textContent()) || '' :
        await this.page.locator(selector).inputValue();
      expect(content, `XSS payload "${payload}" was not properly sanitized`).not.toContain('<script>');
      expect(content).not.toContain('javascript:');
      expect(content).not.toContain('onerror=');
      expect(content).not.toContain('onload=');
    }
  }

  /**
   * Verify price integrity in the payment flow
   * @param expectedPrice Expected price to verify
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
   * @param code Promo code to test
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
   * @param cookieType Type of cookie to verify
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
   * @param setting Privacy setting to test
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
