import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { URLS } from '../data/test.config';

export class GiftActivationPage extends BasePage {
  // Locators
  protected readonly firstNameInput = this.page.locator('input[placeholder="First name"]');
  protected readonly lastNameInput = this.page.locator('input[placeholder="Last name"]');
  protected readonly emailInput = this.page.locator('input[type="email"]');
  protected readonly continueButton = this.page.getByRole('button', { name: 'Continue' });

  constructor(page: Page) {
    super(page);
  }

  async verifyPrefilledDetails(userDetails: {
    firstName: string;
    lastName: string;
    email: string;
  }) {
    console.log('Verifying prefilled details:', userDetails);
    await this.firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
    const firstName = await this.firstNameInput.inputValue();
    const lastName = await this.lastNameInput.inputValue();
    const email = await this.emailInput.inputValue();

    expect(firstName).toBe(userDetails.firstName);
    expect(lastName).toBe(userDetails.lastName);
    expect(email).toBe(userDetails.email);
  }

  async completeActivation() {
    console.log('Completing gift activation');
    await this.continueButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.continueButton.click();
    await this.page.waitForURL(URLS.APP, { waitUntil: 'load', timeout: 30000 });
  }
}
