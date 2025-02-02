import { test as base, expect } from '@playwright/test';
import { EmailHandler, EmailMode } from '../helpers/EmailHandler';
import { TestFlowHelper } from '../helpers/TestFlowHelper';
import { stripeTestCards } from '../pages/PaymentPage';
import { HomePage } from '../pages/HomePage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage } from '../pages/PaymentPage';
import { SettingsPage } from '../pages/SettingsPage';
import { VisualTestHelper } from '../helpers/VisualTestHelper';
import { VISUAL_CONFIG } from '../data/visual.config';
import { CookieConsentOption } from '../pages/BasePage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';

// Extend base test with EmailHandler
const test = base.extend<{ emailHandler: EmailHandler }>({
  emailHandler: async ({ browser }, use) => {
    const handler = new EmailHandler({
      mode: process.env.EMAIL_MODE === 'hardcoded' ? EmailMode.HARDCODED : EmailMode.MAILSLURP,
      mailslurpApiKey: process.env.MAILSLURP_API_KEY,
      hardcodedEmails: process.env.EMAIL_MODE === 'hardcoded' ? {
        purchaser: process.env.HARDCODED_EMAIL!,
        recipient: process.env.HARDCODED_RECIPIENT_EMAIL
      } : undefined,
      isSandboxMode: process.env.STRIPE_SANDBOX === 'true'
    }, browser);
    await use(handler);
  }
});

test.describe('Visual Regression Tests', {
  tag: ['@Visual', '@Full']
}, () => {
  const visualHelper = new VisualTestHelper();
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  // Core pages
  if (VISUAL_CONFIG.pages.home) {
    test('homepage visual test', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.handleCookieConsent(CookieConsentOption.ALLOW_ALL);
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'homepage',
        metadata: {
          description: 'Homepage with cookie consent handled',
          url: page.url()
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  // Self-purchase flow
  if (VISUAL_CONFIG.pages.orderTypeSelf) {
    test('self-purchase order type page', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'order-type-self',
        metadata: {
          description: 'Order type selection page in self-purchase flow',
          url: page.url()
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  // Gift purchase flow
  if (VISUAL_CONFIG.pages.orderTypeGift) {
    test('gift purchase order type page', async ({ page }) => {
      const homePage = new HomePage(page);
      const orderPage = new OrderPage(page);
      
      await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
      await orderPage.selectOrderType('Someone else');
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'order-type-gift',
        metadata: {
          description: 'Order type selection page in gift flow',
          url: page.url()
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  // Email tests
  if (VISUAL_CONFIG.emails.welcome) {
    test('welcome email visual test', async ({ page, emailHandler }) => {
      // Create test user and complete purchase to trigger welcome email
      const { storyteller: userDetails } = await testData.createTestUser(emailHandler, {
        withState: true
      });
      
      // Complete purchase flow
      await TestFlowHelper.completeOrderFlow(page, userDetails);

      // Get welcome email
      const welcomeEmail = await emailHandler.waitForWelcomeEmail(userDetails.email);
      const emailContent = await emailHandler.getEmailContent(welcomeEmail);
      
      // Set email content and wait for it to render
      await page.setContent(emailContent.html);
      await page.waitForLoadState('networkidle');
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'email-welcome',
        metadata: {
          description: 'Welcome email template',
          viewport: { width: 600, height: 800 } // Common email width
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  if (VISUAL_CONFIG.emails.login) {
    test('login email visual test', async ({ page, emailHandler }) => {
      // Create test user
      const { storyteller: userDetails } = await testData.createTestUser(emailHandler, {
        withState: true
      });
      
      // Complete purchase and go to dashboard
      await TestFlowHelper.completeOrderFlow(page, userDetails);
      await TestFlowHelper.goToDashboard(page);

      // Trigger login email
      const homePage = new HomePage(page);
      const settingsPage = new SettingsPage(page);
      await settingsPage.logout();
      await homePage.startLoginFlow();
      await homePage.requestLoginLink(userDetails.email);

      // Get login email
      const loginEmail = await emailHandler.waitForLoginEmail(userDetails.email);
      const emailContent = await emailHandler.getEmailContent(loginEmail);
      
      // Set email content and wait for it to render
      await page.setContent(emailContent.html);
      await page.waitForLoadState('networkidle');
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'email-login',
        metadata: {
          description: 'Login email template',
          viewport: { width: 600, height: 800 }
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  if (VISUAL_CONFIG.emails.giftActivation) {
    test('gift activation email visual test', async ({ page, emailHandler }) => {
      // Create test users for gift flow
      const { storyteller, giftGiver } = await testData.createTestUser(emailHandler, {
        isGiftFlow: true
      });
      if (!giftGiver) throw new Error('Gift giver details required for gift flow');

      // Complete gift purchase flow
      await TestFlowHelper.completeGiftOrderFlow(page, storyteller, giftGiver);

      // Get activation email
      const activationEmail = await emailHandler.waitForGiftActivationEmail(storyteller.email, {
        giverFirstName: giftGiver.firstName,
        receiverFirstName: storyteller.firstName
      });
      const emailContent = await emailHandler.getEmailContent(activationEmail);
      
      // Set email content and wait for it to render
      await page.setContent(emailContent.html);
      await page.waitForLoadState('networkidle');
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'email-gift-activation',
        metadata: {
          description: 'Gift activation email template',
          viewport: { width: 600, height: 800 }
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  if (VISUAL_CONFIG.emails.giftOpened) {
    test('gift opened email visual test', async ({ page, emailHandler }) => {
      // Create test users for gift flow
      const { storyteller, giftGiver } = await testData.createTestUser(emailHandler, {
        isGiftFlow: true
      });
      if (!giftGiver) throw new Error('Gift giver details required for gift flow');

      // Complete gift purchase flow
      await TestFlowHelper.completeGiftOrderFlow(page, storyteller, giftGiver);

      // Get activation email and use link
      const activationEmail = await emailHandler.waitForGiftActivationEmail(storyteller.email, {
        giverFirstName: giftGiver.firstName,
        receiverFirstName: storyteller.firstName
      });
      const activationLink = await emailHandler.extractActivationLink(activationEmail);
      await page.goto(activationLink);

      // Get gift opened email
      const openedEmail = await emailHandler.waitForGiftOpenedEmail(giftGiver.email);
      const emailContent = await emailHandler.getEmailContent(openedEmail);
      
      // Set email content and wait for it to render
      await page.setContent(emailContent.html);
      await page.waitForLoadState('networkidle');
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'email-gift-opened',
        metadata: {
          description: 'Gift opened notification email template',
          viewport: { width: 600, height: 800 }
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  if (VISUAL_CONFIG.emails.weeklyQuestion) {
    test('weekly question email visual test', async ({ page, emailHandler }) => {
      // Create test user
      const { storyteller: userDetails } = await testData.createTestUser(emailHandler);
      
      // Complete purchase flow
      await TestFlowHelper.completeOrderFlow(page, userDetails);

      // Get weekly question email
      const questionEmail = await emailHandler.waitForWeeklyQuestionEmail(userDetails.email, {
        firstName: userDetails.firstName,
        testMode: true
      });
      const emailContent = await emailHandler.getEmailContent(questionEmail);
      
      // Set email content and wait for it to render
      await page.setContent(emailContent.html);
      await page.waitForLoadState('networkidle');
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'email-weekly-question',
        metadata: {
          description: 'Weekly question email template',
          viewport: { width: 600, height: 800 }
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }

  // Success pages
  if (VISUAL_CONFIG.pages.orderSuccessSelf) {
    test('self-purchase success page', async ({ page }) => {
      // Complete self-purchase flow
      const homePage = new HomePage(page);
      const orderPage = new OrderPage(page);
      const storyDetailsPage = new StoryDetailsPage(page);
      const paymentPage = new PaymentPage(page);
      
      await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
      await orderPage.selectOrderType('I will');
      
      const userDetails = await testData.generateStoryTeller();
      await storyDetailsPage.fillGiftGiverDetails({
        ...userDetails,
        country: 'United States',
        state: 'California',
        copies: 1
      });
      
      await paymentPage.completePayment(stripeTestCards.success);
      
      // Wait for success page to load
      await page.waitForURL(/\/order\/success/);
      
      const result = await visualHelper.compareScreenshot(page, {
        name: 'order-success-self',
        metadata: {
          description: 'Order success page after self-purchase',
          url: page.url()
        }
      });
      
      expect(result.matches, result.message).toBe(true);
    });
  }
});
