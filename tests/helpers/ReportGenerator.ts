import * as fs from 'fs/promises';
import * as path from 'path';

interface ReportMetadata {
  name: string;
  timestamp: string;
  browser: string;
  viewport: { width: number; height: number };
  url?: string;
}

/**
 * Generates HTML reports for visual test results
 */
export class ReportGenerator {
  private readonly reportsDir: string;
  private readonly reportTemplate: string;

  constructor(visualTestingDir: string) {
    this.reportsDir = path.join(visualTestingDir, 'reports');
    this.reportTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Visual Test Report - {{name}}</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: #f5f5f5;
              }
              
              .report-container {
                  background: white;
                  border-radius: 8px;
                  padding: 20px;
                  margin-bottom: 30px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }

              h1, h2 {
                  color: #333;
              }

              .side-by-side {
                  display: flex;
                  gap: 20px;
                  overflow-x: auto;
              }

              .image-box {
                  flex: 1;
                  min-width: 300px;
                  background: #f8f8f8;
                  padding: 10px;
                  border-radius: 4px;
              }

              .image-box img {
                  width: 100%;
                  height: auto;
                  border: 1px solid #ddd;
              }

              .metadata {
                  font-size: 14px;
                  color: #666;
                  margin-top: 10px;
              }
          </style>
      </head>
      <body>
          <div class="report-container">
              <h1>Visual Test Report - {{name}}</h1>
              <div class="metadata">
                  Test run: {{timestamp}}<br>
                  Browser: {{browser}}<br>
                  Viewport: {{viewport.width}}x{{viewport.height}}<br>
                  {{#url}}URL: {{url}}{{/url}}
              </div>
              
              <div class="side-by-side">
                  <div class="image-box">
                      <h2>Baseline</h2>
                      <img src="{{baselineRelativePath}}" alt="Baseline" />
                  </div>
                  <div class="image-box">
                      <h2>Actual</h2>
                      <img src="{{actualRelativePath}}" alt="Actual" />
                  </div>
                  {{#hasDiff}}
                  <div class="image-box">
                      <h2>Differences</h2>
                      <img src="{{diffRelativePath}}" alt="Diff" />
                  </div>
                  {{/hasDiff}}
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate an HTML report for a visual test
   * @param metadata Test metadata
   * @param paths Paths to test images
   * @returns Path to the generated report
   */
  async generateReport(
    metadata: ReportMetadata,
    paths: {
      baseline: string;
      actual: string;
      diff?: string;
    }
  ): Promise<string> {
    // Ensure reports directory exists
    await fs.mkdir(this.reportsDir, { recursive: true });

    // Generate report filename
    const timestamp = metadata.timestamp.replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportsDir, `${metadata.name}-${timestamp}.html`);

    // Convert to file:// URLs for reliable image loading
    const toFileUrl = (imagePath: string) => {
      const absolutePath = path.resolve(imagePath);
      return `file://${absolutePath}`;
    };

    // Replace template placeholders
    let report = this.reportTemplate
      .replace(/{{name}}/g, metadata.name)
      .replace(/{{timestamp}}/g, metadata.timestamp)
      .replace(/{{browser}}/g, metadata.browser)
      .replace(/{{viewport.width}}/g, metadata.viewport.width.toString())
      .replace(/{{viewport.height}}/g, metadata.viewport.height.toString())
      .replace(/{{baselineRelativePath}}/g, toFileUrl(paths.baseline))
      .replace(/{{actualRelativePath}}/g, toFileUrl(paths.actual));

    // Handle optional fields
    if (metadata.url) {
      report = report.replace(/{{#url}}(.*?){{\/url}}/s, `$1`);
      report = report.replace(/{{url}}/g, metadata.url);
    } else {
      report = report.replace(/{{#url}}.*?{{\/url}}/s, '');
    }

    if (paths.diff) {
      report = report.replace(/{{#hasDiff}}(.*?){{\/hasDiff}}/s, `$1`);
      report = report.replace(/{{diffRelativePath}}/g, toFileUrl(paths.diff));
    } else {
      report = report.replace(/{{#hasDiff}}.*?{{\/hasDiff}}/s, '');
    }

    // Write report to file
    await fs.writeFile(reportPath, report);

    return reportPath;
  }
}
