/**
 * Test Configuration
 * 
 * This file contains core configuration for the test suite including:
 * - Application URLs for different environments
 * - Default test user data
 * - Email testing configuration
 * - Timeouts and retry settings
 */

/**
 * Application URLs for different environments
 * Can be overridden via environment variables
 * 
 * Note: HOME URL includes utm_campaign=test parameter to:
 * - Distinguish automated test traffic from real user traffic
 * - Prevent test flows from affecting production analytics
 * - Enable filtering of test sessions in analytics platforms
 */
export const URLS = {
  HOME: (process.env.HOME_URL || 'https://www.mystories.com') + '?utm_campaign=test',
  APP: process.env.APP_URL || 'https://app.mystories.com',
  LOGIN: process.env.LOGIN_URL || 'https://app.mystories.com/login',
  SETTINGS: process.env.SETTINGS_URL || 'https://app.mystories.com/settings'
};

/**
 * Expected page titles for validation
 * Used to verify correct page loading and navigation
 */
export const PAGE_TITLES = {
  HOME: 'MyStories - Capture and Treasure the Stories of Your Loved Ones'
};

/**
 * Default test user data
 * Used when hardcoded mode is enabled or as fallback data
 */
export const TEST_USER_DEFAULTS = {
  /**
   * Default purchaser profile
   * Used for both self-purchase flow and gift givers
   */
  PURCHASER: {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    country: 'United States',
    state: 'California',
    copies: 1
  },
  /**
   * Default gift recipient profile
   * Used when testing the gift flow
   */
  GIFT_RECIPIENT: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    country: 'United States',
    state: 'California',
    copies: 1,
    giftDate: undefined  // Will use today's date by default
  }
};

/**
 * Email testing configuration
 * Supports multiple testing modes: MailSlurp, fake, and hardcoded
 */
export const EMAIL_CONFIG = {
  /**
   * Expected email sender addresses
   * Used to verify correct email origin
   */
  SENDERS: {
    STORIES: 'stories@mystories.com',
    QUESTIONS: 'questions@stories.mystories.com'
  },

  /**
   * Backoffice Refund Email Configuration
   * 
   * IMPORTANT: This is for internal backoffice use only, not part of website testing.
   * When real cards are used in tests, we send transaction details to a dedicated
   * email to help the backoffice team process refunds. This ensures we have a record
   * of all test charges but is not part of the actual website validation.
   */
  REFUNDS: {
    MAILSLURP: {
      email: 'mystoris_refunds@mailslurp.biz',
      inboxId: 'fc15907d-5838-4ca0-81ab-321fad83dbfe'
    },
    TEMP_RECIPIENT: 'or.grushka@myeritage.com'  // Temporary until MailSlurp setup
  },
  /**
   * Expected email subject patterns
   * Supports placeholders for dynamic content
   */
  SUBJECTS: {
    WELCOME: 'Welcome to MyStories',
    LOGIN: 'Log in to your MyStories account',
    GIFT_RECEIVE: 'A special gift for {receiverFirstName}, from {giverFirstName}',  // Email sent to gift receiver
    GIFT_OPENED: 'Your gift was opened!',
    WEEKLY_QUESTION: '{firstName}, {question}'
  },
  /**
   * Email testing timeouts and retry settings
   * Adjusted for different testing environments
   */
  TIMEOUTS: {
    DEFAULT_WAIT: 600000,    // 10 minutes
    POLL_INTERVAL: 30000,    // 30 seconds
    MAX_RETRIES: 10
  },
  /**
   * Patterns for matching email links
   * Used to extract and validate URLs in emails
   */
  LINK_PATTERNS: {
    BASE: 'https://e.customeriomail.com/',
    LOGIN: /https:\/\/e\.customeriomail\.com\/[^\s"']+/,
    ACTIVATION: /https:\/\/e\.customeriomail\.com\/[^\s"']+/,
    QUESTION: /https:\/\/e\.customeriomail\.com\/[^\s"']+/
  }
};
