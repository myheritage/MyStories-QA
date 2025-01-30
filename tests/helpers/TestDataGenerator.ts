import { EmailHandler } from './EmailHandler';
import { TEST_USER_DEFAULTS } from '../data/test.config';

export interface StoryTellerDetails {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state?: string;
  copies: number;
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

interface GenerateOptions {
  useHardcoded?: boolean;  // If true, use fixed data from config. Default is false (use random)
  withState?: boolean;     // For random data: if true, use US/state
  isGiftRecipient?: boolean; // For hardcoded data: which defaults to use
}

interface CreateTestUserOptions extends GenerateOptions {
  isGiftFlow?: boolean;
}

export class TestDataGenerator {
  private readonly firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma'];
  private readonly lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
  private readonly domains = ['example.com', 'test.com', 'demo.com', 'testtest.com', 'testtesttest.com', 'testtesttesttest.com'];
  private readonly countries = ['United States', 'Canada', 'United Kingdom'];
  private readonly usStates = ['California', 'New York', 'Texas', 'Florida', 'Arizona'];

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateEmail(firstName: string, lastName: string): string {
    const domain = this.getRandomElement(this.domains);
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  }

  private generateGiftMessage(): string {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return `This is an automated test message created at ${timestamp}. I wanted to give you something special - a chance to share your amazing life stories. Looking forward to reading them!`;
  }

  async generateStoryTeller(options: GenerateOptions = {}): Promise<StoryTellerDetails> {
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    
    // By default, generate random data
    if (!options.useHardcoded) {
      return {
        firstName,
        lastName,
        email: this.generateEmail(firstName, lastName),
        country: options.withState ? 'United States' : this.getRandomElement(this.countries),
        state: options.withState ? this.getRandomElement(this.usStates) : undefined,
        copies: Math.floor(Math.random() * 3) + 1  // Random 1-3 copies
      };
    }

    // Use hardcoded data if requested
    const defaults = options.isGiftRecipient ? 
      TEST_USER_DEFAULTS.GIFT_RECIPIENT : 
      TEST_USER_DEFAULTS.PURCHASER;
    return { ...defaults };
  }

  async generateGiftGiver(options: GenerateOptions = {}): Promise<GiftGiverDetails> {
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    
    // By default, generate random data
    if (!options.useHardcoded) {
      return {
        firstName,
        lastName,
        email: this.generateEmail(firstName, lastName),
        country: options.withState ? 'United States' : this.getRandomElement(this.countries),
        state: options.withState ? this.getRandomElement(this.usStates) : undefined,
        copies: Math.floor(Math.random() * 3) + 1  // Random 1-3 copies
      };
    }

    // Use hardcoded data if requested
    return { ...TEST_USER_DEFAULTS.PURCHASER };
  }

  /**
   * Creates test user(s) with MailSlurp inboxes
   * - For regular flow: Returns storyteller with MailSlurp email
   * - For gift flow: Returns both storyteller and gift giver with MailSlurp emails
   */
  async createTestUser(emailHandler: EmailHandler, options: CreateTestUserOptions = {}): Promise<{
    storyteller: StoryTellerDetails;
    giftGiver?: GiftGiverDetails;
  }> {
    if (options.isGiftFlow) {
      // Create gift flow users
      const giftGiver = await this.generateGiftGiver(options);
      const storyteller = await this.generateStoryTeller({
        ...options,
        isGiftRecipient: true
      });

      // Create MailSlurp inboxes
      const storytellerEmail = await emailHandler.createMailSlurpInbox();
      const giftGiverEmail = await emailHandler.createMailSlurpInbox();

      // Register inboxes
      await emailHandler.registerInbox(storytellerEmail, true);
      await emailHandler.registerInbox(giftGiverEmail);

      // Update emails and set gift giver name
      storyteller.email = storytellerEmail;
      giftGiver.email = giftGiverEmail;
      storyteller.giftGiverName = giftGiver.firstName;

      return { storyteller, giftGiver };
    } else {
      // Create single user
      const storyteller = await this.generateStoryTeller(options);
      
      // Create and register MailSlurp inbox
      const email = await emailHandler.createMailSlurpInbox();
      await emailHandler.registerInbox(email);
      storyteller.email = email;

      return { storyteller };
    }
  }
}
