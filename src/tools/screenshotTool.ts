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
      error: "URL is required"
    };
  }

  try {
    const browser = await getBrowser(headless);
    const page = await browser.newPage();
    
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
    
    return {
      success: true,
      screenshots: results,
    };
    
  } catch (error) {
    return {
      success: false,
      screenshots: [],
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