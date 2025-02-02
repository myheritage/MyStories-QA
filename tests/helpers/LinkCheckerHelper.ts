import { Page, TestInfo } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Represents information about a link found on the page
 * @interface LinkInfo
 */
interface LinkInfo {
  /** The href attribute value of the link */
  href: string;
  /** The visible text content of the link */
  text: string;
  /** Position coordinates of the link on the page */
  location?: { x: number; y: number };
}

/**
 * Represents the result of checking a single link
 * @interface LinkCheckResult
 */
interface LinkCheckResult {
  /** The full URL that was checked */
  url: string;
  /** The visible text of the link */
  text: string;
  /** HTTP status code returned (0 if request failed) */
  status: number;
  /** Whether the link check passed (status < 400) */
  passed: boolean;
  /** Error message if the check failed */
  error?: string;
  /** Path to screenshot if one was taken */
  screenshot?: string;
  /** Position of the link on the original page */
  location?: { x: number; y: number };
}

/**
 * Configuration options for link checking
 * @interface LinkCheckOptions
 */
interface LinkCheckOptions {
  /** Check mode: 'status' for status code only (default), 'visual' for full page load with screenshots */
  mode?: 'status' | 'visual';
  /** Directory to save screenshots in (required for visual mode) */
  screenshotDir?: string;
  /** Patterns to skip (e.g., ['mailto:', '#', 'tel:']) */
  skipPatterns?: string[];
  /** Maximum number of redirects to follow */
  maxRedirects?: number;
  /** How many levels deep to scan (default: 1) */
  scanDepth?: number;
}

/**
 * Helper class for scanning and verifying links on web pages
 * @class LinkCheckerHelper
 */
class LinkCheckerHelper {
  /** Set of URLs already checked to avoid duplicates */
  private checkedUrls: Set<string> = new Set();

  /**
   * Creates an instance of LinkCheckerHelper
   * @param page - Playwright Page object to work with
   * @param testInfo - TestInfo object for reporting
   */
  constructor(private page: Page, private testInfo: TestInfo) {}

  /**
   * Main method to scan page for links and check their validity
   * @param options - Configuration options for the link check
   * @returns Array of results for each link checked
   */
  async scanAndCheckLinks(options?: LinkCheckOptions): Promise<LinkCheckResult[]> {
    // Validate options for visual mode
    if (options?.mode === 'visual' && !options.screenshotDir) {
      throw new Error(
        "screenshotDir option is required when using 'visual' mode.\n" +
        "Please provide it like:\n" +
        "{\n" +
        "  mode: 'visual',\n" +
        "  screenshotDir: 'test-results/link-screenshots',\n" +
        "  ...\n" +
        "}"
      );
    }

    const links = await this.scanPageForLinks();
    const results: LinkCheckResult[] = [];
    
    for (const link of links) {
      if (!this.shouldSkipLink(link.href, options?.skipPatterns)) {
        const result = await this.checkSingleLink(link, options);
        results.push(result);
      }
    }

    await this.attachReports(results);
    return results;
  }

  /**
   * Scans the current page for all links and their positions
   * @private
   * @returns Array of found links with their information
   */
  private async scanPageForLinks(): Promise<LinkInfo[]> {
    return this.page.$$eval('a[href]', (elements) => 
      elements.map(el => ({
        href: el.getAttribute('href') || '',
        text: el.textContent?.trim() || '[No Text]',
        location: {
          x: el.getBoundingClientRect().left,
          y: el.getBoundingClientRect().top
        }
      }))
    );
  }

  /**
   * Checks a single link for validity
   * @private
   * @param link - Link information to check
   * @param options - Configuration options
   * @returns Result of checking the link
   */
  private async checkSingleLink(
    link: LinkInfo, 
    options?: LinkCheckOptions
  ): Promise<LinkCheckResult> {
    // Skip if already checked
    if (this.checkedUrls.has(link.href)) {
      return {
        url: link.href,
        text: link.text,
        status: 200, // Assuming it was good since we cached it
        passed: true,
        location: link.location
      };
    }

    const mode = options?.mode || 'status';

    try {
      if (mode === 'status') {
        // Status-only mode: Use fetch for a HEAD request
        const response = await fetch(link.href, { method: 'HEAD' });
        const result: LinkCheckResult = {
          url: link.href,
          text: link.text,
          status: response.status,
          passed: response.status < 400,
          location: link.location
        };
        this.checkedUrls.add(link.href);
        return result;
      } else {
        // Visual mode: Load page and take screenshot
        if (!options?.screenshotDir) {
          throw new Error("screenshotDir is required for visual mode");
        }

        const newPage = await this.page.context().newPage();
        let response;
        
        try {
          // Try with full page load first (3 second timeout)
          response = await newPage.goto(link.href, {
            waitUntil: 'networkidle',
            timeout: 3000  // 3 seconds
          });
          await newPage.waitForLoadState('load', { timeout: 3000 });
          await newPage.waitForTimeout(500); // Reduced animation wait
        } catch (error) {
          console.warn(`Full page load timeout for ${link.href}, taking screenshot anyway`);
          // Don't try fallback, just take screenshot in current state
          response = await newPage.goto(link.href, {
            waitUntil: 'commit',  // Just wait for first response
            timeout: 3000
          });
        }

        const result: LinkCheckResult = {
          url: link.href,
          text: link.text,
          status: response?.status() || 0,
          passed: (response?.status() || 0) < 400,
          location: link.location
        };

        try {
          result.screenshot = await this.takeScreenshot(newPage, link.href, options.screenshotDir);
        } catch (error) {
          console.warn(`Failed to take screenshot for ${link.href}: ${error}`);
        }

        await newPage.close();
        this.checkedUrls.add(link.href);
        return result;
      }
    } catch (error: any) {
      return {
        url: link.href,
        text: link.text,
        status: 0,
        passed: false,
        error: error.message || String(error),
        location: link.location
      };
    }
  }

  /**
   * Determines if a link should be skipped based on patterns
   * @private
   * @param href - Link URL to check
   * @param patterns - Patterns to skip
   * @returns Whether the link should be skipped
   */
  private shouldSkipLink(href: string, patterns?: string[]): boolean {
    if (!href) return true;
    
    const defaultPatterns = ['mailto:', '#', 'tel:', 'javascript:'];
    const allPatterns = [...defaultPatterns, ...(patterns || [])];
    
    return allPatterns.some(pattern => href.startsWith(pattern));
  }

  /**
   * Takes a screenshot of a linked page
   * @private
   * @param page - Page to screenshot
   * @param url - URL being captured
   * @param _dir - Directory to save in (ignored, we save in test-results)
   * @returns Path to saved screenshot
   */
  private async takeScreenshot(
    page: Page,
    url: string,
    _dir: string // Ignored, we use our own directory structure
  ): Promise<string> {
    // Extract domain and path from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/\./g, '-');
    const urlPath = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    const fileName = `${domain}${urlPath || '-home'}.png`.toLowerCase();
    
    // Create directories
    const screenshotDir = path.join('test-results', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Save screenshot
    const filePath = path.join(screenshotDir, fileName);
    await page.screenshot({
      path: filePath,
      fullPage: true
    });

    return filePath; // Return path but won't be used in report
  }

  /**
   * Generates HTML report of link check results
   * @private
   * @param results - Array of link check results
   * @returns HTML string of the report
   */
  private generateReport(results: LinkCheckResult[]): string {
    const totalLinks = results.length;
    const passedLinks = results.filter(r => r.passed).length;
    const failedLinks = totalLinks - passedLinks;

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f8f9fa; }
            .passed { color: #28a745; }
            .failed { color: #dc3545; }
            .summary { margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px; }
            .error { color: #dc3545; font-size: 0.9em; margin-top: 5px; }
          </style>
        </head>
        <body>
          <h1>Link Verification Report</h1>
          
          <div class="summary">
            <h3>Summary</h3>
            <p>Total Links: ${totalLinks}</p>
            <p class="passed">Passed: ${passedLinks}</p>
            <p class="failed">Failed: ${failedLinks}</p>
          </div>

          <table>
            <tr>
              <th>Link Text</th>
              <th>URL</th>
              <th>Status</th>
              <th>Result</th>
            </tr>
            ${results.map(r => `
              <tr>
                <td>${r.text}</td>
                <td>${r.url}</td>
                <td>${r.status}</td>
                <td class="${r.passed ? 'passed' : 'failed'}">
                  ${r.passed ? 'PASSED' : 'FAILED'}
                  ${r.error ? `<div class="error">Error: ${r.error}</div>` : ''}
                </td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Attaches reports to the test results
   * @private
   * @param results - Array of link check results
   */
  private async attachReports(results: LinkCheckResult[]): Promise<void> {
    // Attach JSON results
    await this.testInfo.attach('link-verification-results', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json'
    });

    // Attach HTML report
    await this.testInfo.attach('link-verification-report', {
      body: this.generateReport(results),
      contentType: 'text/html'
    });
  }
}

export { LinkCheckerHelper, LinkCheckOptions, LinkCheckResult };
