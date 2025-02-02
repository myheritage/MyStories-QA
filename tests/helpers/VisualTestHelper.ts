import { Page, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { VISUAL_CONFIG, VisualTestOptions } from '../data/visual.config';

/**
 * Helper class for visual regression testing
 * Handles screenshot comparison, baseline management, and test reporting
 */
export class VisualTestHelper {
  private readonly baselineDir: string;
  private readonly actualDir: string;
  private readonly diffDir: string;

  constructor(private readonly config = VISUAL_CONFIG) {
    this.baselineDir = path.join(process.cwd(), config.baselineDir);
    this.actualDir = path.join(process.cwd(), 'test-results/visual/actual');
    this.diffDir = path.join(process.cwd(), 'test-results/visual/diff');
  }

  /**
   * Compare a page's current state with its baseline screenshot
   * @param page Playwright page object
   * @param options Test configuration options
   * @returns Promise resolving to comparison result
   */
  async compareScreenshot(page: Page, options: VisualTestOptions): Promise<ComparisonResult> {
    const { name, sensitivity = this.config.sensitivity } = options;
    
    // Ensure directories exist
    await this.ensureDirectories();

    // Generate file paths
    const baselinePath = path.join(this.baselineDir, `${name}.png`);
    const actualPath = path.join(this.actualDir, `${name}.png`);
    const diffPath = path.join(this.diffDir, `${name}.png`);

    // Take new screenshot
    await page.screenshot({
      path: actualPath,
      fullPage: true,
      animations: 'disabled',  // Prevent animation frames from affecting comparison
      scale: 'css'            // Use CSS pixels for consistent sizing
    });

    // Check if baseline exists
    const hasBaseline = await this.fileExists(baselinePath);
    
    // Handle missing baseline
    if (!hasBaseline) {
      if (this.config.forceNewBaseline) {
        await fs.copyFile(actualPath, baselinePath);
        return {
          matches: true,
          baselinePath,
          actualPath,
          message: 'Created new baseline'
        };
      }
      throw new Error(
        `No baseline found for "${name}". Run with FORCE_BASELINE=true to create one.`
      );
    }

    // Compare images
    const result = await this.compareImages(baselinePath, actualPath, diffPath, sensitivity);
    
    return {
      ...result,
      baselinePath,
      actualPath,
      diffPath
    };
  }

  /**
   * Compare two images and generate a diff if they don't match
   * @param baselinePath Path to baseline image
   * @param actualPath Path to actual image
   * @param diffPath Path to save diff image
   * @param sensitivity Threshold for pixel differences
   */
  private async compareImages(
    baselinePath: string,
    actualPath: string,
    diffPath: string,
    sensitivity: number
  ): Promise<{ matches: boolean; diffRatio: number; message?: string }> {
    // Use Playwright's built-in screenshot comparison
    try {
      const actualBuffer = await fs.readFile(actualPath);
      const baselineBuffer = await fs.readFile(baselinePath);
      
      await expect(actualBuffer.toString('base64')).toMatchSnapshot(baselineBuffer.toString('base64'), {
        threshold: sensitivity,
        maxDiffPixelRatio: sensitivity
      });

      return {
        matches: true,
        diffRatio: 0,
        message: 'Images match'
      };
    } catch (error) {
      // Generate visual diff using Playwright's comparison
      const comparison = await this.generateDiff(baselinePath, actualPath, diffPath);
      
      return {
        matches: false,
        diffRatio: comparison.diffRatio,
        message: `Images differ by ${(comparison.diffRatio * 100).toFixed(2)}% of pixels`
      };
    }
  }

  /**
   * Generate a visual diff between two images
   * @param baselinePath Path to baseline image
   * @param actualPath Path to actual image
   * @param diffPath Path to save diff image
   */
  private async generateDiff(
    baselinePath: string,
    actualPath: string,
    diffPath: string
  ): Promise<{ diffRatio: number }> {
    // Use Playwright's comparison utilities to generate diff
    try {
      const actualBuffer = await fs.readFile(actualPath);
      const baselineBuffer = await fs.readFile(baselinePath);
      
      await expect(actualBuffer.toString('base64')).toMatchSnapshot(baselineBuffer.toString('base64'), {
        threshold: 0,  // Use exact comparison for diff generation
        maxDiffPixels: 0,
        maxDiffPixelRatio: 0
      });
      
      return { diffRatio: 0 };
    } catch (error: unknown) {
      const diffRatio = error instanceof Error && 'diffRatio' in error 
        ? (error as { diffRatio: number }).diffRatio 
        : 1;
      
      // If error contains diff image data, save it
      if (error instanceof Error && 'diff' in error) {
        const diffBuffer = (error as { diff: Buffer }).diff;
        await fs.writeFile(diffPath, diffBuffer);
      }
      
      return { diffRatio };
    }
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.actualDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Interface for screenshot comparison results
 */
interface ComparisonResult {
  matches: boolean;
  diffRatio?: number;
  message?: string;
  baselinePath: string;
  actualPath: string;
  diffPath?: string;
}
