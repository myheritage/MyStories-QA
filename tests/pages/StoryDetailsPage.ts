import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface StoryTellerDetails {
  firstName: string;
  lastName: string;
  email: string;
  giftDate?: string;
  message?: string;
}

export interface GiftGiverDetails {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state?: string;
  copies: number;
}

export class StoryDetailsPage extends BasePage {
  // Story teller form locators
  private readonly storytellerFirstName = this.page.getByLabel('Storyteller first name');
  private readonly storytellerLastName = this.page.getByLabel('Storyteller last name');
  private readonly storytellerEmail = this.page.getByLabel('Storyteller email');
  private readonly giftDate = this.page.getByLabel('Gift date');
  private readonly giftMessage = this.page.getByLabel('Gift message');
  private readonly continueButton = this.page.getByRole('button', { name: 'Continue' });

  // Gift giver form locators
  private readonly formTitle = this.page.getByText('Your details');
  private readonly giverFirstName = this.page.getByRole('textbox', { name: 'First name' });
  private readonly giverLastName = this.page.getByRole('textbox', { name: 'Last name' });
  private readonly giverEmail = this.page.getByRole('textbox', { name: 'example@example.com' });
  private readonly countryDropdown = this.page.locator('.row > .ant-form-item > .ant-row > div:nth-child(2) > .ant-form-item-control-input > .ant-form-item-control-input-content > .ant-select > .ant-select-selector > .ant-select-selection-wrap > .ant-select-selection-item');
  private readonly stateDropdown = this.page.locator('div:nth-child(2) > .ant-row > div:nth-child(2) > .ant-form-item-control-input > .ant-form-item-control-input-content > .ant-select > .ant-select-selector > .ant-select-selection-wrap > .ant-select-selection-item');
  private readonly subscriptionAcknowledgment = this.page.getByRole('checkbox', { name: 'I acknowledge that this is a' });
  private readonly checkoutButton = this.page.getByRole('button', { name: /Continue to checkout/i });

  constructor(page: Page) {
    super(page);
  }

  private async selectCopies(copies: number) {
    if (copies < 1 || copies > 11) {
      throw new Error('Number of copies must be between 1 and 11');
    }

    if (copies > 1) {
      console.log('Opening copies dropdown');
      await this.page.locator('#yourDetailsStep').getByTitle('1 book (included in your').click();
      
      console.log(`Selecting ${copies} copies`);
      await this.page.getByText(`${copies} books (1 included +`).click();
      
      // No need for the third click, it was causing issues
      console.log('Copies selected successfully');
    }
  }

  async fillStoryTellerDetails(details: StoryTellerDetails) {
    // Wait for form to be ready
    await this.page.waitForLoadState('networkidle');
    await this.storytellerFirstName.waitFor({ state: 'visible', timeout: 10000 });

    await this.storytellerFirstName.fill(details.firstName);
    await this.storytellerLastName.fill(details.lastName);
    await this.storytellerEmail.fill(details.email);

    if (details.giftDate) {
      await this.giftDate.fill(details.giftDate);
    }

    if (details.message) {
      await this.giftMessage.fill(details.message);
    }

    await this.continueButton.click();
  }

  async fillGiftGiverDetails(details: GiftGiverDetails) {
    // Wait for form to be ready
    await this.page.waitForLoadState('networkidle');

    // Select number of copies first
    console.log(`Selecting ${details.copies} copies`);
    await this.selectCopies(details.copies);

    // Fill personal details
    await this.giverFirstName.fill(details.firstName);
    await this.giverLastName.fill(details.lastName);
    await this.giverEmail.fill(details.email);

    // Select country
    await this.countryDropdown.click();
    await this.page.keyboard.type(details.country);
    await this.page.keyboard.press('Enter');

    // Handle state selection if US
    if (details.country === 'United States') {
      await this.stateDropdown.click();
      if (details.state) {
        await this.page.getByTitle(details.state).click();
        
        // Check if state requires subscription acknowledgment
        const requiresAcknowledgment = ['California', 'New York'].includes(details.state);
        if (requiresAcknowledgment) {
          await this.subscriptionAcknowledgment.check();
        }
      }
    }

    await this.checkoutButton.click();
  }

  async isStoryTellerPage(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return await this.storytellerFirstName.isVisible();
  }

  async isGiftGiverPage(): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return await this.formTitle.isVisible();
  }
}
