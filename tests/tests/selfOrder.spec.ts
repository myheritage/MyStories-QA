import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../pages/PaymentPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { CookieConsentOption } from '../pages/BasePage';
import { PRICES, calculateTotalPrice } from '../data/prices.config';

test.describe('Self Order Flow', {
  tag: ['@Full']
}, () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('complete order with successful payment', {
    tag: ['@Sanity']
  }, async ({ page }) => {
    console.log('Starting successful payment test...');
    
    // Initialize page objects
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    // Start order flow with cookie consent
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    console.log('Navigated to order flow');
    
    // Verify we're on the order type page and select "I will"
    await expect(orderPage.isOrderTypePage()).resolves.toBeTruthy();
    await orderPage.selectOrderType('I will');
    console.log('Selected "I will" option');
    
    // Generate and fill in user details (state field is not used in current version)
    const userDetails = await testData.generateStoryTeller();
    await storyDetailsPage.fillGiftGiverDetails({
      ...userDetails,
      country: 'United States',
      copies: 1
    });
    console.log('Filled in user details');

    // Complete payment
    await expect(paymentPage.isPaymentPage()).resolves.toBeTruthy();
    
    // Verify market price
    const price = await paymentPage.getMarketPrice();
    console.log('Market price:', price);
    expect(price).toContain(`$${PRICES.MARKET_PRICE}`);
    
    await paymentPage.completePayment(stripeTestCards.success);
    console.log('Completed payment');

    // Verify successful order
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Order completed successfully');
  });

  test('complete order with denied cookies', async ({ page }) => {
    console.log('Starting denied cookies test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    await homePage.startOrderFlow(CookieConsentOption.DENY);
    await expect(orderPage.isOrderTypePage()).resolves.toBeTruthy();
    await orderPage.selectOrderType('I will');
    console.log('Selected "I will" option with denied cookies');
    
    const userDetails = await testData.generateStoryTeller();
    await storyDetailsPage.fillGiftGiverDetails({
      ...userDetails,
      country: 'Canada',
      copies: 1
    });
    console.log('Filled in user details for Canada');

    await paymentPage.completePayment(stripeTestCards.success);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Order completed successfully with denied cookies');
  });

  test('handle declined payment', async ({ page }) => {
    console.log('Starting declined payment test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await expect(orderPage.isOrderTypePage()).resolves.toBeTruthy();
    await orderPage.selectOrderType('I will');
    console.log('Selected "I will" option');
    
    const userDetails = await testData.generateStoryTeller();
    await storyDetailsPage.fillGiftGiverDetails({
      ...userDetails,
      country: 'United States',
      copies: 1
    });
    console.log('Filled in user details');

    await paymentPage.completePayment(stripeTestCards.declinedCard);
    const errorMessage = await paymentPage.getErrorMessage();
    console.log('Error message:', errorMessage);
    expect(errorMessage).toBe('Your credit card was declined. Try paying with a debit card instead.');
    console.log('Declined payment test completed successfully');
  });

  test('apply promotion code', async ({ page }) => {
    console.log('Starting promotion code test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await expect(orderPage.isOrderTypePage()).resolves.toBeTruthy();
    await orderPage.selectOrderType('I will');
    console.log('Selected "I will" option');
    
    const userDetails = await testData.generateStoryTeller();
    const copies = 2;
    await storyDetailsPage.fillGiftGiverDetails({
      ...userDetails,
      country: 'United Kingdom',
      copies
    });
    console.log(`Filled in user details with ${copies} copies`);

    // Wait for price to update after copies selection
    await page.waitForTimeout(1000);

    // Verify initial price
    const initialPrice = await paymentPage.getMarketPrice();
    const expectedPrice = calculateTotalPrice(copies);
    console.log(`Initial price: ${initialPrice}, Expected: $${expectedPrice}`);
    expect(initialPrice).toContain(`$${expectedPrice}`);

    // Apply promo code first (no payment details needed for 100% discount)
    await paymentPage.applyPromoCode(PRICES.PROMO_CODES.FULL_DISCOUNT.code);
    console.log('Applied promo code:', PRICES.PROMO_CODES.FULL_DISCOUNT.code);

    // Verify total is $0.00 and button changed to "Complete order"
    const finalPrice = await paymentPage.getTotalAmount();
    console.log('Final price after discount:', finalPrice);
    expect(finalPrice).toBe('$0.00');

    // Complete order (no payment details needed)
    await paymentPage.completePayment(stripeTestCards.success);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Order completed successfully with promo code');
  });
});
