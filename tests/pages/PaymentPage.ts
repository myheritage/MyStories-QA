import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { PRICES } from '../data/prices.config';

export interface StripeCard {
  number: string;
  expiry: string;
  cvc: string;
  scenario: string;
  description: string;
}

export const stripeTestCards: Record<string, StripeCard> = {
  success: {
    number: '4242424242424242',
    expiry: '12/25',
    cvc: '123',
    scenario: 'success',
    description: 'Successful payment'
  },
  declinedCard: {
    number: '4000000000000002',
    expiry: '12/25',
    cvc: '123',
    scenario: 'declined',
    description: 'Generic decline'
  },
  insufficientFunds: {
    number: '4000000000009995',
    expiry: '12/25',
    cvc: '123',
    scenario: 'insufficient_funds',
    description: 'Insufficient funds decline'
  },
  expiredCard: {
    number: '4000000000000069',
    expiry: '12/25',
    cvc: '123',
    scenario: 'expired_card',
    description: 'Expired card decline'
  },
  incorrectCVC: {
    number: '4000000000000127',
    expiry: '12/25',
    cvc: '123',
    scenario: 'incorrect_cvc',
    description: 'Incorrect CVC decline'
  }
};

export class PaymentPage extends BasePage {
  // Stripe form locators
  private readonly checkoutContainer = this.page.getByTestId('checkout-container');
  private readonly cardNumber = this.page.getByRole('textbox', { name: 'Card number' });
  private readonly cardExpiry = this.page.getByRole('textbox', { name: 'Expiration' });
  private readonly cardCvc = this.page.getByRole('textbox', { name: 'CVC' });
  private readonly cardholderName = this.page.getByRole('textbox', { name: 'Cardholder name' });
  private readonly countryRegion = this.page.getByLabel('Country or region');
  private readonly zipCode = this.page.getByRole('textbox', { name: 'ZIP' });

  // Page locators
  private readonly promoCodeInput = this.page.getByPlaceholder('Add promotion code');
  private readonly promoCodeApplyButton = this.page.getByRole('button', { name: 'Apply' });
  private readonly subscribeButton = this.page.getByRole('button', { name: 'Subscribe' });
  private readonly giftSubscribeButton = this.page.getByTestId('hosted-payment-submit-button');
  
  /**
   * Special button that appears only for gift orders with 100% discount.
   * When a gift order has a promo code that makes the total $0.00,
   * the payment form changes to a simpler version without Stripe integration,
   * showing just a "Complete order" button instead of the usual payment form.
   * This is unique to gift orders - self orders with the same promo code
   * still show the regular Stripe payment form.
   */
  private readonly completeOrderButton = this.page.locator('#root > div > div > div.App-Payment.is-noBackground > main > div > form > div:nth-child(1) > div > div > div.PaymentForm-confirmPaymentContainer.mt4.flex-item.width-grow > div > div:nth-child(3) > button > div.SubmitButton-IconContainer');
  private readonly errorMessage = this.page.locator('div').filter({ hasText: /^Your credit card was declined\. Try paying with a debit card instead\.$/ });
  private readonly visitDashboardButton = this.page.getByRole('button', { name: 'Visit your dashboard' });

  // Price locators
  private readonly basePrice = this.page.getByTestId('product-summary-total-amount').getByText('$');
  private readonly additionalCopyPrice = this.page.getByText(`$${PRICES.ADDITIONAL_COPY_PRICE}`);
  private readonly discountPercentage = this.page.getByText('% off');

  /**
   * Total amount selector that works consistently across all scenarios:
   * - Self purchase (single or multiple copies)
   * - Gift purchase (single or multiple copies)
   */
  private readonly totalAmount = this.page.locator('#OrderDetails-TotalAmount > span');

  constructor(page: Page) {
    super(page);
  }

  private async waitForPaymentForm() {
    // Wait for initial page load
    await this.page.waitForLoadState('domcontentloaded');
    console.log('Page loaded, waiting for payment form...');
    
    // Wait for container to be ready
    await this.checkoutContainer.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Payment form is ready');
    return true;
  }

  /**
   * Fill payment details with standard automation
   * @param card Card details to fill
   * @param isRealCard If true, use human-like interactions
   */
  async fillPaymentDetails(card: StripeCard, isRealCard = false) {
    // Wait for payment form to be ready
    await this.waitForPaymentForm();
    
    console.log('Filling payment details...');
    
    if (isRealCard) {
      // Use human-like interactions for real cards
      console.log('Using human-like interactions for real card...');
      
      console.log('Filling cardholder name');
      await this.humanClick(this.cardholderName);
      await this.humanFill(this.cardholderName, 'Test User');
      
      console.log('Filling card number:', card.number);
      await this.cardNumber.waitFor({ state: 'visible', timeout: 5000 });
      await this.cardNumber.click();
      await this.humanFill(this.cardNumber, card.number);
      
      console.log('Filling expiry date:', card.expiry);
      await this.cardExpiry.waitFor({ state: 'visible', timeout: 5000 });
      await this.cardExpiry.click();
      await this.humanFill(this.cardExpiry, card.expiry);
      
      console.log('Filling CVC:', card.cvc);
      await this.cardCvc.waitFor({ state: 'visible', timeout: 5000 });
      await this.cardCvc.click();
      await this.humanFill(this.cardCvc, card.cvc);
      
      console.log('Selecting country');
      await this.humanClick(this.countryRegion);
      await this.countryRegion.selectOption('US');
      await this.page.waitForTimeout(Math.random() * 500 + 200);

      // Fill ZIP code if it appears (required for US)
      if (await this.zipCode.isVisible()) {
        console.log('Filling ZIP code');
        await this.humanClick(this.zipCode);
        await this.humanFill(this.zipCode, '12345');
      }
    } else {
      // Use standard automation for test cards
      console.log('Filling cardholder name');
      await this.cardholderName.waitFor({ state: 'visible', timeout: 5000 });
      await this.cardholderName.fill('Test User');
      
      console.log('Filling card number:', card.number);
      await this.cardNumber.waitFor({ state: 'visible', timeout: 5000 });
      await this.cardNumber.fill(card.number);
      
      console.log('Filling expiry date:', card.expiry);
      await this.cardExpiry.waitFor({ state: 'visible', timeout: 5000 });
      await this.cardExpiry.fill(card.expiry);
      
      console.log('Filling CVC:', card.cvc);
      await this.cardCvc.waitFor({ state: 'visible', timeout: 5000 });
      await this.cardCvc.fill(card.cvc);
      
      console.log('Selecting country');
      await this.countryRegion.waitFor({ state: 'visible', timeout: 5000 });
      await this.countryRegion.selectOption('US');

      // Fill ZIP code if it appears (required for US)
      if (await this.zipCode.isVisible()) {
        console.log('Filling ZIP code');
        await this.zipCode.waitFor({ state: 'visible', timeout: 5000 });
        await this.zipCode.fill('12345');
      }
    }
    
    console.log('Payment details filled successfully');
  }

  /**
   * Simulates human-like typing with random delays between keystrokes
   * @param input Element to type into
   * @param text Text to type
   */
  private async humanFill(input: any, text: string) {
    for (const char of text) {
      await input.type(char, { delay: Math.random() * 100 + 50 }); // 50-150ms delay
    }
  }

  /**
   * Simulates human-like clicking with random mouse movement
   * @param element Element to click
   */
  private async humanClick(element: any) {
    // Move mouse to random position first
    await this.page.mouse.move(
      Math.random() * 800 + 50,  // Random X (50-850)
      Math.random() * 500 + 50   // Random Y (50-550)
    );
    // Then move to element and click
    await element.hover();
    await this.page.waitForTimeout(Math.random() * 500 + 200); // 200-700ms pause
    await element.click();
  }

  /**
   * Apply promo code with standard automation
   * @param code Promo code to apply
   * @returns true if promo code was applied successfully, false if blocked by fraud detection
   */
  async applyPromoCode(code: string): Promise<boolean> {
    await this.waitForPaymentForm();
    console.log('Applying promo code:', code);
    
    await this.promoCodeInput.click();
    await this.promoCodeInput.fill(code);
    await this.promoCodeApplyButton.click();
    
    const success = await this.verifyPromoCode();
    if (success) {
      // Wait for form to fully update after verifying $0.00 total
      console.log('Waiting for form to update after successful promo code...');
      await this.page.waitForTimeout(5000);
    }
    return success;
  }

  /**
   * Apply promo code with human-like interactions for real card tests
   * Used to bypass Stripe's fraud detection
   * @param code Promo code to apply
   * @returns true if promo code was applied successfully, false if blocked by fraud detection
   */
  async applyRealCardPromoCode(code: string): Promise<boolean> {
    await this.waitForPaymentForm();
    console.log('Applying promo code with human-like interactions:', code);
    
    await this.humanClick(this.promoCodeInput);
    await this.humanFill(this.promoCodeInput, code);
    await this.page.waitForTimeout(Math.random() * 1000 + 500); // 500-1500ms pause
    await this.humanClick(this.promoCodeApplyButton);
    
    return this.verifyPromoCode();
  }

  /**
   * Verify promo code was applied successfully
   * @returns true if promo code was applied successfully, false if blocked by fraud detection
   */
  private async verifyPromoCode(): Promise<boolean> {
    console.log('Waiting for discount to be applied...');
    try {
      // Wait for any animations and price updates
      await this.page.waitForTimeout(2000);

      // Check for error message (blocked by fraud detection)
      const errorLocator = this.page.getByText('This code is invalid');
      const isErrorVisible = await errorLocator.isVisible()
        .catch(() => false);
      if (isErrorVisible) {
        console.log('⚠️ Promo code blocked by fraud detection');
        return false;
      }

      // Verify total amount is $0.00
      const total = await this.getTotalAmount();
      console.log('Total amount after discount:', total);
      if (total !== '$0.00') {
        throw new Error(`Expected $0.00 total but got ${total}`);
      }

      console.log('✅ Promo code applied successfully');
      return true;
    } catch (error) {
      console.error('❌ Error applying promo code:', error);
      throw error;
    }
  }

  /**
   * Click a button with human-like interaction
   * @param button Button element to click
   */
  async humanClickButton(button: any) {
    await this.humanClick(button);
  }

  /**
   * Complete the payment process, handling both regular payments and special cases.
   * 
   * For gift orders with 100% discount (total = $0.00), the payment form changes
   * to a simpler version without Stripe integration. In this case, we just need
   * to click the "Complete order" button. This is unique to gift orders - 
   * self orders with the same promo code still use the regular Stripe payment form.
   * 
   * For all other cases (regular payments or non-zero totals), we use the standard
   * Stripe payment form with either the subscribe or gift subscribe button.
   */
  async completePayment(card: StripeCard, isGiftOrder = false) {
    console.log('Starting payment process...');
    
    // Get current total amount
    const total = await this.getTotalAmount();
    
    if (isGiftOrder && total === '$0.00') {
      // For gift orders with 100% discount
      console.log('Gift order with 100% discount, clicking complete order button');
      
      console.log('Clicking complete order button');
      await this.completeOrderButton.click();
    } else {
      // Regular payment flow
      await this.fillPaymentDetails(card);
      console.log('Waiting for price updates to complete...');
      await this.page.waitForTimeout(2000);
      
      if (isGiftOrder) {
        console.log('Clicking gift subscribe button');
        await this.giftSubscribeButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.giftSubscribeButton.click();
      } else {
        console.log('Clicking subscribe button');
        await this.subscribeButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.subscribeButton.click();
      }
    }

    if (card.scenario === 'success') {
      console.log('Waiting for successful navigation');
      await this.page.waitForURL(/\/order\/success/);
    } else {
      console.log('Waiting for error message');
      await this.errorMessage.waitFor({ state: 'visible' });
    }
  }

  async visitDashboard() {
    console.log('Waiting for dashboard button');
    await this.visitDashboardButton.waitFor({ state: 'visible' });
    console.log('Clicking Visit your dashboard button');
    await Promise.all([
      this.page.waitForURL('https://app.mystories.com/'),
      this.visitDashboardButton.click()
    ]);
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  async isPaymentPage(): Promise<boolean> {
    try {
      return await this.waitForPaymentForm();
    } catch (error) {
      return false;
    }
  }

  async getMarketPrice(): Promise<string> {
    const text = await this.basePrice.textContent();
    console.log('Market price:', text);
    return text || '0';
  }

  async getDiscountPercentage(): Promise<string> {
    const text = await this.discountPercentage.textContent();
    return text?.replace('% off', '') || '0';
  }

  /**
   * Get the total amount using a selector that works consistently across all scenarios:
   * - Self purchase (single or multiple copies)
   * - Gift purchase (single or multiple copies)
   * 
   * @returns The total amount text or '0' if not found
   */
  async getTotalAmount(): Promise<string> {
    console.log('Getting total amount');
    const text = await this.totalAmount.textContent();
    console.log('Total amount:', text || '0');
    return text || '0';
  }
}
