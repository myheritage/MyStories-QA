import { test as base, expect } from '@playwright/test';
import { EmailHandler, EmailMode } from '../../helpers/EmailHandler';
import { HomePage } from '../../pages/HomePage';
import { OrderPage } from '../../pages/OrderPage';
import { StoryDetailsPage } from '../../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../../pages/PaymentPage';
import { SecurityHelper } from '../../helpers/SecurityHelper';
import { TestDataGenerator } from '../../helpers/TestDataGenerator';
import { TestFlowHelper } from '../../helpers/TestFlowHelper';
import { SECURITY_CONFIG } from '../../data/security.config';
import { CookieConsentOption } from '../../pages/BasePage';

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

test.describe('Payment Security', () => {
  let securityHelper: SecurityHelper;
  let testData: TestDataGenerator;

  test.beforeEach(async ({ page }) => {
    securityHelper = new SecurityHelper(page);
    testData = new TestDataGenerator();
  });

  test('prevent price manipulation', async ({ page, emailHandler }) => {
    // Start order flow
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);

    // Create test user
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });

    // Complete order flow up to payment
    const orderPage = new OrderPage(page);
    await orderPage.selectOrderType('I will');
    const storyDetailsPage = new StoryDetailsPage(page);
    await storyDetailsPage.fillGiftGiverDetails(storyteller);

    // Verify base price integrity
    await securityHelper.verifyPriceIntegrity(SECURITY_CONFIG.PAYMENT_TEST_DATA.PRICE_POINTS.SINGLE_BOOK);

    // Test price manipulation through request tampering
    await page.route('**/api/payment/**', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postData = request.postDataJSON();
        postData.amount = 1000; // Try to set a lower price
        await route.continue({ postData });
      } else {
        await route.continue();
      }
    });

    // Attempt payment with tampered price
    const paymentPage = new PaymentPage(page);
    await paymentPage.completePayment(stripeTestCards.success);

    // Verify payment was rejected or original price was enforced
    const errorMessage = await paymentPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('prevent order total tampering', async ({ page, emailHandler }) => {
    // Start order flow
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);

    // Create test user
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });

    // Complete order flow up to payment with multiple copies
    const orderPage = new OrderPage(page);
    await orderPage.selectOrderType('I will');
    const storyDetailsPage = new StoryDetailsPage(page);
    await storyDetailsPage.fillGiftGiverDetails({
      ...storyteller,
      copies: 2 // Order 2 copies
    });

    // Calculate expected total
    const expectedTotal = SECURITY_CONFIG.PAYMENT_TEST_DATA.PRICE_POINTS.SINGLE_BOOK + 
                         SECURITY_CONFIG.PAYMENT_TEST_DATA.PRICE_POINTS.ADDITIONAL_COPY;

    // Verify total price integrity
    await securityHelper.verifyPriceIntegrity(expectedTotal);

    // Test quantity manipulation
    for (const quantity of SECURITY_CONFIG.PAYMENT_TEST_DATA.TAMPERING_TESTS.QUANTITIES) {
      // Try to manipulate quantity through request
      await page.route('**/api/order/**', async route => {
        const request = route.request();
        if (request.method() === 'POST') {
          const postData = request.postDataJSON();
          postData.quantity = quantity;
          await route.continue({ postData });
        } else {
          await route.continue();
        }
      });

      // Verify server enforces valid quantity
      const total = await page.locator('[data-testid="total-amount"]').textContent();
      const cleanedTotal = parseFloat(total?.replace(/[^0-9.]/g, '') || '0');
      expect(cleanedTotal).toBe(expectedTotal);
    }
  });

  test('validate promo code security', async ({ page, emailHandler }) => {
    // Start order flow
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);

    // Create test user
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });

    // Complete order flow up to payment
    const orderPage = new OrderPage(page);
    await orderPage.selectOrderType('I will');
    const storyDetailsPage = new StoryDetailsPage(page);
    await storyDetailsPage.fillGiftGiverDetails(storyteller);

    // Test invalid promo codes
    for (const code of SECURITY_CONFIG.PAYMENT_TEST_DATA.INVALID_PROMO_CODES) {
      await securityHelper.testPromoCode(code);
    }

    // Test SQL injection in promo code
    await securityHelper.testPromoCode('\' OR \'1\'=\'1');
    await securityHelper.testPromoCode('"); DROP TABLE promo_codes; --');

    // Verify original price remains unchanged
    await securityHelper.verifyPriceIntegrity(SECURITY_CONFIG.PAYMENT_TEST_DATA.PRICE_POINTS.SINGLE_BOOK);
  });

  test('prevent payment intent tampering', async ({ page, emailHandler }) => {
    // Start order flow
    const homePage = new HomePage(page);
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);

    // Create test user
    const { storyteller } = await testData.createTestUser(emailHandler, {
      withState: true
    });

    // Complete order flow up to payment
    const orderPage = new OrderPage(page);
    await orderPage.selectOrderType('I will');
    const storyDetailsPage = new StoryDetailsPage(page);
    await storyDetailsPage.fillGiftGiverDetails(storyteller);

    // Intercept and modify payment intent request
    await page.route('**/api/payment/create-intent', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postData = request.postDataJSON();
        postData.amount = 1; // Try to set minimal amount
        await route.continue({ postData });
      } else {
        await route.continue();
      }
    });

    // Attempt payment with tampered intent
    const paymentPage = new PaymentPage(page);
    await paymentPage.completePayment(stripeTestCards.success);

    // Verify payment was rejected or original price was enforced
    const errorMessage = await paymentPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();

    // Verify final charge matches original price
    await securityHelper.verifyPriceIntegrity(SECURITY_CONFIG.PAYMENT_TEST_DATA.PRICE_POINTS.SINGLE_BOOK);
  });
});
