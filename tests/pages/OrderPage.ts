import { Page } from '@playwright/test';
import { BasePage, CookieConsentOption } from './BasePage';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';

export type OrderType = 'I will' | 'Someone else';

export class OrderPage extends BasePage {
  // Locators
  private readonly iWillOption = this.page.locator('#root > div > div.layout-content > div > div > div > div.ant-col.ant-col-xs-24.ant-col-sm-24.ant-col-md-12.ant-col-lg-16.css-jaljq0 > div > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div');
  private readonly someoneElseOption = this.page.locator('#root > div > div.layout-content > div > div > div > div.ant-col.ant-col-xs-24.ant-col-sm-24.ant-col-md-12.ant-col-lg-16.css-jaljq0 > div > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div > div:nth-child(2) > div');
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly pageTitle = this.page.locator('#root > div > div.layout-content > div > div > div > div.ant-col.ant-col-xs-24.ant-col-sm-24.ant-col-md-12.ant-col-lg-16.css-jaljq0 > div > div:nth-child(2) > div > div > div > div:nth-child(1) > h3');
  private readonly cookieHandler: CookieConsentHandler;

  constructor(page: Page) {
    super(page);
    this.cookieHandler = new CookieConsentHandler(page);
  }

  /**
   * Select order type and proceed to next step
   * @param type Type of order ('I will' or 'Someone else')
   * @param skipTestMode If true, keeps original URL without test mode. Used for real card tests.
   */
  async selectOrderType(type: OrderType, skipTestMode = false) {
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
    
    if (!skipTestMode) {
      // Add test mode to URL only for non-real-card tests
      const currentUrl = this.page.url();
      const testModeUrl = await this.addTestMode(currentUrl);
      console.log('Navigating to sandbox URL:', testModeUrl);
      await this.page.goto(testModeUrl);
    }

    await this.page.waitForLoadState('networkidle');
  }

  async isOrderTypePage(): Promise<boolean> {
    // Wait for page to be ready
    await this.page.waitForLoadState('networkidle');
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
    
    return await this.pageTitle.isVisible();
  }
}
