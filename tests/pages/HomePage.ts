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
    await this.page.goto(URLS.HOME);
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
    
    // Wait for navigation to order page with UTM parameters
    await this.page.waitForURL(URLS.ORDER);
    await this.page.waitForLoadState('domcontentloaded');
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
