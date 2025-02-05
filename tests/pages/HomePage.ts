import { Page } from '@playwright/test';
import { BasePage, CookieConsentOption } from './BasePage';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';

export class HomePage extends BasePage {
  // URLs
  private readonly baseUrl = 'https://www.mystories.com/';

  // Locators
  private readonly orderNowButton = this.page.getByTestId('linkElement').filter({ hasText: 'Order now' }).first();
  protected readonly loginButton = this.page.getByRole('link', { name: 'Log in' });
  protected readonly sendLoginLinkButton = this.page.locator('#root > div > div.layout-content.centered > div > div > div > div > button');
  
  // Cookie consent handler
  private readonly cookieHandler: CookieConsentHandler;

  constructor(page: Page) {
    super(page);
    this.cookieHandler = new CookieConsentHandler(page);
  }

  async goto() {
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for order button to be visible instead of networkidle
    await this.orderNowButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async handleCookieConsent(option: CookieConsentOption) {
    if (await this.cookieHandler.isVisible()) {
      await this.cookieHandler.handle(option);
    }
  }

  async startOrderFlow(cookieOption: CookieConsentOption = CookieConsentOption.ALLOW_ALL) {
    await this.goto();
    await this.handleCookieConsent(cookieOption);
    
    // Now proceed with clicking the order button
    await this.orderNowButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.orderNowButton.click();
    
    // Wait for navigation
    await this.page.waitForURL(/\/order/);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async startLoginFlow(cookieOption: CookieConsentOption = CookieConsentOption.ALLOW_ALL) {
    await this.goto();
    await this.handleCookieConsent(cookieOption);
    
    // Now proceed with clicking the login button
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.loginButton.click();
    
    // Wait for navigation
    await this.page.waitForURL(/\/login/);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async requestLoginLink(email: string) {
    console.log('Requesting login link for:', email);
    console.log('Filling email input');
    await this.page.getByPlaceholder('Email').fill(email);
    console.log('Clicking send login link button');
    await this.sendLoginLinkButton.click();
    console.log('Login link requested');
  }
}
