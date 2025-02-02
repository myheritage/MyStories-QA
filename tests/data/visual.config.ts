/**
 * Configuration for visual regression testing
 * Controls which pages and emails are included in visual tests
 * and defines global settings for screenshot comparison
 */
export const VISUAL_CONFIG = {
  // Directory where baseline screenshots are stored
  // These serve as the "expected" state for visual comparison
  baselineDir: 'visual-baselines',

  // Threshold for pixel difference (0-1)
  // - 0: Requires exact pixel match
  // - 0.2: Allows for slight variations (default)
  // - 1: Ignores all differences
  sensitivity: 0.2,

  // Force creation of new baseline screenshots
  // Set via environment variable: FORCE_BASELINE=true
  // Useful when intentionally updating the expected visual state
  forceNewBaseline: process.env.FORCE_BASELINE === 'true',

  /**
   * Pages to include in visual testing
   * Set individual pages to true/false to control which are tested
   * Pages are grouped by their function in the application
   */
  pages: {
    // Core pages available to all users
    home: false,                    // Main landing page
    login: false,                   // Email-based login page
    questions: false,               // Weekly questions dashboard
    storyDetails: false,            // Individual story view/edit
    settings: false,                // User account settings

    // Self-purchase flow pages
    // User buying MyStories for themselves
    orderTypeSelf: false,           // "I will write my own stories"
    orderDetailsSelf: false,        // Personal details entry
    paymentSelf: false,            // Payment for self-purchase
    orderSuccessSelf: false,       // Self-purchase confirmation

    // Gift purchase flow pages
    // User buying MyStories as a gift for someone else
    orderTypeGift: false,           // "Someone else will write stories"
    recipientDetails: false,        // Gift recipient information
    giftGiverDetails: false,        // Gift purchaser information
    paymentGift: false,            // Payment for gift purchase
    orderSuccessGift: false,       // Gift purchase confirmation
    giftActivation: false,         // Recipient's gift setup page
  },

  /**
   * Emails to include in visual testing
   * Set individual emails to true/false to control which are tested
   * Tests the rendered HTML content of each email type
   */
  emails: {
    welcome: false,                 // New user welcome email
    login: false,                   // Magic link for passwordless login
    giftActivation: false,          // Instructions for gift recipients
    giftOpened: false,             // Notification to gift giver
    weeklyQuestion: false,          // Weekly story prompt email
  }
};

/**
 * Interface defining the structure of visual test options
 * Used by the VisualTestHelper class for type safety
 */
export interface VisualTestOptions {
  // Name of the page/email being tested
  // Used for screenshot filenames and error messages
  name: string;

  // Optional custom sensitivity for this specific test
  // Overrides the global sensitivity setting
  sensitivity?: number;

  // Additional metadata about the test
  // Useful for debugging and documentation
  metadata?: {
    description?: string;
    url?: string;
    viewport?: { width: number; height: number };
  };
}
