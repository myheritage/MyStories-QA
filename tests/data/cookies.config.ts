export interface CookieConfig {
  name: string;
  domain: string;
  category: 'mandatory' | 'analytics' | 'advertising';
}

export const COOKIES: {
  MANDATORY: CookieConfig[];
  ANALYTICS: CookieConfig[];
  ADVERTISING: CookieConfig[];
} = {
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
  ANALYTICS: [
    { name: '_cio', domain: 'customer.io', category: 'analytics' },
    { name: '_cioanonid', domain: 'customer.io', category: 'analytics' },
    { name: 'cookiecookie', domain: 'app.mystories.com', category: 'analytics' }
  ],
  ADVERTISING: [
    { name: 'events/page.gif', domain: 'customer.io', category: 'advertising' },
    { name: '__anon_id', domain: 'app.mystories.com', category: 'advertising' },
    { name: '__anon_id', domain: 'app.mystories.com', category: 'advertising' }, // Duplicate as specified
    { name: 'mp_#_mixpanel', domain: 'app.mystories.com', category: 'advertising' },
    { name: 'mp_#_mixpanel', domain: 'mystories.com', category: 'advertising' }
  ]
};

export const getDenyCookies = (): CookieConfig[] => COOKIES.MANDATORY;

export const getAllowAllCookies = (): CookieConfig[] => [
  ...COOKIES.MANDATORY,
  ...COOKIES.ANALYTICS,
  ...COOKIES.ADVERTISING
];

/**
 * Helper function to check if a cookie matches a cookie config
 * Handles special cases like mixpanel cookies that have dynamic names
 */
export const cookieMatchesConfig = (cookie: { name: string; domain: string }, config: CookieConfig): boolean => {
  const domainMatches = cookie.domain.includes(config.domain);
  
  if (config.name === 'mp_#_mixpanel') {
    // Handle mixpanel cookies which have dynamic names but follow a pattern
    return domainMatches && cookie.name.startsWith('mp_') && cookie.name.endsWith('_mixpanel');
  }
  
  return domainMatches && cookie.name === config.name;
};
