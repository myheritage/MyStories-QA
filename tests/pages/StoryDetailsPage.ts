import { Page, Locator } from '@playwright/test';
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
  private readonly giftGiverName = this.page.getByPlaceholder('Write your name');
  private readonly giftMessage = this.page.getByText('I wanted to give you');
  private readonly continueButton = this.page.getByRole('button', { name: 'Continue' });
  private readonly genderDropdown = this.page.locator('text=Gender >> xpath=.. >> xpath=following-sibling::div//div[contains(@class, "ant-select-selector")]')


  // Your details form locators (both flows)
  private readonly formTitle = this.page.getByRole('heading', { name: 'Your details' });
  private readonly giverFirstName = this.page.getByRole('textbox', { name: 'First name' });
  private readonly giverLastName = this.page.getByRole('textbox', { name: 'Last name' });
  private readonly giverEmail = this.page.getByRole('textbox', { name: 'example@example.com' });
  private readonly countryDropdown = this.page.locator('text=Country >> xpath=.. >> xpath=following-sibling::div//div[contains(@class, "ant-select-selector")]');
  private readonly stateDropdown = this.page.locator('#yourDetailsStep > div > div:nth-child(2) > div > div:nth-child(4) > div > div.ant-form-item.state-form-item.css-jaljq0 > div > div.ant-col.ant-form-item-control.css-jaljq0 > div > div > div > div > span > span.ant-select-selection-item');
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
      const dropdown = this.page.locator('#yourDetailsStep').getByTitle('1 book (included in your');
      await dropdown.scrollIntoViewIfNeeded(); // Ensure the dropdown is visible
      await dropdown.click();
      console.log(`Selecting ${copies} copies`);
      const option = this.page.getByText(`${copies} books (1 included +`);
      await option.scrollIntoViewIfNeeded(); // Ensure the option is visible
      await option.click({ force: true });
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
    await this.genderDropdown.click();
    await this.page.keyboard.press('Enter');
    await this.storytellerEmail.fill(details.email);

    if (details.giftDate) {
      console.log('Setting gift date:', details.giftDate);
      await this.giftDate.fill(details.giftDate);
    }

    if (details.giftGiverName) {
      console.log('Adding gift giver name:', details.giftGiverName);
      await this.giftGiverName.fill(details.giftGiverName);
    } else {
      // Gift giver name is required
      console.log('Adding default gift giver name');
      await this.giftGiverName.fill('From ' + details.firstName);
    }

    if (details.message) {
      console.log('Adding gift message');
      await this.giftMessage.fill(details.message);
    }

    // Wait for button to be enabled
    await this.page.waitForTimeout(1000); // Wait for form validation
    const isDisabled = await this.continueButton.getAttribute('disabled');
    if (isDisabled) {
      throw new Error('Continue button is still disabled after filling all required fields');
    }
    await this.continueButton.click();
    console.log('Submitted storyteller details');
  }

  private async selectState(state: string, maxScrolls = 50): Promise<boolean> {
    console.log(`Selecting state: ${state}`);
    await this.stateDropdown.click();
    await this.page.waitForTimeout(500);

    // Start from top
    await this.page.keyboard.press('Home');

    // Scroll until we find the state
    for (let scroll = 0; scroll < maxScrolls; scroll++) {
      const option = this.page.getByText(state, { exact: true }).first();
      if (await option.isVisible()) {
        await option.click();
        console.log(`Found and selected state: ${state}`);
        return true;
      }
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(100);
    }
    
    console.log(`Failed to find state: ${state}`);
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
    await this.genderDropdown.click();
    await this.page.keyboard.press('Enter');

    // Select country
    console.log('Selecting country:', details.country);
    await this.countryDropdown.first().click();
    await this.page.keyboard.type(details.country);
    await this.page.keyboard.press('Enter');

    // Handle state selection if US
    if (details.country === 'United States') {
      console.log('US selected, checking state field visibility');
      const isStateVisible = await this.stateDropdown.isVisible();
      
      if (isStateVisible) {
        console.log('State field is visible');
        if (details.state) {
          console.log(`Attempting to select state: ${details.state}`);
          const stateSelected = await this.selectState(details.state);
          
          if (stateSelected) {
            console.log(`State ${details.state} selected successfully`);
            // Check if state requires subscription acknowledgment (only for self orders)
            if (!isGiftOrder && STATES_REQUIRING_ACKNOWLEDGMENT.includes(details.state)) {
              console.log(`State ${details.state} requires acknowledgment, checking box`);
              await this.subscriptionAcknowledgment.check();
            }
          } else {
            throw new Error(`Failed to select state: ${details.state}`);
          }
        } else {
          throw new Error('State is required when state field is visible for US orders');
        }
      } else {
        console.log('State field is not visible, continuing without state selection');
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
