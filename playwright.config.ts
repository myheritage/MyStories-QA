import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Configure test retries:
  // - Default: process.env.CI ? 2 : 0 (2 retries in CI, 0 in local)
  // - Override with environment variable: PLAYWRIGHT_RETRIES=N
  // - Example: PLAYWRIGHT_RETRIES=1 npm run test
  // - In GitHub Actions: env: { PLAYWRIGHT_RETRIES: 0 }
  retries: process.env.PLAYWRIGHT_RETRIES ? parseInt(process.env.PLAYWRIGHT_RETRIES) : (process.env.CI ? 2 : 0),
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: require.resolve('./tests/setup.ts'),
  timeout: 120000, // 2 minutes
  use: {
    baseURL: 'https://app.mystories.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        screenshot: {
          mode: 'on',
          fullPage: true
        }
      },
    },
    {
      name: 'Firefox',
      use: {
        ...devices['Desktop Firefox'],
        screenshot: {
          mode: 'on',
          fullPage: true
        }
      },
    },
    {
      name: 'Safari',
      use: {
        ...devices['Desktop Safari'],
        screenshot: {
          mode: 'on',
          fullPage: true
        }
      },
    },
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 12'],
        screenshot: {
          mode: 'on',
          fullPage: true
        }
      },
    },
    {
      name: 'android',
      use: {
        ...devices['Pixel 5'],
        screenshot: {
          mode: 'on',
          fullPage: true
        }
      },
    },
    {
      name: 'ipad',
      use: {
        ...devices['iPad Air'],
        screenshot: {
          mode: 'on',
          fullPage: true
        }
      },
    },
    {
      name: 'android-tablet',
      use: {
        ...devices['Galaxy Tab S4'],
        screenshot: {
          mode: 'on',
          fullPage: true
        }
      },
    },
  ],
});
