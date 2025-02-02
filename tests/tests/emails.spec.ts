import { test as base, expect, TestInfo } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SettingsPage } from '../pages/SettingsPage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../pages/PaymentPage';
import { QuestionsPage } from '../pages/QuestionsPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { CookieConsentOption } from '../pages/BasePage';
import { EmailHandler, Email, EmailMode } from '../helpers/EmailHandler';
import { TestFlowHelper } from '../helpers/TestFlowHelper';
import { URLS, EMAIL_CONFIG } from '../data/test.config';

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

test.describe('Self Purchase Emails', {
  tag: ['@Emails']
}, () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('verify welcome email in production mode', async ({ page, emailHandler }, testInfo) => {
    // Create test user with MailSlurp inbox (US for state selection)
    const { storyteller: userDetails } = await testData.createTestUser(emailHandler, {
      withState: true  // This will use US country with state
    });
    console.log('Created test user:', userDetails);

    // Complete purchase flow
    await TestFlowHelper.completeOrderFlow(page, userDetails);

    // Verify welcome email
    const welcomeEmail = await emailHandler.waitForWelcomeEmail(userDetails.email);
    await emailHandler.verifyEmailContent(welcomeEmail, testInfo, {
      expectedSubject: EMAIL_CONFIG.SUBJECTS.WELCOME,
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES
    });
  });

  test('verify login email', async ({ page, emailHandler }, testInfo) => {
    // Create test user with MailSlurp inbox (US for state selection)
    const { storyteller: userDetails } = await testData.createTestUser(emailHandler, {
      withState: true  // This will use US country with state
    });
    console.log('Created test user:', userDetails);

    // Complete purchase flow and go to dashboard
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    await TestFlowHelper.goToDashboard(page);

    // Initialize page objects for login flow
    const homePage = new HomePage(page);
    const settingsPage = new SettingsPage(page);

    // Logout and start login flow
    await settingsPage.logout();
    await homePage.startLoginFlow();
    await homePage.requestLoginLink(userDetails.email);

    // Get and verify login email
    const loginEmail = await emailHandler.waitForLoginEmail(userDetails.email);
    await emailHandler.verifyEmailContent(loginEmail, testInfo, {
      expectedSubject: EMAIL_CONFIG.SUBJECTS.LOGIN,
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES,
      requiredLinks: ['login']
    });

    // Complete login verification
    await emailHandler.verifyLoginProcess(page, userDetails, testInfo);
  });
});

test.describe('Gift Flow Emails', {
  tag: ['@Emails']
}, () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('verify gift activation email', async ({ page, emailHandler }, testInfo) => {
    // Create test users with MailSlurp inboxes
    const { storyteller, giftGiver } = await testData.createTestUser(emailHandler, {
      isGiftFlow: true
    });
    if (!giftGiver) throw new Error('Gift giver details required for gift flow');
    console.log('Created test users:', { storyteller, giftGiver });

    // Complete gift purchase flow
    await TestFlowHelper.completeGiftOrderFlow(page, storyteller, giftGiver);

    // Verify gift activation email
    const activationEmail = await emailHandler.waitForGiftActivationEmail(storyteller.email, {
      giverFirstName: giftGiver.firstName,
      receiverFirstName: storyteller.firstName
    });

    await emailHandler.verifyEmailContent(activationEmail, testInfo, {
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES,
      requiredLinks: ['activation']
    });

    // Extract and verify activation link
    const activationLink = await emailHandler.extractActivationLink(activationEmail);
    expect(activationLink).toMatch(/^https:\/\/e\.customeriomail\.com\//);
    console.log('Activation link verified');
  });

  test('verify gift opened notification', async ({ page, emailHandler }, testInfo) => {
    // Create test users with MailSlurp inboxes
    const { storyteller, giftGiver } = await testData.createTestUser(emailHandler, {
      isGiftFlow: true
    });
    if (!giftGiver) throw new Error('Gift giver details required for gift flow');
    console.log('Created test users:', { storyteller, giftGiver });

    // Complete gift purchase flow
    await TestFlowHelper.completeGiftOrderFlow(page, storyteller, giftGiver);

    // Get activation email and use link
    const activationEmail = await emailHandler.waitForGiftActivationEmail(storyteller.email, {
      giverFirstName: giftGiver.firstName,
      receiverFirstName: storyteller.firstName
    });
    const activationLink = await emailHandler.extractActivationLink(activationEmail);
    await page.goto(activationLink);

    // Verify gift opened notification
    const openedEmail = await emailHandler.waitForGiftOpenedEmail(giftGiver.email);
    await emailHandler.verifyEmailContent(openedEmail, testInfo, {
      expectedSubject: EMAIL_CONFIG.SUBJECTS.GIFT_OPENED,
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES
    });
  });

  test('verify weekly question email', async ({ page, emailHandler }, testInfo) => {
    // Create test user with MailSlurp inbox
    const { storyteller: userDetails } = await testData.createTestUser(emailHandler);
    console.log('Created test user:', userDetails);

    // Complete purchase flow
    await TestFlowHelper.completeOrderFlow(page, userDetails);

    // Get weekly question email (in test mode)
    const questionEmail = await emailHandler.waitForWeeklyQuestionEmail(userDetails.email, {
      firstName: userDetails.firstName,
      testMode: true
    });

    // Extract actual question from subject
    const match = questionEmail.subject.match(/^[^,]+, (.+)$/);
    const actualQuestion = match ? match[1] : '';
    console.log('Received weekly question:', actualQuestion);

    // Verify email content
    await emailHandler.verifyEmailContent(questionEmail, testInfo, {
      expectedSender: EMAIL_CONFIG.SENDERS.QUESTIONS,
      requiredLinks: ['question']
    });

    // Extract and verify question link
    const questionLink = await emailHandler.extractQuestionLink(questionEmail);
    expect(questionLink).toMatch(/^https:\/\/e\.customeriomail\.com\//);
    console.log('Question link verified');
  });
});
