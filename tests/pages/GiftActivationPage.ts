import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { URLS } from '../data/test.config';

export class GiftActivationPage extends BasePage {
  // Locators
  protected readonly firstNameInput = this.page.locator('#root > div > div.layout-content > div > div > div > div > div:nth-child(2) > div > div.ant-row.css-jaljq0 > div:nth-child(1) > div > div > div.ant-col.ant-form-item-control.css-jaljq0 > div > div > input');
  protected readonly lastNameInput = this.page.locator('#root > div > div.layout-content > div > div > div > div > div:nth-child(2) > div > div.ant-row.css-jaljq0 > div:nth-child(2) > div > div > div.ant-col.ant-form-item-control.css-jaljq0 > div > div > input');
  protected readonly emailInput = this.page.locator('#root > div > div.layout-content > div > div > div > div > div:nth-child(2) > div > div.ant-form-item.css-jaljq0 > div > div.ant-col.ant-form-item-control.css-jaljq0 > div > div > input');
  protected readonly continueButton = this.page.locator('#root > div > div.layout-content > div > div > div > div > div:nth-child(3) > div > button > span');

  constructor(page: Page) {
    super(page);
  }

  async verifyPrefilledDetails(userDetails: {
    firstName: string;
    lastName: string;
    email: string;
  }) {
    console.log('Verifying prefilled details:', userDetails);
    await this.firstNameInput.waitFor();
    const firstName = await this.firstNameInput.inputValue();
    const lastName = await this.lastNameInput.inputValue();
    const email = await this.emailInput.inputValue();
    
    expect(firstName).toBe(userDetails.firstName);
    expect(lastName).toBe(userDetails.lastName);
    expect(email).toBe(userDetails.email);
  }

  async completeActivation() {
    console.log('Completing gift activation');
    await this.continueButton.click();
    await this.page.waitForURL(URLS.APP);
  }
}
