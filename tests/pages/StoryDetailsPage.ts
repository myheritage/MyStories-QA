import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { STATES_REQUIRING_ACKNOWLEDGMENT } from '../data/prices.config';

export interface StoryTellerDetails {
  firstName: string;
  lastName: string;
  email: string;
  giftDate?: string;
  message?: string;
  giftGiverName?: string;
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
  // Story teller form locators (Gift flow)
  private readonly storytellerFirstName = this.page.getByRole('textbox', { name: 'First name' });
  private readonly storytellerLastName = this.page.getByRole('textbox', { name: 'Last name' });
  private readonly storytellerEmail = this.page.getByRole('textbox', { name: 'example@example.com' });
  private readonly giftDate = this.page.getByRole('textbox', { name: 'Pick a date' });
  private readonly giftGiverName = this.page.getByRole('textbox', { name: 'Write your name' });
  private readonly giftMessage = this.page.getByText('I wanted to give you');
  private readonly continueButton = this.page.getByRole('button', { name: 'Continue' });

  // Your details form locators (both flows)
  private readonly formTitle = this.page.getByRole('heading', { name: 'Your details' });
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
      
      console.log('Copies selected successfully');
    }
  }

  async fillStoryTellerDetails(details: StoryTellerDetails) {
    // Wait for form to be ready
    await this.page.waitForLoadState('networkidle');
    await this.storytellerFirstName.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Filling storyteller details:', details);
    await this.storytellerFirstName.fill(details.firstName);
    await this.storytellerLastName.fill(details.lastName);
    await this.storytellerEmail.fill(details.email);

    if (details.giftDate) {
      console.log('Setting gift date:', details.giftDate);
      await this.giftDate.fill(details.giftDate);
    }

    if (details.giftGiverName) {
      console.log('Adding gift giver name:', details.giftGiverName);
      await this.giftGiverName.fill(details.giftGiverName);
    }

    if (details.message) {
      console.log('Adding gift message');
      await this.giftMessage.fill(details.message);
    }

    await this.continueButton.click();
    console.log('Submitted storyteller details');
  }

  private async trySelectState(state: string, maxAttempts = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt} to select state: ${state}`);
        
        // Close dropdown if it's open (for retry attempts)
        if (attempt > 1) {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
        }
        
        // Open dropdown
        await this.stateDropdown.click();
        await this.page.waitForTimeout(500);
        
        // Try to find and click the state
        const stateOption = this.page.getByText(state, { exact: true });
        if (await stateOption.isVisible()) {
          await stateOption.click();
          console.log(`Successfully selected state: ${state}`);
          return true;
        }
        
        // If state not found, try scrolling through all states
        console.log('State not immediately visible, scrolling through list...');
        await this.page.keyboard.press('Home'); // Start from the top
        
        // Try scrolling down until we find the state or reach the end
        for (let scroll = 0; scroll < 50; scroll++) {
          if (await stateOption.isVisible()) {
            await stateOption.click();
            console.log(`Successfully selected state: ${state} after ${scroll} scrolls`);
            return true;
          }
          await this.page.keyboard.press('ArrowDown');
          await this.page.waitForTimeout(100);
        }
        
        console.log(`State ${state} not found in attempt ${attempt}`);
      } catch (error) {
        console.error(`Error selecting state in attempt ${attempt}:`, error);
        if (attempt === maxAttempts) throw error;
      }
    }
    return false;
  }

  async fillGiftGiverDetails(details: GiftGiverDetails, isGiftOrder = false) {
    // Wait for form to be ready
    await this.page.waitForLoadState('networkidle');

    // Select number of copies first
    console.log(`Selecting ${details.copies} copies`);
    await this.selectCopies(details.copies);

    // Fill personal details
    console.log('Filling gift giver details:', details);
    await this.giverFirstName.fill(details.firstName);
    await this.giverLastName.fill(details.lastName);
    await this.giverEmail.fill(details.email);

    // Select country
    console.log('Selecting country:', details.country);
    await this.countryDropdown.click();
    await this.page.keyboard.type(details.country);
    await this.page.keyboard.press('Enter');

    // Handle state selection if US
    if (details.country === 'United States') {
      console.log('US selected, handling state selection');
      if (details.state) {
        const stateSelected = await this.trySelectState(details.state);
        if (!stateSelected) {
          throw new Error(`Failed to select state: ${details.state}`);
        }
        
        // Check if state requires subscription acknowledgment (only for self orders)
        if (!isGiftOrder && STATES_REQUIRING_ACKNOWLEDGMENT.includes(details.state)) {
          console.log(`State ${details.state} requires acknowledgment, checking box`);
          await this.subscriptionAcknowledgment.check();
        }
      }
    }

    await this.checkoutButton.click();
    console.log('Submitted gift giver details');
  }

  async isStoryTellerPage(): Promise<boolean> {
    try {
      await this.page.waitForLoadState('networkidle');
      const isVisible = await this.storytellerFirstName.isVisible();
      console.log('Story teller page visibility:', isVisible);
      return isVisible;
    } catch (error) {
      console.error('Error checking story teller page:', error);
      return false;
    }
  }

  async isGiftGiverPage(): Promise<boolean> {
    try {
      await this.page.waitForLoadState('networkidle');
      const isVisible = await this.formTitle.isVisible();
      console.log('Gift giver page visibility:', isVisible);
      return isVisible;
    } catch (error) {
      console.error('Error checking gift giver page:', error);
      return false;
    }
  }
}
