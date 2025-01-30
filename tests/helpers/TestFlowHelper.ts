import { Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../pages/PaymentPage';
import { QuestionsPage } from '../pages/QuestionsPage';
import { CookieConsentOption } from '../pages/BasePage';
import { StoryTellerDetails } from './TestDataGenerator';

export class TestFlowHelper {
  /**
   * Complete the order flow with given user details
   * @param page Playwright page
   * @param userDetails User details to fill in forms
   * @param options Additional options for the flow
   * @returns Promise that resolves when order is complete
   */
  static async completeOrderFlow(page: Page, userDetails: StoryTellerDetails, options: {
    isGiftFlow?: boolean;
    withState?: boolean;
    copies?: number;
  } = {}) {
    console.log('Starting order flow with options:', options);
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    // Start order flow
    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType(options.isGiftFlow ? 'Someone else' : 'I will');
    
    // Add state for US orders
    const detailsWithState = {
      ...userDetails,
      state: userDetails.country === 'United States' ? 'California' : undefined
    };

    if (options.isGiftFlow) {
      await storyDetailsPage.fillStoryTellerDetails(detailsWithState);
      await storyDetailsPage.fillGiftGiverDetails(detailsWithState, true);
    } else {
      await storyDetailsPage.fillGiftGiverDetails(detailsWithState);
    }
    
    await paymentPage.completePayment(stripeTestCards.success, options.isGiftFlow);
  }

  static async completeGiftOrderFlow(page: Page, storyteller: StoryTellerDetails, giftGiver: StoryTellerDetails) {
    console.log('Starting gift order flow');
    
    const homePage = new HomePage(page);
    const orderPage = new OrderPage(page);
    const storyDetailsPage = new StoryDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    await homePage.startOrderFlow(CookieConsentOption.ALLOW_ALL);
    await orderPage.selectOrderType('Someone else');
    await storyDetailsPage.fillStoryTellerDetails(storyteller);
    await storyDetailsPage.fillGiftGiverDetails(giftGiver, true);
    await paymentPage.completePayment(stripeTestCards.success, true);
  }

  /**
   * Navigate to and verify dashboard page
   * @param page Playwright page
   * @returns Promise that resolves when dashboard is loaded
   */
  static async goToDashboard(page: Page) {
    console.log('Navigating to dashboard');
    
    const paymentPage = new PaymentPage(page);
    const questionsPage = new QuestionsPage(page);
    
    await paymentPage.visitDashboard();
    await questionsPage.waitForDashboard();
  }
}
