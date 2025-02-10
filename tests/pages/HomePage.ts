import { Page } from '@playwright/test';
import { BasePage, CookieConsentOption } from './BasePage';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { URLS } from '../data/test.config';

export class HomePage extends BasePage {
  // Locators
  private readonly orderNowButton = this.page.getByTestId('linkElement').filter({ hasText: 'Order now' }).first();
  protected readonly loginButton = this.page.locator('#comp-kbgakxea_r_comp-m4v4qu0x7 > p > span > a');
  protected readonly emailInput = this.page.locator('#root > div > div.layout-content.centered > div > div > div > div > input');
  protected readonly sendLoginLinkButton = this.page.locator('#root > div > div.layout-content.centered > div > div > div > div > button');
  protected readonly loginConfirmationTitle = this.page.locator('#root > div > div.layout-content.centered > div > div > div > div > h1');
  
  // Cookie consent handler
  private readonly cookieHandler: CookieConsentHandler;

  constructor(page: Page) {
    super(page);
    this.cookieHandler = new CookieConsentHandler(page);
  }

  async goto() {
    console.log('Going to homepage:', URLS.HOME);
    await this.page.goto(URLS.HOME);
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for order button to be visible instead of networkidle
    await this.orderNowButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Homepage loaded');
  }

  async handleCookieConsent(option: CookieConsentOption) {
    console.log('Handling cookie consent');
    await this.cookieHandler.handle(option);
    // Wait to confirm banner is handled
    await this.cookieHandler.waitForHidden();
    console.log('Cookie consent handled');
  }

  async startOrderFlow(cookieOption: CookieConsentOption = CookieConsentOption.ALLOW_ALL) {
    console.log('\n=== HomePage Flow ===');
    console.log('1. Going to homepage');
    await this.goto();
    console.log('Current URL:', await this.page.url());

    console.log('\n2. Checking cookie consent');
    // Wait and retry for cookie banner (10 seconds)
    console.log('Waiting for cookie banner...');
    const hasDialog = await this.cookieHandler.waitForVisible({ timeout: 10000 });
    console.log('Cookie banner appeared:', hasDialog);
    
    if (hasDialog) {
      await this.handleCookieConsent(cookieOption);
      // Double check banner is gone
      const stillVisible = await this.cookieHandler.isVisible();
      console.log('Banner still visible:', stillVisible);
      if (stillVisible) {
        console.log('Banner still visible, handling again...');
        await this.handleCookieConsent(cookieOption);
      }
    }
    
    console.log('\n3. Clicking Order Now');
    await this.orderNowButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.orderNowButton.click();
    console.log('Current URL:', await this.page.url());
    
    // Wait for navigation to order page with UTM parameters
    await this.page.waitForURL(URLS.ORDER);
    await this.page.waitForLoadState('domcontentloaded');
    console.log('Final URL:', await this.page.url());
  }

  async startLoginFlow(cookieOption: CookieConsentOption = CookieConsentOption.ALLOW_ALL) {
    await this.handleCookieConsent(cookieOption);
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.loginButton.click();
    await this.page.waitForURL(URLS.LOGIN);
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async requestLoginLink(email: string) {
    console.log('Requesting login link for:', email);
    await this.emailInput.fill(email);
    await this.sendLoginLinkButton.click();
    await this.loginConfirmationTitle.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Login link requested');
  }
}
