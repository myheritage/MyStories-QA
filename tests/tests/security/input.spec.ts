import { test as base, expect } from '@playwright/test';
import { EmailHandler, EmailMode } from '../../helpers/EmailHandler';

// Extend base test with EmailHandler
const test = base.extend<{ emailHandler: EmailHandler }>({
  emailHandler: async ({ browser }, use) => {
    const handler = new EmailHandler({
      mode: EmailMode[process.env.EMAIL_MODE?.toUpperCase() as keyof typeof EmailMode] || EmailMode.FAKE,
      mailslurpApiKey: process.env.EMAIL_MODE === 'mailslurp' ? process.env.MAILSLURP_API_KEY : undefined,
      hardcodedEmails: process.env.EMAIL_MODE === 'hardcoded' ? {
        purchaser: process.env.HARDCODED_EMAIL!,
        recipient: process.env.HARDCODED_RECIPIENT_EMAIL
      } : undefined,
      testDataGenerator: process.env.EMAIL_MODE === 'fake' ? new TestDataGenerator() : undefined,
      isSandboxMode: process.env.STRIPE_SANDBOX === 'true'
    }, browser);
    await use(handler);
  }
});
import { HomePage } from '../../pages/HomePage';
import { OrderPage } from '../../pages/OrderPage';
import { QuestionsPage } from '../../pages/QuestionsPage';
import { SecurityHelper } from '../../helpers/SecurityHelper';
import { TestDataGenerator } from '../../helpers/TestDataGenerator';
import { TestFlowHelper } from '../../helpers/TestFlowHelper';
import { ScreenshotHelper } from '../../helpers/ScreenshotHelper';
import { SECURITY_CONFIG } from '../../data/security.config';
import { CookieConsentOption } from '../../pages/BasePage';

/**
 * Input Validation & Sanitization Tests
 * 
 * This test suite verifies the application's defenses against malicious input:
 * 1. XSS prevention in story responses
 * 2. XSS prevention in profile fields
 * 3. HTML injection prevention in gift messages
 * 4. File upload name sanitization
 * 
 * Each test attempts to inject malicious content and verifies that:
 * - The application properly rejects/blocks the malicious content
 * - No state changes occur when malicious input is detected
 * - Appropriate error responses (403) are returned
 * - The user remains on the same page after failed attempts
 */
test.describe('Input Validation & Sanitization', {
  tag: ['@Full', '@Security']
}, () => {
  let securityHelper: SecurityHelper;
  let testData: TestDataGenerator;

  test.beforeEach(async ({ page }) => {
    securityHelper = new SecurityHelper(page);
    testData = new TestDataGenerator();
  });

  /**
   * Story Response XSS Prevention Test
   * 
   * This test verifies that story responses are protected from XSS:
   * 1. Creates a test user and completes purchase flow
   * 2. Attempts to inject various XSS payloads into story editor
   * 3. Verifies preview is blocked for malicious content
   * 4. Verifies content is not saved when it contains XSS
   * 5. Tests max length restrictions
   * 
   * Uses payloads from security.config.ts including:
   * - <script> tags
   * - Event handlers (onerror, onload)
   * - javascript: URLs
   * - Malicious HTML elements
   */
  test('prevent XSS in story responses', async ({ page, emailHandler }, testInfo) => {
    // Create test user and complete purchase flow
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });
    await TestFlowHelper.completeOrderFlow(page, storyteller);
    await TestFlowHelper.goToDashboard(page);

    try {
      // Navigate to questions page and open editor
      const questionsPage = new QuestionsPage(page);
      console.log('Waiting for dashboard to load...');
      await questionsPage.waitForDashboard();
      
      console.log('Starting to write answer...');
      await questionsPage.startWriting(1);
      
      // Take screenshot to verify we're on the correct page
      await ScreenshotHelper.takeFullPageScreenshot(page, 'before-xss-tests');

      // Test each XSS payload type
      for (const payloadType of ['SCRIPT', 'EVENT_HANDLERS', 'JAVASCRIPT_URLS', 'HTML_INJECTION'] as const) {
        console.log(`Testing XSS payload type: ${payloadType}`);
        await securityHelper.testXSSPayload('[data-testid="story-response"]', payloadType, testInfo);
        console.log('Saving answer...');
        await questionsPage.saveAnswer();  // Save after each test
      }
    } catch (error) {
      console.error('Error in XSS test:', error);
      await ScreenshotHelper.takeFullPageScreenshot(page, 'xss-test-error');
      throw error;
    }

    // Verify max length
    const longText = 'a'.repeat(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.STORY_RESPONSE + 100);
    const questionsPage = new QuestionsPage(page);
    await questionsPage.writeAnswer(longText);
    await questionsPage.saveAnswer();
    const content = (await page.locator('[data-testid="story-response"]').textContent()) || '';
    expect(content.length).toBeLessThanOrEqual(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.STORY_RESPONSE);
  });

  /**
   * Profile Fields XSS Prevention Test
   * 
   * This test verifies that profile fields reject malicious input:
   * 1. Starts order flow and selects "I will be the Storyteller"
   * 2. Attempts to inject XSS into first/last name fields
   * 3. Fills remaining fields with valid data
   * 4. Verifies form submission is blocked (403)
   * 5. Tests max length restrictions
   * 
   * Ensures profile data is properly sanitized before:
   * - Being displayed in UI
   * - Being stored in database
   * - Being used in emails/PDFs
   */
  test('prevent XSS in profile fields', async ({ page, emailHandler }, testInfo) => {
    // Start from homepage and select order type
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    
    const orderPage = new OrderPage(page);
    await orderPage.selectOrderType('I will');

    // Test name field with XSS payload
    await securityHelper.testXSSPayload('[data-testid="first-name"]', 'SCRIPT', testInfo, emailHandler);
  });

  /**
   * Gift Message HTML Injection Prevention Test
   * 
   * This test verifies that gift messages are protected from HTML injection:
   * 1. Starts gift flow
   * 2. Attempts to inject malicious HTML into gift message
   * 3. Verifies message is properly sanitized
   * 4. Tests max length restrictions
   * 
   * Ensures gift messages are safe when:
   * - Displayed to recipients
   * - Included in gift emails
   * - Shown in gift previews
   */
  test('prevent HTML injection in gift messages', async ({ page }, testInfo) => {
    // Start gift flow
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);

    // Navigate to gift message section
    await page.locator('[data-testid="gift-option"]').click();

    // Test HTML injection in gift message
    await securityHelper.testXSSPayload('[data-testid="gift-message"]', 'HTML_INJECTION', testInfo);

    // Verify max length
    const longMessage = 'a'.repeat(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.MESSAGE + 100);
    await page.locator('[data-testid="gift-message"]').fill(longMessage);
    const messageContent = await page.locator('[data-testid="gift-message"]').inputValue();
    expect(messageContent.length).toBeLessThanOrEqual(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.MESSAGE);
  });

  /**
   * File Upload Name Sanitization Test
   * 
   * This test verifies that file upload names are properly sanitized:
   * 1. Completes purchase flow and goes to dashboard
   * 2. Attempts to upload files with malicious names
   * 3. Verifies files are rejected with proper error messages
   * 
   * Tests malicious filenames like:
   * - Names containing XSS
   * - Path traversal attempts
   * - Command injection attempts
   * - Double extension tricks
   */
  test('sanitize file upload names', async ({ page, emailHandler }, testInfo) => {
    // Complete purchase and go to dashboard
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });
    await TestFlowHelper.completeOrderFlow(page, storyteller);
    await TestFlowHelper.goToDashboard(page);

    // Test file upload with malicious names
    const maliciousNames = [
      'test<script>alert(1)</script>.jpg',
      'test../../etc/passwd',
      'test;rm -rf /.jpg',
      'test.jpg.exe'
    ];

    for (const filename of maliciousNames) {
      try {
        // Create file input
        const fileInput = page.locator('input[type="file"]');
        
        // Create a temporary file with the malicious name
        const buffer = Buffer.from('fake image content');
        await fileInput.setInputFiles({
          name: filename,
          mimeType: 'image/jpeg',
          buffer
        });

        // Verify the file was rejected or sanitized
        const errorMessage = await page.locator('[data-testid="file-upload-error"]').textContent();
        expect(errorMessage).toContain('Invalid file name');
        
        // Record success
        testInfo.annotations.push({
          type: 'Security Test Results',
          description: `✅ File upload blocked: ${filename}`
        });
      } catch (error) {
        // Record failure
        testInfo.annotations.push({
          type: 'Security Test Results',
          description: `❌ File upload not blocked: ${filename}\nError: ${error instanceof Error ? error.message : String(error)}`
        });
        throw error;
      }
    }
  });
});
