import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openAccountMenu() {
    await this.page.getByRole('button', { name: 'Account menu' }).click();
  }

  async goToManageAccount() {
    await this.openAccountMenu();
    await this.page.getByRole('link', { name: 'Manage account' }).click();
  }

  async logout() {
    await this.openAccountMenu();
    await this.page.getByRole('link', { name: 'Log out' }).click();
  }

  async verifyUserEmail(email: string) {
    await this.goToManageAccount();
    const emailText = await this.page.getByText(email.substring(0, 20)).textContent();
    expect(emailText).toBeDefined();
    expect(emailText!.startsWith(email.substring(0, 20))).toBeTruthy();
  }
}
