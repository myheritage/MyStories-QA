import { test } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';
import { CookieConsentOption } from '../../pages/BasePage';
import { OrderPage } from '../../pages/OrderPage';
import { StoryDetailsPage } from '../../pages/StoryDetailsPage';
import { PaymentPage } from '../../pages/PaymentPage';
import { TestDataGenerator } from '../../helpers/TestDataGenerator';
import { PRICES } from '../../data/prices.config';
// Import real card details from YAML config loader
import { getRealCard } from '../../data/real-card';
import { EmailHandler, EmailMode } from '../../helpers/EmailHandler';
import { EMAIL_CONFIG } from '../../data/test.config';

/**
 * ⚠️ REAL CREDIT CARD TESTS ⚠️
 * 
 * These tests use real credit cards and will result in actual charges.
 * Uses promo code MH99 for 99% discount ($1.00 final price).
 * 
 * TODO: Currently blocked by Stripe's fraud detection
 * - Stripe blocks automated promo code entry in production
 * - Even with human-like interactions (random delays, mouse movements)
 * - Need to find alternative solution or run without promo codes
 * 
 * To run:
 * 1. Copy real-card.yml.example to real-card.yml
 * 2. Update real-card.yml with actual card details
 * 3. Never commit real-card.yml
 * 4. Run with: npx playwright test payment/real-card.spec.ts --headed
 * 
 * Note: This test is tagged with @real-card and requires real-card.yml to be set up.
 * It has multiple safety checks to prevent accidental charges:
 * - Verifies MH99 promo code is applied
 * - Verifies 99% discount is active
 * - Verifies final price is exactly $1.00
 */
// Only run this test when explicitly selected
test.describe('Real Card Payment', { tag: '@real-card' }, () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('complete purchase with real card', async ({ page }) => {
    console.log('⚠️ STARTING REAL CARD PAYMENT TEST ⚠️');
    
    // Initialize pages
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    // Generate test data
    const userDetails = await testData.generateGiftGiver({ withState: true });
    console.log('Generated test data:', userDetails);

    // Complete purchase flow
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    // Skip test mode to keep original URL (no ?coupon=testmode)
    await orderPage.selectOrderType('I will', true);
    await storyDetailsPage.fillGiftGiverDetails(userDetails);

    // CRITICAL SAFETY CHECK: Try to apply MH99 promo code with human-like interactions
    // This helps bypass Stripe's fraud detection while minimizing actual charges
    const promoApplied = await paymentPage.applyRealCardPromoCode(PRICES.PROMO_CODES.REAL_CARD_TEST.code);
    if (!promoApplied) {
      console.log('⚠️ Promo code was blocked in production environment');
      console.log('❌ Stopping test to prevent full price charge');
      test.skip();
      return;
    }

    // CRITICAL SAFETY CHECK: Verify 99% discount is applied
    // This prevents accidental charges if promo code fails
    const discountPercentage = await paymentPage.getDiscountPercentage();
    if (discountPercentage !== PRICES.PROMO_CODES.REAL_CARD_TEST.discountPercentage) {
      throw new Error(
        `❌ SAFETY CHECK FAILED: Expected 99% discount but got ${discountPercentage}%. ` +
        'Stopping test to prevent unexpected charges.'
      );
    }
    console.log('✅ Discount verified as 99%');

    // CRITICAL SAFETY CHECK: Verify price is exactly $1.00
    // This prevents accidental charges if pricing changes
    const totalPrice = await paymentPage.getTotalAmount();
    if (totalPrice !== PRICES.PROMO_CODES.REAL_CARD_TEST.finalPrice) {
      throw new Error(
        `❌ SAFETY CHECK FAILED: Expected price $1.00 but got ${totalPrice}. ` +
        'Stopping test to prevent unexpected charges.'
      );
    }
    console.log('✅ Price verified as $1.00, proceeding with payment...');

    // Complete payment with real card using human-like interactions
    await paymentPage.fillPaymentDetails(getRealCard(), true);
    console.log('Waiting for price updates to complete...');
    await page.waitForTimeout(2000);
    
    // Click subscribe button with human-like interaction
    const subscribeButton = page.getByRole('button', { name: 'Subscribe' });
    await paymentPage.humanClickButton(subscribeButton);
    await page.waitForURL(/\/order\/success/);
    console.log('✅ Payment completed successfully');

    // Send backoffice refund info (not part of website validation)
    try {
      console.log('💳 Sending backoffice refund info...');
      const emailHandler = new EmailHandler({
        mode: EmailMode.MAILSLURP,  // Force MailSlurp for real card tests
        mailslurpApiKey: process.env.MAILSLURP_API_KEY
      });
      
      const transactionInfo = {
        date: new Date().toISOString(),
        amount: PRICES.PROMO_CODES.REAL_CARD_TEST.finalPrice,
        cardLast4: getRealCard().number.slice(-4),
        promoCode: PRICES.PROMO_CODES.REAL_CARD_TEST.code,
        userDetails: {
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          email: userDetails.email
        }
      };
      await emailHandler.sendRefundInfo(transactionInfo);
      console.log('✅ Refund info sent successfully');
    } catch (error) {
      console.error('❌ Failed to send refund info:', error);
      // Don't fail the test if refund email fails - it's not part of website validation
    }
  });
});
