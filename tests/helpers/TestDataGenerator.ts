/**
 * Test Data Generator
 * 
 * Provides utilities for generating test data including:
 * - User profiles for different test scenarios
 * - Integration with email testing systems
 * - Support for both random and hardcoded data modes
 * 
 * This helper ensures consistent and reliable test data across the test suite
 */

import { EmailHandler } from './EmailHandler';
import { TEST_USER_DEFAULTS } from '../data/test.config';

/**
 * Interface defining the structure of a story teller's details
 * Used for both self-purchase and gift recipient flows
 */
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

/**
 * Interface defining the structure of a gift giver's details
 * Used specifically in the gift purchase flow
 */
export interface GiftGiverDetails {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state?: string;
  copies: number;
}

/**
 * Options for customizing test data generation
 * Controls data generation behavior and specific requirements
 */
interface GenerateOptions {
  useHardcoded?: boolean;  // If true, use fixed data from config. Default is false (use random)
  withState?: boolean;     // For random data: if true, use US/state
  isGiftRecipient?: boolean; // For hardcoded data: which defaults to use
  giftDate?: string;      // For gift orders: scheduled delivery date
}

/**
 * Extended options for creating test users with email capabilities
 * Includes all GenerateOptions plus gift flow specific options
 */
interface CreateTestUserOptions extends GenerateOptions {
  isGiftFlow?: boolean;
}

/**
 * Generates test data for various testing scenarios
 * 
 * Features:
 * - Random data generation with realistic values
 * - Support for hardcoded test data
 * - Email integration for communication testing
 * - Gift flow support with multiple user profiles
 */
export class TestDataGenerator {
  /**
   * Sample data for random generation
   * Used when hardcoded mode is disabled
   */
  private readonly firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma'];
  private readonly lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
  private readonly domains = ['test.com'];
  private readonly countries = ['United States', 'Canada', 'United Kingdom'];
  private readonly usStates = ['California', 'New York', 'Texas', 'Florida', 'Arizona'];

  /**
   * Selects a random element from an array
   * Used for generating random but realistic test data
   */
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generates a deterministic email address from name components
   * Ensures consistent email format for test users
   */
  private generateEmail(firstName: string, lastName: string): string {
    const domain = this.getRandomElement(this.domains);
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  }

  /**
   * Generates a timestamped gift message
   * Useful for tracking when test messages were created
   */
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

  /**
   * Generates story teller details for testing
   * Can use either random or hardcoded data based on options
   * 
   * @param options - Configuration for data generation
   * @returns Promise<StoryTellerDetails> - Generated user profile
   */
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
        copies: Math.floor(Math.random() * 3) + 1,  // Random 1-3 copies
        giftDate: options.giftDate
      };
    }

    // Use hardcoded data if requested
    const defaults = options.isGiftRecipient ? 
      TEST_USER_DEFAULTS.GIFT_RECIPIENT : 
      TEST_USER_DEFAULTS.PURCHASER;
    return { ...defaults };
  }

  /**
   * Generates gift giver details for testing
   * Supports both random and hardcoded data modes
   * 
   * @param options - Configuration for data generation
   * @returns Promise<GiftGiverDetails> - Generated gift giver profile
   */
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
   * Creates test users with email capabilities
   * 
   * Features:
   * - Integrates with MailSlurp for email testing
   * - Supports both single user and gift flow scenarios
   * - Automatically registers email inboxes
   * - Handles different email testing modes
   * 
   * @param emailHandler - Email testing utility instance
   * @param options - Configuration for user creation
   * @returns Promise with created user profile(s)
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
