import { Page } from '@playwright/test';
import { BasePage, CookieConsentOption } from './BasePage';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { URLS } from '../data/test.config';

export type OrderType = 'I will' | 'Someone else';

export class OrderPage extends BasePage {
  // Locators
  private readonly iWillOption = this.page.locator('#root > div > div.layout-content > div > div > div > div.ant-col.ant-col-xs-24.ant-col-sm-24.ant-col-md-12.ant-col-lg-14.ant-col-xl-16.css-jaljq0 > div > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div');
  private readonly someoneElseOption = this.page.locator('#root > div > div.layout-content > div > div > div > div.ant-col.ant-col-xs-24.ant-col-sm-24.ant-col-md-12.ant-col-lg-14.ant-col-xl-16.css-jaljq0 > div > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div > div:nth-child(2) > div');
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly pageTitle = this.page.locator('#root > div > div.layout-content > div > div > div > div.ant-col.ant-col-xs-24.ant-col-sm-24.ant-col-md-12.ant-col-lg-14.ant-col-xl-16.css-jaljq0 > div > div:nth-child(2) > div > div > div > div:nth-child(1) > h3');
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
    console.log('\n=== OrderPage Flow ===');
    console.log('1. Waiting for page');
    
    // Wait for page to be ready
    await this.page.waitForLoadState('networkidle');
    console.log('Current URL:', await this.page.url());
    
    console.log('\n2. Checking cookie consent');
    const hasDialog = await this.cookieHandler.isVisible();
    console.log('Cookie dialog visible:', hasDialog);
    
    // Handle cookie consent if it appears
    if (hasDialog) {
      console.log('Before cookie consent URL:', await this.page.url());
      await this.cookieHandler.handle(CookieConsentOption.ALLOW_ALL);
      console.log('After cookie consent URL:', await this.page.url());
    }
    
    console.log('\n3. Waiting for page title');
    // Increased timeout for CI
    await this.pageTitle.waitFor({ state: 'visible', timeout: 30000 });
    
    console.log('\n4. Selecting order type:', type);
    // Select order type
    if (type === 'I will') {
      await this.iWillOption.click();
    } else {
      await this.someoneElseOption.click();
    }
    console.log('After selection URL:', await this.page.url());

    // Click Next and wait for navigation
    console.log('\n5. Clicking Next');
    await this.nextButton.click();
    
    if (!skipTestMode) {
      // Add testmode to ORDER URL (which already has utm_campaign=test)
      const testModeUrl = await this.addTestMode(URLS.ORDER);
      console.log('Navigating to sandbox URL:', testModeUrl);
      await this.page.goto(testModeUrl);
    }

    await this.page.waitForLoadState('networkidle');
    console.log('Final URL:', await this.page.url());
  }

  async isOrderTypePage(): Promise<boolean> {
    // Wait for page to be ready
    await this.page.waitForLoadState('networkidle');
    await this.pageTitle.waitFor({ state: 'visible', timeout: 30000 });
    
    return await this.pageTitle.isVisible();
  }
}
