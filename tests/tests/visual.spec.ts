import { test, expect } from '@playwright/test';
import { VisualTestHelper } from '../helpers/VisualTestHelper';
import { HomePage } from '../pages/HomePage';
import { CookieConsentOption } from '../pages/BasePage';


// URLs to visually test
const urlConfig: { [key: string]: { enabled: boolean; navigate: (page: any) => Promise<void> } } = {
  HOME: { 
    enabled: true, 
    navigate: async (page) => {
      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.handleCookieConsent(CookieConsentOption.ALLOW_ALL);
    }
  }
  // Add more URLs here as needed
};

// Extract active keys for testing
const activePages = Object.keys(urlConfig).filter((key) => urlConfig[key].enabled);

if (activePages.length === 0) {
  console.warn('No pages enabled for visual testing. Skipping suite.');
}

test.describe('Visual Regression Tests', {
  tag: ['@Full', '@Visual', '@Sanity']
}, () => {
  const visualHelper = new VisualTestHelper();

  activePages.forEach((pageName) => {
    test(`Visual test for ${pageName}`, async ({ page }, testInfo) => {
      const { navigate } = urlConfig[pageName];
      await navigate(page);
      
      await visualHelper.compareScreenshot(page, {
        name: pageName.toLowerCase(),
        metadata: {
          description: `Visual test for ${pageName}`,
          url: page.url()
        }
      }, testInfo);
    });
  });
});
