import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../pages/PaymentPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { CookieConsentOption } from '../pages/BasePage';

const MARKET_PRICE = '99.00';

test.describe('Gift Order Flow', () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('complete gift order and verify emails', async ({ page }) => {
    console.log('Starting gift order test with email verification...');
    
    // Initialize page objects
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    // Generate test data
    const storyteller = await testData.generateGiftStoryTeller();
    const giftGiver = await testData.generateGiftGiver(true); // With US state
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
    await storyDetailsPage.fillGiftGiverDetails(giftGiver);
    await expect(paymentPage.isPaymentPage()).resolves.toBeTruthy();
    console.log('Filled gift giver details');

    // Verify market price
    const price = await paymentPage.getMarketPrice();
    console.log('Market price:', price);
    expect(price).toContain(MARKET_PRICE);

    // Complete payment
    await paymentPage.completePayment(stripeTestCards.success);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Payment completed successfully');

    // Verify gift notification email
    const giftEmail = await testData.emailHandler.waitForGiftNotification(storyteller.email);
    expect(giftEmail.subject).toContain('You received a MyStories gift');
    console.log('Gift notification email received');

    // Extract and visit activation link
    const activationLink = await testData.emailHandler.extractActivationLink(giftEmail);
    await page.goto(activationLink);
    console.log('Visited activation link');

    // Verify gift opened notification
    const openedEmail = await testData.emailHandler.waitForGiftOpenedNotification(giftGiver.email);
    expect(openedEmail.subject).toContain('Your gift was opened');
    console.log('Gift opened notification received');
  });

  test('schedule future gift delivery', async ({ page }) => {
    console.log('Starting future gift delivery test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    // Generate test data with future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days in future
    
    const storyteller = await testData.generateGiftStoryTeller();
    storyteller.giftDate = futureDate.toISOString().split('T')[0];
    const giftGiver = await testData.generateGiftGiver();
    console.log('Generated test data with future date:', { storyteller, giftGiver });

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType('Someone else');
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await storyDetailsPage.fillGiftGiverDetails(giftGiver);
    console.log('Filled all details with future delivery date');

    // Verify market price
    const price = await paymentPage.getMarketPrice();
    console.log('Market price:', price);
    expect(price).toContain(MARKET_PRICE);

    await paymentPage.completePayment(stripeTestCards.success);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Future gift order completed successfully');
  });

  test('gift order with custom message', async ({ page }) => {
    console.log('Starting gift order with custom message test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    const storyteller = await testData.generateGiftStoryTeller();
    storyteller.message = 'This is a special gift for you to share your amazing life stories. Looking forward to reading them!';
    const giftGiver = await testData.generateGiftGiver();
    console.log('Generated test data with custom message');

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType('Someone else');
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await storyDetailsPage.fillGiftGiverDetails(giftGiver);
    console.log('Filled all details including custom message');

    // Verify market price
    const price = await paymentPage.getMarketPrice();
    console.log('Market price:', price);
    expect(price).toContain(MARKET_PRICE);

    await paymentPage.completePayment(stripeTestCards.success);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Gift order with custom message completed');

    // Verify custom message in email
    const giftEmail = await testData.emailHandler.waitForGiftNotification(storyteller.email);
    expect(giftEmail.body).toContain(storyteller.message);
    console.log('Custom message verified in email');
  });

  test('gift order with multiple copies', async ({ page }) => {
    console.log('Starting gift order with multiple copies test...');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    const storyteller = await testData.generateGiftStoryTeller();
    const giftGiver = await testData.generateGiftGiver();
    giftGiver.copies = 3; // Order multiple copies
    console.log('Generated test data with multiple copies:', { storyteller, giftGiver });

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType('Someone else');
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await storyDetailsPage.fillGiftGiverDetails(giftGiver);
    console.log('Filled all details for multiple copies order');

    // Verify market price (should be multiplied by number of copies)
    const price = await paymentPage.getMarketPrice();
    console.log('Market price:', price);
    const expectedPrice = (parseFloat(MARKET_PRICE) * giftGiver.copies).toFixed(2);
    expect(price).toContain(expectedPrice);

    await paymentPage.completePayment(stripeTestCards.success);
    await expect(page).toHaveURL(/\/order\/success/);
    console.log('Multiple copies gift order completed successfully');
  });
});
