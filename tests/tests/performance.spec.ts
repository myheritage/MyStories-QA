import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { URLS } from '../data/test.config'; // Adjust the import path as needed
import puppeteer from 'puppeteer';

const thresholds = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 90
};

test('Lighthouse audit', async ({}, testInfo) => {
  // Use the HOME URL from test.config.ts
  const url = URLS.HOME;

  // Dynamically import Lighthouse
  const { default: lighthouse } = await import('lighthouse');

  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
  });

  // Get the port for Lighthouse
  const wsEndpoint = browser.wsEndpoint();
  const port = Number(new URL(wsEndpoint).port); // Convert port to number

  // Run Lighthouse audit
  const result = await lighthouse(url, {
    port,
    output: 'html', // Generate an HTML report
    logLevel: 'info',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });

  // Ensure the result is defined
  if (!result) {
    throw new Error('Lighthouse audit failed to produce a result.');
  }

  const { lhr, report } = result;

  // Save the Lighthouse HTML report to disk
  const reportPath = path.join(process.cwd(), 'lighthouse-report.html');
  if (typeof report === 'string') {
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`Lighthouse report saved to: ${reportPath}`);
  }

  // Attach the Lighthouse HTML report to the Playwright report
  testInfo.attachments.push({
    name: 'lighthouse-report',
    path: reportPath,
    contentType: 'text/html',
  });

  // Extract scores from the audit results (scores are between 0 and 1)
  const categories = lhr.categories;
  const performanceScore = Math.round((categories.performance.score || 0) * 100);
  const accessibilityScore = Math.round((categories.accessibility.score || 0) * 100);
  const bestPracticesScore = Math.round((categories['best-practices'].score || 0) * 100);
  const seoScore = Math.round((categories.seo.score || 0) * 100);

  console.log(`Lighthouse scores:
    Performance: ${performanceScore},
    Accessibility: ${accessibilityScore},
    Best Practices: ${bestPracticesScore},
    SEO: ${seoScore}
  `);

  // Assert that each metric meets or exceeds its threshold
  expect(performanceScore).toBeGreaterThanOrEqual(thresholds.performance);
  expect(accessibilityScore).toBeGreaterThanOrEqual(thresholds.accessibility);
  expect(bestPracticesScore).toBeGreaterThanOrEqual(thresholds['best-practices']);
  expect(seoScore).toBeGreaterThanOrEqual(thresholds.seo);

  // Close the Puppeteer browser
  await browser.close();
});