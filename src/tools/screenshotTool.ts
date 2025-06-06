import puppeteer, { Browser, Page } from "puppeteer";

export interface ScreenshotArgs {
  url: string;
  breakpoints?: { width: number }[];
  headless?: boolean;
  waitFor?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  timeout?: number;
  maxWidth?: number; // Max width for optimization
  imageFormat?: "png" | "jpeg";
  quality?: number; // JPEG quality (0-100)
}

export interface PageError {
  type: "javascript" | "console" | "network" | "security";
  level: "error" | "warning" | "info";
  message: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: string;
  url?: string;
  statusCode?: number;
}

export interface ScreenshotResult {
  success: boolean;
  screenshots: {
    width: number;
    height: number;
    screenshot: string;
    format: string;
    metadata: {
      viewport: { width: number; height: number };
      actualContentSize: { width: number; height: number };
      loadTime: number;
      timestamp: string;
      optimized: boolean;
      originalSize?: { width: number; height: number };
    };
  }[];
  pageErrors: PageError[];
  errorSummary: {
    totalErrors: number;
    totalWarnings: number;
    totalLogs: number;
    hasJavaScriptErrors: boolean;
    hasNetworkErrors: boolean;
    hasConsoleLogs: boolean;
  };
  error?: string;
}

const DEFAULT_BREAKPOINTS = [
  { width: 375 },  // Mobile
  { width: 768 },  // Tablet
  { width: 1280 }, // Desktop
];

let browserInstance: Browser | null = null;

async function getBrowser(headless: boolean = true): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

async function getFullPageDimensions(page: Page): Promise<{ width: number; height: number }> {
  return await page.evaluate(() => {
    return {
      width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    };
  });
}

async function collectPageErrors(page: Page): Promise<PageError[]> {
  const errors: PageError[] = [];
  
  // Collect JavaScript errors
  page.on('pageerror', (error) => {
    errors.push({
      type: "javascript",
      level: "error",
      message: error.message,
      source: error.stack?.split('\n')[0] || '',
      timestamp: new Date().toISOString()
    });
  });
  
  // Collect console messages (errors, warnings, logs, info, debug)
  page.on('console', (msg) => {
    const msgType = msg.type();
    
    // Determine level based on console type
    let level: "error" | "warning" | "info";
    if (msgType === 'error' || msgType === 'assert') {
      level = "error";
    } else if (msgType === 'warning') {
      level = "warning";
    } else {
      level = "info"; // For log, info, debug, etc.
    }
    
    errors.push({
      type: "console",
      level: level,
      message: msg.text(),
      source: msg.location()?.url,
      line: msg.location()?.lineNumber,
      column: msg.location()?.columnNumber,
      timestamp: new Date().toISOString()
    });
  });
  
  // Collect network failures
  page.on('response', (response) => {
    if (!response.ok()) {
      errors.push({
        type: "network",
        level: response.status() >= 500 ? "error" : "warning",
        message: `Failed to load resource: ${response.status()} ${response.statusText()}`,
        url: response.url(),
        statusCode: response.status(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Collect security/CORS errors
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    if (failure) {
      errors.push({
        type: failure.errorText.includes('CORS') ? "security" : "network",
        level: "error",
        message: `Request failed: ${failure.errorText}`,
        url: request.url(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  return errors;
}

export async function screenshotTool(args: any): Promise<ScreenshotResult> {
  const {
    url,
    breakpoints = DEFAULT_BREAKPOINTS,
    headless = true,
    waitFor = "networkidle0",
    timeout = 30000,
    maxWidth = 1280, // Default max width for optimization
    imageFormat = "jpeg", // Default to JPEG for smaller file size
    quality = 80, // Default JPEG quality
  }: ScreenshotArgs = args;

  if (!url) {
    return {
      success: false,
      screenshots: [],
      pageErrors: [],
      errorSummary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalLogs: 0,
        hasJavaScriptErrors: false,
        hasNetworkErrors: false,
        hasConsoleLogs: false,
      },
      error: "URL is required"
    };
  }

  try {
    const browser = await getBrowser(headless);
    const page = await browser.newPage();
    
    // Start collecting errors
    const pageErrors = await collectPageErrors(page);
    
    const results = [];
    
    for (const breakpoint of breakpoints) {
      const startTime = Date.now();
      
      // Determine if we need to optimize this breakpoint
      const shouldOptimize = breakpoint.width > maxWidth;
      const screenshotWidth = shouldOptimize ? maxWidth : breakpoint.width;
      
      // Set viewport
      await page.setViewport({ 
        width: breakpoint.width, 
        height: 800 // Initial height, will capture full page
      });
      
      // Navigate to URL
      await page.goto(url, { 
        waitUntil: waitFor as any,
        timeout 
      });
      
      // Get actual content dimensions
      const actualContentSize = await getFullPageDimensions(page);
      
      // Configure screenshot options
      const screenshotOptions: any = {
        fullPage: true,
        encoding: 'base64'
      };
      
      // Set format and quality
      if (imageFormat === "jpeg") {
        screenshotOptions.type = 'jpeg';
        screenshotOptions.quality = quality;
      } else {
        screenshotOptions.type = 'png';
      }
      
      // If we need to optimize, clip the screenshot width
      if (shouldOptimize) {
        screenshotOptions.clip = {
          x: 0,
          y: 0,
          width: maxWidth,
          height: actualContentSize.height
        };
      }
      
      // Take screenshot
      const screenshot = await page.screenshot(screenshotOptions);
      
      const loadTime = Date.now() - startTime;
      
      // Determine the data URL prefix based on format
      const mimeType = imageFormat === "jpeg" ? "image/jpeg" : "image/png";
      const dataPrefix = `data:${mimeType};base64,`;
      
      results.push({
        width: shouldOptimize ? maxWidth : breakpoint.width,
        height: actualContentSize.height,
        screenshot: `${dataPrefix}${screenshot}`,
        format: imageFormat,
        metadata: {
          viewport: { width: breakpoint.width, height: 800 },
          actualContentSize,
          loadTime,
          timestamp: new Date().toISOString(),
          optimized: shouldOptimize,
          originalSize: shouldOptimize ? { width: breakpoint.width, height: actualContentSize.height } : undefined,
        },
      });
    }
    
    await page.close();
    
    // Create error summary
    const errors = pageErrors.filter(e => e.level === 'error');
    const warnings = pageErrors.filter(e => e.level === 'warning');
    const logs = pageErrors.filter(e => e.level === 'info');
    const errorSummary = {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalLogs: logs.length,
      hasJavaScriptErrors: pageErrors.some(e => e.type === 'javascript' && e.level === 'error'),
      hasNetworkErrors: pageErrors.some(e => e.type === 'network' && e.level === 'error'),
      hasConsoleLogs: pageErrors.some(e => e.type === 'console' && e.level === 'info'),
    };
    
    return {
      success: true,
      screenshots: results,
      pageErrors,
      errorSummary,
    };
    
  } catch (error) {
    return {
      success: false,
      screenshots: [],
      pageErrors: [],
      errorSummary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalLogs: 0,
        hasJavaScriptErrors: false,
        hasNetworkErrors: false,
        hasConsoleLogs: false,
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
} 