import { Page } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ScreenshotHelper {
  /**
   * Takes a full page screenshot, creating directories if they don't exist
   */
  static async takeFullPageScreenshot(page: Page, name: string) {
    const screenshotDir = 'test-results/screenshots';
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const fileName = `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    const filePath = path.join(screenshotDir, fileName);
    
    await page.screenshot({
      path: filePath,
      fullPage: true
    });
    
    return filePath;
  }

  /**
   * Saves PDF content to the test results directory
   */
  static async savePdfToResults(pdfBuffer: Buffer, name: string) {
    const pdfDir = 'test-results/pdfs';
    await fs.mkdir(pdfDir, { recursive: true });
    
    const fileName = `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    const filePath = path.join(pdfDir, fileName);
    
    await fs.writeFile(filePath, pdfBuffer);
    
    return filePath;
  }

  /**
   * Takes a screenshot of a PDF page and saves both the screenshot and PDF
   */
  static async capturePdfPage(page: Page, name: string) {
    // Wait for PDF to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional wait for rendering
    
    // Take screenshot
    const screenshotPath = await this.takeFullPageScreenshot(page, `${name}-pdf`);
    
    // Get and save PDF content if URL indicates it's a PDF
    if (page.url().includes('.pdf')) {
      try {
        const pdfBuffer = await page.pdf();
        const pdfPath = await this.savePdfToResults(pdfBuffer, name);
        return { screenshotPath, pdfPath };
      } catch (error) {
        console.log('Could not save PDF content:', error);
        return { screenshotPath };
      }
    }
    
    return { screenshotPath };
  }
}
