import { Page, TestInfo } from '@playwright/test';
import { VISUAL_CONFIG, VisualTestOptions } from '../data/visual.config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { compareImages } from './ImageComparisonUtil';
import { ReportGenerator } from './ReportGenerator';

/**
 * Helper class for visual regression testing
 * Uses ImageComparisonUtil for precise image comparison with detailed reporting
 */
export class VisualTestHelper {
  private readonly reportGenerator: ReportGenerator;

  constructor(private readonly config = VISUAL_CONFIG) {
    // Initialize report generator with visual testing directory
    const visualTestingDir = path.dirname(this.config.directories.baseline);
    this.reportGenerator = new ReportGenerator(visualTestingDir);
  }

  /**
   * Compare a page's current state with its baseline screenshot
   * @param page Playwright page object
   * @param options Test configuration options
   * @param testInfo Test information for attaching artifacts to report
   */
  async compareScreenshot(page: Page, options: VisualTestOptions, testInfo: TestInfo): Promise<void> {
    const { name, sensitivity = this.config.sensitivity } = options;
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000); // Give a moment for any post-load animations
    
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Generate timestamp for unique filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = `${name}-${timestamp}`;
    
    // Define file paths
    const actualPath = path.join(this.config.directories.actual, `${baseFileName}.png`);
    const baselinePath = path.join(this.config.directories.baseline, `${name}.png`);
    const diffPath = path.join(this.config.directories.diff, `${baseFileName}-diff.png`);
    
    // Take screenshot and save to actual directory
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
      scale: 'css'
    });
    await fs.writeFile(actualPath, screenshotBuffer);

    // If baseline doesn't exist, create it and fail the test
    if (!(await this.fileExists(baselinePath))) {
      console.log(`Creating baseline for ${name}`);
      await fs.writeFile(baselinePath, screenshotBuffer);
      throw new Error(`Baseline was missing for ${name} and has been created. Please verify the baseline and run the test again.`);
    }

    try {
      // Read baseline image for comparison
      const baselineBuffer = await fs.readFile(baselinePath);
      
      // Compare images and get result
      const { mismatchedPixels, diffImage } = await compareImages(
        baselineBuffer,
        screenshotBuffer,
        sensitivity
      );

      // Generate HTML report with all images
      const reportPath = await this.reportGenerator.generateReport(
        {
          name,
          timestamp: new Date().toISOString(),
          browser: testInfo.project.name,
          viewport: await page.viewportSize() || { width: 1280, height: 720 },
          url: page.url()
        },
        {
          baseline: baselinePath,
          actual: actualPath,
          diff: mismatchedPixels > 0 ? diffPath : undefined
        }
      );

      // Only attach the HTML report to test results
      await testInfo.attach('Visual Test Report', {
        path: reportPath,
        contentType: 'text/html'
      });

      if (mismatchedPixels > 0) {
        // Save diff image if there are differences
        if (diffImage) {
          await fs.writeFile(diffPath, diffImage);
        }
        throw new Error(`Visual comparison failed for ${name}: ${mismatchedPixels} pixels differed. See report at: ${reportPath}`);
      }

      console.log(`Visual test passed for ${name}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error during visual comparison: ${error}`);
    }
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = Object.values(this.config.directories);
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
