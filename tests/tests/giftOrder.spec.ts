import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../pages/PaymentPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { CookieConsentOption } from '../pages/BasePage';
import { PRICES, calculateTotalPrice } from '../data/prices.config';

test.describe('Gift Order Flow', {
  tag: ['@Full']
}, () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('complete gift order', {
    tag: ['@Sanity']
  }, async ({ page }) => {
    console.log('Starting gift order test...');
    
    // Initialize page objects
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    // Generate test data
    const storyteller = await testData.generateStoryTeller({ isGiftRecipient: true });
    const giftGiver = await testData.generateGiftGiver({ withState: true }); // With US state
    console.log('Generated test data:', { storyteller, giftGiver });

    // Start order flow
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await expect(orderPage.isOrderTypePage()).resolves.toBeTruthy();
    console.log('Started order flow');

    // Select "Someone else" and proceed
    await orderPage.selectOrderType('Someone else');
    await expect(storyDetailsPage.isStoryTellerPage()).resolves.toBeTruthy();
    console.log('Selected "Someone else" option');

    // Fill storyteller details
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await expect(storyDetailsPage.isGiftGiverPage()).resolves.toBeTruthy();
    console.log('Filled storyteller details');

    // Fill gift giver details
    await storyDetailsPage.fillGiftGiverDetails(giftGiver, true);
    await expect(paymentPage.isPaymentPage()).resolves.toBeTruthy();
    console.log('Filled gift giver details');

    // Verify market price
    const price = await paymentPage.getMarketPrice();
    console.log('Market price:', price);
    expect(price).toContain(`$${PRICES.MARKET_PRICE}`);

    // Complete payment
    await paymentPage.completePayment(stripeTestCards.success, true);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Payment completed successfully');
  });

  test('schedule future gift delivery', async ({ page }) => {
    console.log('Starting future gift delivery test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    // Generate test data with future date
    const futureDate = '2025-02-27';
    const storyteller = await testData.generateStoryTeller({ 
      isGiftRecipient: true,
      giftDate: futureDate 
    });
    const giftGiver = await testData.generateGiftGiver();
    console.log('Generated test data with future date:', { storyteller, giftGiver });

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType('Someone else');
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await storyDetailsPage.fillGiftGiverDetails(giftGiver, true);
    console.log('Filled all details with future delivery date');

    // Verify market price
    const price = await paymentPage.getMarketPrice();
    console.log('Market price:', price);
    expect(price).toContain(`$${PRICES.MARKET_PRICE}`);

    await paymentPage.completePayment(stripeTestCards.success, true);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Future gift order completed successfully');
  });

  test('gift order with multiple copies', async ({ page }) => {
    console.log('Starting gift order with multiple copies test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    const storyteller = await testData.generateStoryTeller({ isGiftRecipient: true });
    const giftGiver = await testData.generateGiftGiver();
    const copies = 3;
    giftGiver.copies = copies;
    console.log(`Generated test data with ${copies} copies:`, { storyteller, giftGiver });

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType('Someone else');
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await storyDetailsPage.fillGiftGiverDetails(giftGiver, true);
    console.log('Filled all details for multiple copies order');

    // Wait for price to update after copies selection
    await page.waitForTimeout(1000);

    // Verify initial price
    const initialPrice = await paymentPage.getMarketPrice();
    const expectedPrice = calculateTotalPrice(copies);
    console.log(`Initial price: ${initialPrice}, Expected: $${expectedPrice}`);
    expect(initialPrice).toContain(`$${expectedPrice}`);

    await paymentPage.completePayment(stripeTestCards.success, true);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Multiple copies gift order completed successfully');
  });

  test('gift order with promo code', async ({ page }) => {
    console.log('Starting gift order with promo code test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    const storyteller = await testData.generateStoryTeller({ isGiftRecipient: true });
    const giftGiver = await testData.generateGiftGiver();
    const copies = 2;
    giftGiver.copies = copies;
    console.log(`Generated test data with ${copies} copies:`, { storyteller, giftGiver });

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType('Someone else');
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await storyDetailsPage.fillGiftGiverDetails(giftGiver, true);
    console.log('Filled all details');

    // Wait for price to update after copies selection
    await page.waitForTimeout(1000);

    // Verify initial price
    const initialPrice = await paymentPage.getMarketPrice();
    const expectedPrice = calculateTotalPrice(copies);
    console.log(`Initial price: ${initialPrice}, Expected: $${expectedPrice}`);
    expect(initialPrice).toContain(`$${expectedPrice}`);

    // Apply promo code
    await paymentPage.applyPromoCode(PRICES.PROMO_CODES.FULL_DISCOUNT.code);
    console.log('Applied promo code:', PRICES.PROMO_CODES.FULL_DISCOUNT.code);

    // Verify discounted price
    const finalPrice = await paymentPage.getTotalAmount();
    console.log('Final price after discount:', finalPrice);
    expect(finalPrice).toContain(PRICES.PROMO_CODES.FULL_DISCOUNT.finalPrice);

    await paymentPage.completePayment(stripeTestCards.success, true);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Gift order with promo code completed successfully');
  });
});
