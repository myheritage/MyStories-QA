import { Page } from '@playwright/test';

export enum CookieConsentOption {
  ALLOW_ALL = 'allow_all',
  DENY = 'deny'
}

export class BasePage {
  constructor(protected page: Page) {}

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
