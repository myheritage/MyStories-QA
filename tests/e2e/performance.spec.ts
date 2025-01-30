import { test, expect, CDPSession } from '@playwright/test';
import { URLS } from '../data/test.config';
import { PerformanceReporter } from '../helpers/PerformanceReporter';

interface PerformanceMetrics {
  Timestamp: number;
  Documents: number;
  Frames: number;
  JSEventListeners: number;
  Nodes: number;
  LayoutCount: number;
  RecalcStyleCount: number;
  LayoutDuration: number;
  RecalcStyleDuration: number;
  ScriptDuration: number;
  TaskDuration: number;
  JSHeapUsedSize: number;
  JSHeapTotalSize: number;
}

interface ResourceMetric {
  name: string;
  duration: number;
  transferSize: number;
}

test.describe('Performance Tests', () => {
  test('Home page performance audit', async ({ page }, testInfo) => {
    const reporter = new PerformanceReporter();
    console.log('Starting performance audit for home page...');
    
    // Create CDP session and enable domains
    const client: CDPSession = await page.context().newCDPSession(page);
    await Promise.all([
      client.send('Performance.enable'),
      client.send('Network.enable')
    ]);

    // Configure network conditions to simulate real-world scenario
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 40, // 40ms
      downloadThroughput: (10 * 1024 * 1024) / 8, // 10 Mbps
      uploadThroughput: (1 * 1024 * 1024) / 8, // 1 Mbps
    });

    // Set moderate CPU throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    // Start metrics collection
    await client.send('Performance.getMetrics');

    // Monitor network activity
    const requestCount = { count: 0, failed: 0 };
    page.on('request', () => requestCount.count++);
    page.on('requestfailed', () => requestCount.failed++);

    // Navigate to the page with improved error handling
    let response;
    try {
      console.log('Starting navigation to homepage...');
      response = await page.goto(URLS.HOME, {
        waitUntil: 'load',
        timeout: 30000 // 30 seconds
      });

      if (!response) {
        throw new Error('Navigation returned null response');
      }

      if (!response.ok()) {
        throw new Error(`Navigation failed with status ${response.status()}: ${response.statusText()}`);
      }

      console.log(`Navigation completed successfully:`);
      console.log(`- Status: ${response.status()} ${response.statusText()}`);
      console.log(`- Total requests: ${requestCount.count}`);
      console.log(`- Failed requests: ${requestCount.failed}`);

    } catch (error) {
      console.error('Navigation error:', error);
      console.log('Network statistics at time of failure:');
      console.log(`- Total requests: ${requestCount.count}`);
      console.log(`- Failed requests: ${requestCount.failed}`);
      throw error;
    }

    // Collect performance metrics
    const performanceMetrics = await client.send('Performance.getMetrics');
    const loadMetrics = await page.evaluate(() => ({
      navigationStart: performance.timing.navigationStart,
      loadEventEnd: performance.timing.loadEventEnd,
      domContentLoaded: performance.timing.domContentLoadedEventEnd,
      firstPaint: performance.getEntriesByType('paint')
        .find(entry => entry.name === 'first-paint')?.startTime,
      firstContentfulPaint: performance.getEntriesByType('paint')
        .find(entry => entry.name === 'first-contentful-paint')?.startTime,
      largestContentfulPaint: performance.getEntriesByType('largest-contentful-paint')
        .pop()?.startTime,
    }));

    // Get layout shift metrics
    const layoutShiftMetrics = await page.evaluate(() => {
      let cumulativeLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            // Type assertion for LayoutShift entry
            const layoutShift = entry as any;
            cumulativeLayoutShift += layoutShift.value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });
      return { cumulativeLayoutShift };
    });

    // Convert CDP metrics to a more usable format
    const metrics = performanceMetrics.metrics.reduce<Partial<PerformanceMetrics>>((acc, metric) => {
      acc[metric.name as keyof PerformanceMetrics] = metric.value;
      return acc;
    }, {});

    // Update timing metrics
    reporter.updateTiming({
      firstPaint: loadMetrics.firstPaint || 0,
      firstContentfulPaint: loadMetrics.firstContentfulPaint || 0,
      largestContentfulPaint: loadMetrics.largestContentfulPaint || 0,
      domContentLoaded: loadMetrics.domContentLoaded - loadMetrics.navigationStart,
      loadComplete: loadMetrics.loadEventEnd - loadMetrics.navigationStart
    });

    // Update browser metrics
    reporter.updateBrowserMetrics({
      scriptDuration: metrics.ScriptDuration || 0,
      layoutCount: metrics.LayoutCount || 0,
      taskDuration: metrics.TaskDuration ? metrics.TaskDuration * 1000 : 0,
      layoutShift: layoutShiftMetrics.cumulativeLayoutShift
    });

    // Update memory metrics
    reporter.updateMemoryMetrics(
      (metrics.JSHeapUsedSize || 0) / 1024 / 1024,
      (metrics.JSHeapTotalSize || 0) / 1024 / 1024
    );

    // Get resource timing data
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: (entry as PerformanceResourceTiming).transferSize
      }));
    }) as ResourceMetric[];

    // Update resource metrics
    const totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    reporter.updateResourceMetrics(
      resources.length,
      totalTransferSize / 1024 / 1024
    );

    // Generate report and check for failures
    const { hasFailed } = await reporter.generateReport(testInfo);
    expect(hasFailed, 'Some performance metrics did not meet the thresholds').toBe(false);

    // Cleanup
    await client.detach();
  });

  test('Home page load time metrics', async ({ page }, testInfo) => {
    const reporter = new PerformanceReporter();
    console.log('Measuring page load metrics...');

    // Monitor network activity
    const requestCount = { count: 0, failed: 0 };
    page.on('request', () => requestCount.count++);
    page.on('requestfailed', () => requestCount.failed++);

    const startTime = Date.now();

    // Navigate to homepage with improved error handling
    let response;
    try {
      console.log('Starting navigation to homepage...');
      response = await page.goto(URLS.HOME, {
        waitUntil: 'load',
        timeout: 30000 // 30 seconds
      });

      if (!response) {
        throw new Error('Navigation returned null response');
      }

      if (!response.ok()) {
        throw new Error(`Navigation failed with status ${response.status()}: ${response.statusText()}`);
      }

      console.log(`Navigation completed successfully:`);
      console.log(`- Status: ${response.status()} ${response.statusText()}`);
      console.log(`- Total requests: ${requestCount.count}`);
      console.log(`- Failed requests: ${requestCount.failed}`);

    } catch (error) {
      console.error('Navigation error:', error);
      console.log('Network statistics at time of failure:');
      console.log(`- Total requests: ${requestCount.count}`);
      console.log(`- Failed requests: ${requestCount.failed}`);
      throw error;
    }

    // Get navigation timing metrics
    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        navigationStart: navigation.startTime,
        responseStart: navigation.responseStart,
        responseEnd: navigation.responseEnd,
        domContentLoaded: navigation.domContentLoadedEventEnd,
        loadComplete: navigation.loadEventEnd,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime
      };
    });

    // Calculate metrics
    const loadTime = Date.now() - startTime;
    const ttfp = timing.firstPaint || 0;
    const ttfcp = timing.firstContentfulPaint || 0;
    const ttdcl = timing.domContentLoaded;
    const ttl = timing.loadComplete;

    // Update timing metrics
    reporter.updateTiming({
      firstPaint: ttfp,
      firstContentfulPaint: ttfcp,
      domContentLoaded: ttdcl,
      loadComplete: ttl
    });

    // Get resource timing data
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: (entry as PerformanceResourceTiming).transferSize
      }));
    }) as ResourceMetric[];

    // Update resource metrics
    const totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    reporter.updateResourceMetrics(
      resources.length,
      totalTransferSize / 1024 / 1024
    );

    // Generate report and check for failures
    const { hasFailed } = await reporter.generateReport(testInfo);
    expect(hasFailed, 'Some performance metrics did not meet the thresholds').toBe(false);
  });
});
