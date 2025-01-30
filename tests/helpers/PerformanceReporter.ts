import { writeFileSync } from 'fs';
import { join } from 'path';
import { PERFORMANCE_THRESHOLDS, MOBILE_PERFORMANCE_THRESHOLDS } from '../data/performance.config';

interface PerformanceMetric {
  name: string;
  value: number;
  limit?: number;
  unit: string;
  description?: string;
  improvement?: string;
}

interface PerformanceReport {
  timing: {
    firstPaint: PerformanceMetric;
    firstContentfulPaint: PerformanceMetric;
    largestContentfulPaint: PerformanceMetric;
    domContentLoaded: PerformanceMetric;
    loadComplete: PerformanceMetric;
  };
  browser: {
    scriptDuration: PerformanceMetric;
    layoutCount: PerformanceMetric;
    taskDuration: PerformanceMetric;
    layoutShift: PerformanceMetric;
  };
  memory: {
    heapUsed: PerformanceMetric;
    heapTotal: PerformanceMetric;
  };
  resources: {
    count: PerformanceMetric;
    totalSize: PerformanceMetric;
  };
  thresholds: {
    passed: PerformanceMetric[];
    failed: PerformanceMetric[];
  };
}

export class PerformanceReporter {
  private report: PerformanceReport;

  constructor(isMobile = false) {
    const config = isMobile ? MOBILE_PERFORMANCE_THRESHOLDS : PERFORMANCE_THRESHOLDS;
    
    this.report = {
      timing: {
        firstPaint: { name: 'First Paint', value: 0, ...config.timing.firstPaint },
        firstContentfulPaint: { name: 'First Contentful Paint', value: 0, ...config.timing.firstContentfulPaint },
        largestContentfulPaint: { name: 'Largest Contentful Paint', value: 0, ...config.timing.largestContentfulPaint },
        domContentLoaded: { name: 'DOM Content Loaded', value: 0, ...config.timing.domContentLoaded },
        loadComplete: { name: 'Load Complete', value: 0, ...config.timing.loadComplete }
      },
      browser: {
        scriptDuration: { name: 'Script Duration', value: 0, ...config.browser.scriptDuration },
        layoutCount: { name: 'Layout Count', value: 0, ...config.browser.layoutCount },
        taskDuration: { name: 'Total Blocking Time', value: 0, ...config.browser.taskDuration },
        layoutShift: { name: 'Cumulative Layout Shift', value: 0, ...config.browser.layoutShift }
      },
      memory: {
        heapUsed: { name: 'JS Heap Used', value: 0, ...config.memory.heapUsed },
        heapTotal: { name: 'JS Heap Total', value: 0, ...config.memory.heapTotal }
      },
      resources: {
        count: { name: 'Resource Count', value: 0, ...config.resources.count },
        totalSize: { name: 'Total Transfer Size', value: 0, ...config.resources.totalSize }
      },
      thresholds: {
        passed: [],
        failed: []
      }
    };
  }

  updateTiming(metrics: Record<string, number>) {
    Object.entries(metrics).forEach(([key, value]) => {
      if (key in this.report.timing) {
        this.report.timing[key as keyof typeof this.report.timing].value = value;
      }
    });
  }

  updateBrowserMetrics(metrics: Record<string, number>) {
    Object.entries(metrics).forEach(([key, value]) => {
      if (key in this.report.browser) {
        this.report.browser[key as keyof typeof this.report.browser].value = value;
      }
    });
  }

  updateMemoryMetrics(heapUsed: number, heapTotal: number) {
    this.report.memory.heapUsed.value = heapUsed;
    this.report.memory.heapTotal.value = heapTotal;
  }

  updateResourceMetrics(count: number, totalSize: number) {
    this.report.resources.count.value = count;
    this.report.resources.totalSize.value = totalSize;
  }

  validateThresholds() {
    const allMetrics = [
      ...Object.values(this.report.timing),
      ...Object.values(this.report.browser),
      ...Object.values(this.report.memory),
      ...Object.values(this.report.resources)
    ];

    allMetrics.forEach(metric => {
      if (metric.limit !== undefined) {
        if (metric.value <= metric.limit) {
          this.report.thresholds.passed.push(metric);
        } else {
          this.report.thresholds.failed.push(metric);
        }
      }
    });
  }

  private generateHtml(): string {
    const formatValue = (metric: PerformanceMetric) => {
      return `${metric.value.toFixed(2)}${metric.unit}`;
    };

    const createMetricRow = (metric: PerformanceMetric, hasThreshold = false) => {
      const threshold = hasThreshold ? `/ ${metric.limit}${metric.unit}` : '';
      const percentage = hasThreshold ? 
        ` (${((metric.value / (metric.limit || 1)) * 100).toFixed(1)}%)` : '';
      
      let status = '';
      if (hasThreshold) {
        const ratio = metric.value / (metric.limit || 1);
        if (ratio <= 0.8) status = 'good';
        else if (ratio <= 1.0) status = 'warning';
        else status = 'failed';
      }

      const improvement = metric.improvement ? 
        `<div class="improvement">${metric.improvement}</div>` : '';
      
      return `
        <tr class="${status}">
          <td>${metric.name}</td>
          <td>
            <span class="metric-value">${formatValue(metric)}</span>
            <span class="threshold">${threshold}</span>
            <span class="percentage">${percentage}</span>
            ${improvement}
          </td>
        </tr>
      `;
    };

    const getOverallStatus = () => {
      if (this.report.thresholds.failed.length > 0) return 'failed';
      const hasWarnings = this.report.thresholds.passed.some(m => 
        (m.value / (m.limit || 1)) > 0.8
      );
      return hasWarnings ? 'warning' : 'good';
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Performance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            .good { color: #28a745; }
            .warning { color: #ffc107; }
            .failed { color: #dc3545; }
            .summary { 
              margin: 20px 0; 
              padding: 15px;
              border-radius: 4px;
            }
            .summary.good { background-color: #d4edda; }
            .summary.warning { background-color: #fff3cd; }
            .summary.failed { background-color: #f8d7da; }
            h2 { color: #333; margin-top: 30px; }
            .metric-value { font-weight: bold; }
            .threshold { color: #666; margin-left: 8px; }
            .percentage { font-style: italic; margin-left: 8px; }
            .improvement { 
              margin-top: 4px;
              font-size: 0.9em;
              color: #666;
              font-style: italic;
              display: none;
            }
            tr:hover .improvement {
              display: block;
            }
          </style>
        </head>
        <body>
          <h1>Performance Test Results</h1>
          
          <div class="summary ${getOverallStatus()}">
            <h3>Performance Summary</h3>
            <p>Passed Thresholds: ${this.report.thresholds.passed.length}</p>
            <p>Failed Thresholds: ${this.report.thresholds.failed.length}</p>
            <p>Overall Status: ${
              this.report.thresholds.failed.length > 0 ? 'Failed' :
              this.report.thresholds.passed.some(m => m.value / (m.limit || 1) > 0.8) ? 'Warning' : 'Good'
            }</p>
          </div>

          <h2>Timing Metrics</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            ${Object.values(this.report.timing).map(m => createMetricRow(m, true)).join('')}
          </table>

          <h2>Browser Metrics</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            ${Object.values(this.report.browser).map(m => createMetricRow(m, true)).join('')}
          </table>

          <h2>Memory Usage</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            ${Object.values(this.report.memory).map(m => createMetricRow(m, true)).join('')}
          </table>

          <h2>Resource Statistics</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            ${Object.values(this.report.resources).map(m => createMetricRow(m, true)).join('')}
          </table>

          <h2>Threshold Results</h2>
          <h3>Passed Thresholds</h3>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            ${this.report.thresholds.passed.map(m => createMetricRow(m, true)).join('')}
          </table>

          <h3>Failed Thresholds</h3>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            ${this.report.thresholds.failed.map(m => createMetricRow(m, true)).join('')}
          </table>
        </body>
      </html>
    `;
  }

  async generateReport(testInfo: { title: string; attach: Function }) {
    this.validateThresholds();
    
    // Generate HTML report
    const htmlReport = this.generateHtml();
    
    // Attach HTML report
    await testInfo.attach('performance-report.html', {
      body: Buffer.from(htmlReport),
      contentType: 'text/html'
    });

    // Attach metrics as JSON
    await testInfo.attach('performance-metrics.json', {
      body: Buffer.from(JSON.stringify(this.report, null, 2)),
      contentType: 'application/json'
    });

    // Log summary to console
    console.log('\nPerformance Test Summary:');
    console.log(`Passed Thresholds: ${this.report.thresholds.passed.length}`);
    console.log(`Failed Thresholds: ${this.report.thresholds.failed.length}`);
    
    return {
      metrics: this.report,
      hasFailed: this.report.thresholds.failed.length > 0
    };
  }
}
