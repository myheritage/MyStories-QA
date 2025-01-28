import { Page } from '@playwright/test';
import { BasePage, CookieConsentOption } from './BasePage';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';

export type OrderType = 'I will' | 'Someone else';

export class OrderPage extends BasePage {
  // Locators
  private readonly iWillOption = this.page.getByText('I will').first();
  private readonly someoneElseOption = this.page.getByText('Someone else').first();
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly pageTitle = this.page.getByText('Who will be telling the stories?');
  private readonly cookieHandler: CookieConsentHandler;

  constructor(page: Page) {
    super(page);
    this.cookieHandler = new CookieConsentHandler(page);
  }

  async selectOrderType(type: OrderType) {
    // Wait for page to be ready
    await this.page.waitForLoadState('networkidle');
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });

    // Handle cookie consent if it appears
    if (await this.cookieHandler.isVisible()) {
      await this.cookieHandler.handle(CookieConsentOption.ALLOW_ALL);
    }
    
    // Select order type
    if (type === 'I will') {
      await this.iWillOption.click();
    } else {
      await this.someoneElseOption.click();
    }

    // Click Next and wait for navigation
    await this.nextButton.click();
    
    // Add test mode to URL
    const currentUrl = this.page.url();
    const testModeUrl = await this.addTestMode(currentUrl);
    console.log('Navigating to sandbox URL:', testModeUrl);
    await this.page.goto(testModeUrl);
    await this.page.waitForLoadState('networkidle');
  }

  async isOrderTypePage(): Promise<boolean> {
    // Wait for page to be ready
    await this.page.waitForLoadState('networkidle');
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
    
    return await this.pageTitle.isVisible();
  }
}
