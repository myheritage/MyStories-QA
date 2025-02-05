import { test as base, expect, TestInfo } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SettingsPage } from '../pages/SettingsPage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../pages/PaymentPage';
import { QuestionsPage } from '../pages/QuestionsPage';
import { GiftActivationPage } from '../pages/GiftActivationPage';
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

  test('verify welcome email', async ({ page, emailHandler }, testInfo) => {
    // Create test user with MailSlurp inbox (US for state selection)
    const { storyteller: userDetails } = await testData.createTestUser(emailHandler, {
      withState: true  // This will use US country with state
    });
    console.log('Created test user:', userDetails);

    // Complete purchase flow
    await TestFlowHelper.completeOrderFlow(page, userDetails);

    // Verify welcome email and login link
    await emailHandler.verifyWelcomeProcess(page, userDetails, testInfo);
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

    // Verify login email and process
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

  test('verify gift flow emails', async ({ page, emailHandler }, testInfo) => {
    // Create test users with MailSlurp inboxes
    const { storyteller, giftGiver } = await testData.createTestUser(emailHandler, {
      isGiftFlow: true,
      withState: true  // Ensure US users get a state
    });
    if (!giftGiver) throw new Error('Gift giver details required for gift flow');
    console.log('Created test users:', { storyteller, giftGiver });

    // Complete gift purchase flow
    await TestFlowHelper.completeGiftOrderFlow(page, storyteller, giftGiver);

    // 1. Verify gift receive email (sent to storyteller)
    const receiveEmail = await emailHandler.waitForGiftReceiveEmail(storyteller.email, {
      giverFirstName: giftGiver.firstName,
      receiverFirstName: storyteller.firstName
    });
    await emailHandler.verifyEmailContent(receiveEmail, testInfo, {
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES,
      requiredLinks: ['activation']
    });

    // Extract and click activation link
    const activationLink = await emailHandler.extractActivationLink(receiveEmail);
    expect(activationLink).toMatch(/^https:\/\/e\.customeriomail\.com\//);
    console.log('Clicking activation link');
    await page.goto(activationLink);

    // Complete activation
    const activationPage = new GiftActivationPage(page);
    await activationPage.verifyPrefilledDetails(storyteller);
    await activationPage.completeActivation();

    // Verify successful activation by checking email in settings
    const settingsPage = new SettingsPage(page);
    await settingsPage.verifyUserEmail(storyteller.email);

    // Verify gift opened notification sent to gift giver
    const openedEmail = await emailHandler.waitForGiftOpenedEmail(giftGiver.email);
    await emailHandler.verifyEmailContent(openedEmail, testInfo, {
      expectedSubject: EMAIL_CONFIG.SUBJECTS.GIFT_OPENED,
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES
    });
  });
});

/**
 * Weekly Question Email Tests
 * 
 * These tests verify the weekly question email flow:
 * 1. Receiving weekly question emails
 * 2. Clicking answer link to answer on website
 * 3. Replying directly via email
 * 4. Answer verification on website
 * 
 * Features tested:
 * - Email delivery and content verification
 * - Web-based answering through question link
 * - Email-based answering through reply
 * - Answer synchronization between email and web
 * - Photo attachments (coming soon)
 */
test.describe('Weekly Question Emails', {
  tag: ['@Emails']
}, () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('verify weekly question email', {
    tag: ['@WIP']
  }, async ({ page, emailHandler }, testInfo) => {
    // Create test user with MailSlurp inbox
    const { storyteller: userDetails } = await testData.createTestUser(emailHandler, {
      withState: true  // Add this to match other tests
    });
    console.log('Created test user:', userDetails);

    // Complete purchase flow and verify login
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    const settingsPage = new SettingsPage(page);
    await settingsPage.verifyUserEmail(userDetails.email);

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

    // Click question link and verify it works
    const questionLink = await emailHandler.extractQuestionLink(questionEmail);
    console.log('Clicking question link');
    await page.goto(questionLink);
    
    // Verify we're on the question page
    const questionsPage = new QuestionsPage(page);
    await questionsPage.waitForDashboard();
  });

  test('verify weekly question email reply', {
    tag: ['@WIP']
  }, async ({ page, emailHandler }, testInfo) => {
    // Create test user with MailSlurp inbox
    const { storyteller: userDetails } = await testData.createTestUser(emailHandler, {
      withState: true
    });
    console.log('Created test user:', userDetails);

    // Complete purchase flow and verify login
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    const settingsPage = new SettingsPage(page);
    await settingsPage.verifyUserEmail(userDetails.email);

    // Get weekly question email
    const questionEmail = await emailHandler.waitForWeeklyQuestionEmail(userDetails.email, {
      firstName: userDetails.firstName,
      testMode: true
    });

    // Extract question from subject
    const match = questionEmail.subject.match(/^[^,]+, (.+)$/);
    const question = match ? match[1] : '';
    console.log('Received weekly question:', question);

    // Reply to email with answer
    const answer = "Here's my answer to the weekly question!";
    await emailHandler.replyToEmail(questionEmail, answer);

    // Wait for answer to appear on website (30 sec with 3 retries)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const questionsPage = new QuestionsPage(page);
        await questionsPage.waitForDashboard();
        await questionsPage.verifyAnswerText(question, answer);
        break;
      } catch (error) {
        if (attempt === 3) throw error;
        console.log(`Attempt ${attempt} failed, retrying in 30 seconds...`);
        await page.waitForTimeout(30000);
      }
    }
  });
});
