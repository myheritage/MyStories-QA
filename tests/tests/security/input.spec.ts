import { test as base, expect } from '@playwright/test';
import { EmailHandler, EmailMode } from '../../helpers/EmailHandler';

// Extend base test with EmailHandler
const test = base.extend<{ emailHandler: EmailHandler }>({
  emailHandler: async ({ browser }, use) => {
    const handler = new EmailHandler({
      mode: EmailMode[process.env.EMAIL_MODE?.toUpperCase() as keyof typeof EmailMode] || EmailMode.FAKE,
      mailslurpApiKey: process.env.MAILSLURP_API_KEY,
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
import { QuestionsPage } from '../../pages/QuestionsPage';
import { SecurityHelper } from '../../helpers/SecurityHelper';
import { TestDataGenerator } from '../../helpers/TestDataGenerator';
import { TestFlowHelper } from '../../helpers/TestFlowHelper';
import { SECURITY_CONFIG } from '../../data/security.config';
import { CookieConsentOption } from '../../pages/BasePage';

test.describe('Input Validation & Sanitization', {
  tag: ['@Full', '@Security']
}, () => {
  let securityHelper: SecurityHelper;
  let testData: TestDataGenerator;

  test.beforeEach(async ({ page }) => {
    securityHelper = new SecurityHelper(page);
    testData = new TestDataGenerator();
  });

  test('prevent XSS in story responses', async ({ page, emailHandler }) => {
    // Create test user and complete purchase flow
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });
    await TestFlowHelper.completeOrderFlow(page, storyteller);
    await TestFlowHelper.goToDashboard(page);

    // Navigate to questions page and open editor
    const questionsPage = new QuestionsPage(page);
    await questionsPage.waitForDashboard();
    await questionsPage.startWriting(1);

    // Test each XSS payload type
    for (const payloadType of ['SCRIPT', 'EVENT_HANDLERS', 'JAVASCRIPT_URLS', 'HTML_INJECTION'] as const) {
      await securityHelper.testXSSPayload('[data-testid="story-response"]', payloadType);
      await questionsPage.saveAnswer();  // Save after each test
    }

    // Verify max length
    const longText = 'a'.repeat(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.STORY_RESPONSE + 100);
    await questionsPage.writeAnswer(longText);
    await questionsPage.saveAnswer();
    const content = (await page.locator('[data-testid="story-response"]').textContent()) || '';
    expect(content.length).toBeLessThanOrEqual(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.STORY_RESPONSE);
  });

  test('prevent XSS in profile fields', async ({ page }) => {
    // Start from homepage
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);

    // Test name fields
    await securityHelper.testXSSPayload('[data-testid="first-name"]', 'SCRIPT');
    await securityHelper.testXSSPayload('[data-testid="last-name"]', 'SCRIPT');

    // Verify max length
    const longName = 'a'.repeat(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.NAME + 100);
    await page.locator('[data-testid="first-name"]').fill(longName);
    const nameContent = await page.locator('[data-testid="first-name"]').inputValue();
    expect(nameContent.length).toBeLessThanOrEqual(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.NAME);
  });

  test('prevent HTML injection in gift messages', async ({ page }) => {
    // Start gift flow
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);

    // Navigate to gift message section
    await page.locator('[data-testid="gift-option"]').click();

    // Test HTML injection in gift message
    await securityHelper.testXSSPayload('[data-testid="gift-message"]', 'HTML_INJECTION');

    // Verify max length
    const longMessage = 'a'.repeat(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.MESSAGE + 100);
    await page.locator('[data-testid="gift-message"]').fill(longMessage);
    const messageContent = await page.locator('[data-testid="gift-message"]').inputValue();
    expect(messageContent.length).toBeLessThanOrEqual(SECURITY_CONFIG.XSS_TEST_DATA.MAX_LENGTH.MESSAGE);
  });

  test('sanitize file upload names', async ({ page, emailHandler }) => {
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
    }
  });
});
