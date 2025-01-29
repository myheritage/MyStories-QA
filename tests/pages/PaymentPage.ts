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
  private readonly errorMessage = this.page.locator('div').filter({ hasText: /^Your credit card was declined\. Try paying with a debit card instead\.$/ });
  private readonly visitDashboardButton = this.page.getByRole('button', { name: 'Visit your dashboard' });

  // Price locators
  private readonly basePrice = this.page.getByTestId('product-summary-total-amount').getByText('$');
  private readonly additionalCopyPrice = this.page.getByText(`$${PRICES.ADDITIONAL_COPY_PRICE}`);
  private readonly discountPercentage = this.page.getByText('% off');
  private readonly totalAmount = this.page.locator(PRICES.SELECTORS.TOTAL_AMOUNT).getByText('$').first();

  constructor(page: Page) {
    super(page);
  }

  private async waitForPaymentForm() {
    // Wait for initial page load
    await this.page.waitForLoadState('domcontentloaded');
    console.log('Page loaded, waiting for payment form...');
    
    // Wait for container and form elements with retry
    for (let i = 0; i < 3; i++) {
      try {
        await this.checkoutContainer.waitFor({ state: 'visible', timeout: 5000 });
        await this.cardholderName.waitFor({ state: 'visible', timeout: 5000 });
        console.log('Payment form is ready');
        return true;
      } catch (error) {
        if (i === 2) throw error;
        console.log('Payment form not ready, retrying...');
        await this.page.waitForTimeout(1000);
      }
    }
    return false;
  }

  async fillPaymentDetails(card: StripeCard) {
    // Wait for payment form to be ready
    await this.waitForPaymentForm();
    
    console.log('Filling payment details...');
    console.log('Filling cardholder name');
    await this.cardholderName.fill('Test User');
    
    console.log('Filling card number:', card.number);
    await this.cardNumber.fill(card.number);
    
    console.log('Filling expiry date:', card.expiry);
    await this.cardExpiry.fill(card.expiry);
    
    console.log('Filling CVC:', card.cvc);
    await this.cardCvc.fill(card.cvc);
    
    console.log('Selecting country');
    await this.countryRegion.selectOption('US');

    // Fill ZIP code if it appears (required for US)
    if (await this.zipCode.isVisible()) {
      console.log('Filling ZIP code');
      await this.zipCode.fill('12345');
    }
    
    console.log('Payment details filled successfully');
  }

  async applyPromoCode(code: string) {
    await this.waitForPaymentForm();
    console.log('Applying promo code:', code);
    
    await this.promoCodeInput.click();
    await this.promoCodeInput.fill(code);
    await this.promoCodeApplyButton.click();
    
    // Wait for price update and discount to be applied
    console.log('Waiting for discount to be applied...');
    try {
      // Wait for any animations and price updates
      await this.page.waitForTimeout(2000);
      
      // Verify discount percentage
      const percentage = await this.getDiscountPercentage();
      console.log('Discount percentage:', percentage);
      if (percentage !== PRICES.PROMO_CODES.FULL_DISCOUNT.discountPercentage) {
        throw new Error(`Expected ${PRICES.PROMO_CODES.FULL_DISCOUNT.discountPercentage}% discount but got ${percentage}%`);
      }

      // Verify total amount
      const total = await this.getTotalAmount();
      console.log('Total amount after discount:', total);
      if (!total.includes(PRICES.PROMO_CODES.FULL_DISCOUNT.finalPrice)) {
        throw new Error(`Expected $${PRICES.PROMO_CODES.FULL_DISCOUNT.finalPrice} total but got ${total}`);
      }

      console.log('Promo code applied successfully');
    } catch (error) {
      console.error('Error applying promo code:', error);
      throw error;
    }
  }

  async completePayment(card: StripeCard, isGiftOrder = false) {
    console.log('Starting payment process...');
    await this.fillPaymentDetails(card);
    
    console.log('Waiting for price updates to complete...');
    await this.page.waitForTimeout(2000);
    
    // Use appropriate submit button based on order type
    if (isGiftOrder) {
      console.log('Clicking gift subscribe button');
      await this.giftSubscribeButton.click();
    } else {
      console.log('Clicking subscribe button');
      await this.subscribeButton.click();
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

  async getTotalAmount(): Promise<string> {
    const text = await this.totalAmount.textContent();
    return text || '0';
  }
}
