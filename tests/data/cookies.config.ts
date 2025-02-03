/**
 * Cookie Management Configuration
 * 
 * This file defines the cookie configuration for the application, including:
 * - Cookie categories (mandatory, analytics, advertising)
 * - Domain-specific cookie settings
 * - Helper functions for cookie management
 * 
 * Compliant with GDPR and ePrivacy requirements for cookie consent
 */

/**
 * Interface defining the structure of a cookie configuration
 * Used for type safety and documentation
 */
export interface CookieConfig {
  name: string;
  domain: string;
  category: 'mandatory' | 'analytics' | 'advertising';
}

/**
 * Complete cookie configuration organized by category
 * Each cookie includes name, domain, and category information
 */
export const COOKIES: {
  MANDATORY: CookieConfig[];
  ANALYTICS: CookieConfig[];
  ADVERTISING: CookieConfig[];
} = {
  /**
   * Essential cookies required for basic site functionality
   * These cookies are exempt from consent requirements
   */
  MANDATORY: [
    { name: 'CookieConsent', domain: 'app.mystories.com', category: 'mandatory' },
    { name: 'CookieConsent', domain: 'www.mystories.com', category: 'mandatory' },
    { name: '1.gif', domain: 'cookiebot.com', category: 'mandatory' },
    { name: 'fedops.logger.sessionId', domain: 'wix.com', category: 'mandatory' },
    { name: 'bSession', domain: 'wix.com', category: 'mandatory' },
    { name: 'sentryReplaySession', domain: 'app.mystories.com', category: 'mandatory' },
    { name: '__mp_opt_in_out_', domain: 'mystories.com', category: 'mandatory' },
    { name: 'hs', domain: 'www.mystories.com', category: 'mandatory' },
    { name: 'ssr-caching', domain: 'www.mystories.com', category: 'mandatory' },
    { name: 'svSession', domain: 'www.mystories.com', category: 'mandatory' },
    { name: 'XSRF-TOKEN', domain: 'www.mystories.com', category: 'mandatory' }
  ],
  /**
   * Analytics cookies for tracking user behavior
   * Require explicit user consent under GDPR
   */
  ANALYTICS: [
    { name: '_cio', domain: 'customer.io', category: 'analytics' },
    { name: '_cioanonid', domain: 'customer.io', category: 'analytics' },
    { name: 'cookiecookie', domain: 'app.mystories.com', category: 'analytics' }
  ],
  /**
   * Marketing and advertising cookies
   * Require explicit user consent and can be rejected
   */
  ADVERTISING: [
    { name: 'events/page.gif', domain: 'customer.io', category: 'advertising' },
    { name: '__anon_id', domain: 'app.mystories.com', category: 'advertising' },
    { name: '__anon_id', domain: 'app.mystories.com', category: 'advertising' }, // Duplicate as specified
    { name: 'mp_#_mixpanel', domain: 'app.mystories.com', category: 'advertising' },
    { name: 'mp_#_mixpanel', domain: 'mystories.com', category: 'advertising' }
  ]
};

/**
 * Returns the list of cookies to set when user denies consent
 * Only includes mandatory cookies required for site functionality
 */
export const getDenyCookies = (): CookieConfig[] => COOKIES.MANDATORY;

/**
 * Returns the complete list of cookies when user allows all
 * Includes mandatory, analytics, and advertising cookies
 */
export const getAllowAllCookies = (): CookieConfig[] => [
  ...COOKIES.MANDATORY,
  ...COOKIES.ANALYTICS,
  ...COOKIES.ADVERTISING
];

/**
 * Validates if a cookie matches a configuration
 * 
 * @param cookie - The cookie object to validate
 * @param config - The configuration to check against
 * @returns boolean indicating if the cookie matches the config
 * 
 * Special handling for:
 * - Dynamic cookie names (e.g., mixpanel)
 * - Domain matching with subdomains
 * - Pattern-based cookie names
 */
export const cookieMatchesConfig = (cookie: { name: string; domain: string }, config: CookieConfig): boolean => {
  const domainMatches = cookie.domain.includes(config.domain);
  
  if (config.name === 'mp_#_mixpanel') {
    // Handle mixpanel cookies which have dynamic names but follow a pattern
    return domainMatches && cookie.name.startsWith('mp_') && cookie.name.endsWith('_mixpanel');
  }
  
  return domainMatches && cookie.name === config.name;
};
