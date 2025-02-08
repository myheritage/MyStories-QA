import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { URLS } from '../data/test.config';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  protected readonly accountMenuButton = this.page.locator('#root > div > div.page-wrapper-outer.header-outer > div > div > div.right > div');
  protected readonly logoutButton = this.page.locator('body > div:nth-child(6) > div > ul > li:nth-child(2) > span > span');

  async openAccountMenu() {
    console.log('Opening account menu');
    await this.accountMenuButton.click();
    console.log('Account menu opened');
  }

  async goToManageAccount() {
    console.log('Going to manage account');
    await this.openAccountMenu();
    await this.page.getByRole('link', { name: 'Manage account' }).click();
    console.log('Navigated to manage account');
  }

  async logout() {
    console.log('Starting logout process');
    await this.openAccountMenu();
    console.log('Clicking logout button');
    await this.logoutButton.click();
    // Wait for logout to complete and redirect to home page
    await this.page.waitForURL(URLS.HOME);
    console.log('Logout completed');
  }

  async goToSettings() {
    console.log('Navigating to settings page');
    await this.page.goto(URLS.SETTINGS);
    console.log('Settings page loaded');
  }

  async verifyUserEmail(email: string) {
    console.log('Verifying user email:', email);
    await this.goToSettings();
    console.log('Waiting for email input field');
    const emailInput = this.page.locator('#personalInfo > div:nth-child(6) > div > div.ant-col.ant-form-item-control.css-jaljq0 > div > div > input');
    await emailInput.waitFor({ state: 'attached' });
    const value = await emailInput.inputValue();
    console.log('Found email value:', value);
    expect(value).toBe(email);
    console.log('Email verification completed');
  }
}
