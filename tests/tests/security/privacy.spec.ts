import { test as base, expect } from '@playwright/test';
import { EmailHandler, EmailMode } from '../../helpers/EmailHandler';
import { HomePage } from '../../pages/HomePage';
import { QuestionsPage } from '../../pages/QuestionsPage';
import { URLS } from '../../data/test.config';
import { OrderPage } from '../../pages/OrderPage';
import { StoryDetailsPage } from '../../pages/StoryDetailsPage';
import { SecurityHelper } from '../../helpers/SecurityHelper';
import { TestDataGenerator } from '../../helpers/TestDataGenerator';
import { TestFlowHelper } from '../../helpers/TestFlowHelper';
import { SECURITY_CONFIG } from '../../data/security.config';
import { CookieConsentOption } from '../../pages/BasePage';
import { SettingsPage } from '../../pages/SettingsPage';

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
      isSandboxMode: process.env.STRIPE_SANDBOX === 'true'
    }, browser);
    await use(handler);
  }
});

test.describe('Privacy & Data Protection', {
  tag: ['@Full', '@Security']
}, () => {
  let securityHelper: SecurityHelper;
  let testData: TestDataGenerator;

  test.beforeEach(async ({ page }) => {
    securityHelper = new SecurityHelper(page);
    testData = new TestDataGenerator();
  });

  test('enforce cookie consent - deny all', async ({ page }, testInfo) => {
    // Start from homepage with denied cookies
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.DENY);

    // Verify analytics cookies are not set
    await securityHelper.verifyCookieConsent('ANALYTICS');

    // Verify marketing cookies are not set
    await securityHelper.verifyCookieConsent('MARKETING');

    // Verify essential cookies still work
    const cookies = await page.context().cookies();
    const hasEssentialCookies = cookies.some(cookie => 
      cookie.name.includes(SECURITY_CONFIG.PRIVACY_TEST_DATA.COOKIE_TYPES.ESSENTIAL)
    );
    expect(hasEssentialCookies).toBe(true);
    
    // Record results
    testInfo.annotations.push({
      type: 'Security Test Results',
      description: `Cookie Consent Test Results:
✅ Analytics cookies blocked
✅ Marketing cookies blocked
✅ Essential cookies working`
    });
  });

  test('verify privacy settings persistence', async ({ page, emailHandler }, testInfo) => {
    // Create test user and complete purchase
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });
    await TestFlowHelper.completeOrderFlow(page, storyteller);

    // Go to settings page
    const settingsPage = new SettingsPage(page);
    await settingsPage.goToManageAccount();

    // Test each privacy setting
    for (const [setting, defaultValue] of Object.entries(SECURITY_CONFIG.PRIVACY_TEST_DATA.PRIVACY_SETTINGS)) {
      await securityHelper.verifyPrivacySetting(setting as keyof typeof SECURITY_CONFIG.PRIVACY_TEST_DATA.PRIVACY_SETTINGS);

      // Refresh page and verify settings persist
      await page.reload();
      const isEnabled = await page.locator(`[data-testid="privacy-setting-${setting}"]`).isChecked();
      expect(isEnabled).toBe(defaultValue);
      
      testInfo.annotations.push({
        type: 'Security Test Results',
        description: `✅ Privacy setting "${setting}" persisted:\nExpected: ${defaultValue}\nActual: ${isEnabled}`
      });
    }
  });

  test('protect user data access', async ({ page, emailHandler }, testInfo) => {
    // Create two test users
    const { storyteller: user1 } = await testData.createTestUser(emailHandler, {
      withState: true
    });
    const { storyteller: user2 } = await testData.createTestUser(emailHandler, {
      withState: true
    });

    // Complete purchase flow for first user
    await TestFlowHelper.completeOrderFlow(page, user1);
    await TestFlowHelper.goToDashboard(page);

    // Add some story content
    const questionsPage = new QuestionsPage(page);
    await questionsPage.startWriting(1);
    await questionsPage.writeAnswer('This is user 1\'s private story content');
    await questionsPage.saveAnswer();

    // Logout and login as second user
    const settingsPage = new SettingsPage(page);
    await settingsPage.logout();

    // Complete purchase flow for second user
    await TestFlowHelper.completeOrderFlow(page, user2);
    await TestFlowHelper.goToDashboard(page);

    // Verify second user cannot access first user's content
    const pageContent = await page.content();
    expect(pageContent).not.toContain('user 1\'s private story content');

    // Try to directly access first user's story URL
    await page.goto(`${URLS.APP}/stories/${user1.email}`);
    expect(page.url()).not.toContain(user1.email);
    
    testInfo.annotations.push({
      type: 'Security Test Results',
      description: `Data Access Protection Results:
✅ User 2 cannot see User 1's story content
✅ Direct URL access blocked
✅ User data properly isolated`
    });
  });

  test('verify data export functionality', async ({ page, emailHandler }, testInfo) => {
    // Create test user and complete purchase
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });
    await TestFlowHelper.completeOrderFlow(page, storyteller);

    // Go to settings page
    const settingsPage = new SettingsPage(page);
    await settingsPage.goToManageAccount();

    // Request data export
    await page.locator('[data-testid="export-data-button"]').click();

    // Wait for export to complete
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-export"]').click();
    const download = await downloadPromise;

    // Verify export contains required data types
    const exportPath = await download.path();
    expect(exportPath).toBeTruthy();

    const exportContent = await page.evaluate(async () => {
      const response = await fetch('file://' + exportPath);
      return await response.json();
    });

    // Verify all required data types are included
    for (const dataType of SECURITY_CONFIG.PRIVACY_TEST_DATA.DATA_EXPORT_TYPES) {
      expect(exportContent).toHaveProperty(dataType);
    }

    // Verify sensitive data is properly redacted
    expect(exportContent.payment_history).not.toContain('card_');
    expect(JSON.stringify(exportContent)).not.toMatch(/\d{4}-\d{4}-\d{4}-\d{4}/);
    
    testInfo.annotations.push({
      type: 'Security Test Results',
      description: `Data Export Security Results:
✅ All required data types included:
${SECURITY_CONFIG.PRIVACY_TEST_DATA.DATA_EXPORT_TYPES.map(type => `  - ${type}`).join('\n')}
✅ Credit card numbers redacted
✅ Payment tokens redacted`
    });
  });
});
