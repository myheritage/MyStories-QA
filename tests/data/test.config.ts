export const URLS = {
  HOME: process.env.HOME_URL || 'https://www.mystories.com',
  APP: process.env.APP_URL || 'https://app.mystories.com',
  LOGIN: process.env.LOGIN_URL || 'https://app.mystories.com/login'
};

export const TEST_USER_DEFAULTS = {
  PURCHASER: {  // For self-purchase and gift giver
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    country: 'United States',
    state: 'California',
    copies: 1
  },
  GIFT_RECIPIENT: {  // For gift recipient
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    country: 'United States',
    state: 'California',
    copies: 1,
    giftDate: undefined  // Will use today's date by default
  }
};

export const EMAIL_CONFIG = {
  SENDERS: {
    STORIES: 'stories@mystories.com',
    QUESTIONS: 'questions@stories.mystories.com'
  },
  SUBJECTS: {
    WELCOME: 'Welcome to MyStories',
    LOGIN: 'Log in to your MyStories account',
    GIFT_ACTIVATION: 'A special gift for {receiverFirstName}, from {giverFirstName}',
    GIFT_OPENED: 'Your gift was opened!',
    WEEKLY_QUESTION: '{firstName}, {question}'
  },
  TIMEOUTS: {
    DEFAULT_WAIT: 600000,    // 10 minutes
    POLL_INTERVAL: 30000,    // 30 seconds
    MAX_RETRIES: 10
  },
  LINK_PATTERNS: {
    BASE: 'https://e.customeriomail.com/',
    LOGIN: /https:\/\/e\.customeriomail\.com\/[^\s"']+/,
    ACTIVATION: /https:\/\/e\.customeriomail\.com\/[^\s"']+/,
    QUESTION: /https:\/\/e\.customeriomail\.com\/[^\s"']+/
  }
};
