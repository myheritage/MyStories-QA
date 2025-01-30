import { Page } from '@playwright/test';
import { URLS } from '../data/test.config';

export enum CookieConsentOption {
  ALLOW_ALL = 'allow_all',
  DENY = 'deny'
}

export class BasePage {
  // User menu locators
  protected readonly userMenuButton = this.page.getByRole('img', { name: 'caret' });
  protected readonly logoutButton = this.page.getByText('Log out');
  protected readonly loginButton = this.page.getByRole('link', { name: 'Log In' });
  protected readonly emailInput = this.page.getByRole('textbox', { name: 'your email address' });
  protected readonly sendLinkButton = this.page.getByRole('button', { name: 'Send link' });

  constructor(protected page: Page) {}

  async logout() {
    console.log('Logging out');
    await this.userMenuButton.click();
    await this.logoutButton.click();
    await this.page.waitForURL(URLS.HOME);
  }

  async requestLoginLink(email: string) {
    console.log('Requesting login link for:', email);
    await this.loginButton.click();
    await this.page.waitForURL(URLS.LOGIN);
    await this.emailInput.fill(email);
    await this.sendLinkButton.click();
  }

  protected async addTestMode(url: string): Promise<string> {
    const urlObj = new URL(url);
    urlObj.searchParams.set('coupon', 'testmode');
    return urlObj.toString();
  }

  async takeScreenshot(name: string): Promise<string> {
    // Get the full height of the page
    const height = await this.page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
    });

    // Set viewport to full page height
    await this.page.setViewportSize({ width: 1280, height });

    // Take full page screenshot
    const screenshotPath = `${process.env.SCREENSHOT_DIR || 'test-results/screenshots'}/${name}-${Date.now()}.png`;
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    return screenshotPath;
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Wait for any lazy-loaded content
    await this.page.waitForTimeout(500);
  }

  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(500);
  }
}
