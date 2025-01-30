/**
 * Performance Thresholds Configuration
 * 
 * This file defines the performance thresholds for various metrics tracked in our application.
 * Each threshold represents the maximum acceptable value for that metric.
 * Values are based on industry standards and Web Vitals guidelines.
 */

interface ThresholdConfig {
  limit: number;
  unit: string;
  description: string;
  improvement?: string;
}

interface PerformanceThresholds {
  timing: {
    firstPaint: ThresholdConfig;
    firstContentfulPaint: ThresholdConfig;
    largestContentfulPaint: ThresholdConfig;
    domContentLoaded: ThresholdConfig;
    loadComplete: ThresholdConfig;
  };
  browser: {
    scriptDuration: ThresholdConfig;
    layoutCount: ThresholdConfig;
    taskDuration: ThresholdConfig;
    layoutShift: ThresholdConfig;
  };
  memory: {
    heapUsed: ThresholdConfig;
    heapTotal: ThresholdConfig;
  };
  resources: {
    count: ThresholdConfig;
    totalSize: ThresholdConfig;
  };
}

export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  timing: {
    firstPaint: {
      limit: 1800,
      unit: 'ms',
      description: 'Time until the browser renders any visual change. Critical for initial user perception.',
      improvement: 'Optimize critical rendering path, reduce render-blocking resources, use preload for critical assets.'
    },
    firstContentfulPaint: {
      limit: 2000,
      unit: 'ms',
      description: 'Time until the first text/image is painted. Key metric for perceived performance.',
      improvement: 'Minimize critical CSS, defer non-essential resources, optimize server response time.'
    },
    largestContentfulPaint: {
      limit: 2500,
      unit: 'ms',
      description: 'Time until the main content is visible. Core Web Vital for load performance.',
      improvement: 'Optimize and preload hero images, improve server response time, use content delivery networks.'
    },
    domContentLoaded: {
      limit: 2500,
      unit: 'ms',
      description: 'Time until the initial HTML is loaded and parsed. Indicates page readiness.',
      improvement: 'Minimize document size, defer JavaScript, reduce server response time.'
    },
    loadComplete: {
      limit: 3000,
      unit: 'ms',
      description: 'Time until all initial resources are loaded. Full page load metric.',
      improvement: 'Optimize images, lazy load non-critical resources, implement code splitting.'
    }
  },
  browser: {
    scriptDuration: {
      limit: 1.0,
      unit: 's',
      description: 'Total time spent executing JavaScript. Impacts interactivity and CPU usage.',
      improvement: 'Optimize JavaScript execution, use web workers for heavy computations, implement code splitting.'
    },
    layoutCount: {
      limit: 30,
      unit: '',
      description: 'Number of times the page layout was recalculated. Affects performance and smoothness.',
      improvement: 'Batch DOM updates, use CSS transforms for animations, minimize style changes.'
    },
    taskDuration: {
      limit: 700,
      unit: 'ms',
      description: 'Total time browser main thread was blocked. Affects responsiveness.',
      improvement: 'Break up long tasks, use web workers, optimize event handlers.'
    },
    layoutShift: {
      limit: 0.1,
      unit: '',
      description: 'Cumulative Layout Shift (CLS). Core Web Vital for visual stability.',
      improvement: 'Set size attributes on images/embeds, avoid inserting content above existing content.'
    }
  },
  memory: {
    heapUsed: {
      limit: 50,
      unit: 'MB',
      description: 'Amount of JavaScript heap memory in use. Indicates memory efficiency.',
      improvement: 'Fix memory leaks, dispose unused objects, implement proper cleanup in SPA routes.'
    },
    heapTotal: {
      limit: 100,
      unit: 'MB',
      description: 'Total allocated JavaScript heap memory. Overall memory footprint.',
      improvement: 'Optimize data structures, use pagination for large datasets, implement virtual scrolling.'
    }
  },
  resources: {
    count: {
      limit: 150,
      unit: '',
      description: 'Total number of resources requested. Affects load time and network congestion.',
      improvement: 'Combine files, use sprites for images, implement proper caching strategies.'
    },
    totalSize: {
      limit: 2.0,
      unit: 'MB',
      description: 'Total transfer size of all resources. Impacts load time and bandwidth usage.',
      improvement: 'Compress assets, optimize images, use modern formats (WebP), implement code splitting.'
    }
  }
};

/**
 * Mobile-specific thresholds with adjusted limits to account for:
 * - Slower network conditions
 * - Limited CPU power
 * - Battery life considerations
 */
export const MOBILE_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  timing: {
    firstPaint: {
      ...PERFORMANCE_THRESHOLDS.timing.firstPaint,
      limit: 2000,  // Increased to account for mobile network latency
    },
    firstContentfulPaint: {
      ...PERFORMANCE_THRESHOLDS.timing.firstContentfulPaint,
      limit: 2200,
    },
    largestContentfulPaint: {
      ...PERFORMANCE_THRESHOLDS.timing.largestContentfulPaint,
      limit: 2700,
    },
    domContentLoaded: {
      ...PERFORMANCE_THRESHOLDS.timing.domContentLoaded,
      limit: 2700,
    },
    loadComplete: {
      ...PERFORMANCE_THRESHOLDS.timing.loadComplete,
      limit: 3500,
    }
  },
  browser: {
    scriptDuration: {
      ...PERFORMANCE_THRESHOLDS.browser.scriptDuration,
      limit: 1.5,  // Increased for lower mobile CPU power
    },
    layoutCount: {
      ...PERFORMANCE_THRESHOLDS.browser.layoutCount,
      limit: 25,  // Reduced to minimize battery impact
    },
    taskDuration: {
      ...PERFORMANCE_THRESHOLDS.browser.taskDuration,
      limit: 900,
    },
    layoutShift: {
      ...PERFORMANCE_THRESHOLDS.browser.layoutShift,
      limit: 0.1,  // Same as desktop - visual stability equally important
    }
  },
  memory: {
    heapUsed: {
      ...PERFORMANCE_THRESHOLDS.memory.heapUsed,
      limit: 40,  // Reduced for mobile memory constraints
    },
    heapTotal: {
      ...PERFORMANCE_THRESHOLDS.memory.heapTotal,
      limit: 80,
    }
  },
  resources: {
    count: {
      ...PERFORMANCE_THRESHOLDS.resources.count,
      limit: 100,  // Reduced to minimize network requests
    },
    totalSize: {
      ...PERFORMANCE_THRESHOLDS.resources.totalSize,
      limit: 1.5,  // Reduced for mobile data considerations
    }
  }
};
