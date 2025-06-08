import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import os from "os";

// Define action types for page interactions
export interface PageAction {
  type: "click" | "type" | "scroll" | "wait" | "hover" | "select" | "clear" | "navigate" | "waitForElement";
  selector?: string;
  text?: string;
  value?: string;
  x?: number;
  y?: number;
  duration?: number; // for wait action
  url?: string; // for navigate action
  timeout?: number; // for waitForElement action
}

export interface ScreenshotArgs {
  url: string;
  breakpoints?: { width: number }[];
  headless?: boolean;
  waitFor?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  timeout?: number;
  maxWidth?: number; // Max width for optimization
  imageFormat?: "png" | "jpeg";
  quality?: number; // JPEG quality (0-100)
  actions?: PageAction[]; // Array of actions to perform before screenshot
  sessionId?: string; // Session identifier for persistent browser state
  userDataDir?: string; // Custom user data directory path
  cookies?: Array<{ // NEW: Cookies to inject into the session
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }>;
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
  sessionInfo?: {
    sessionId: string;
    userDataDir: string;
    persistent: boolean;
  };
}

const DEFAULT_BREAKPOINTS = [
  { width: 375 },  // Mobile
  { width: 768 },  // Tablet
  { width: 1280 }, // Desktop
];

// Store browser instances by session ID for persistent sessions
const browserInstances = new Map<string, Browser>();

async function getBrowser(headless: boolean = true, sessionId?: string, userDataDir?: string): Promise<Browser> {
  const sessionKey = sessionId || 'default';
  
  // Check if we have an existing browser for this session
  if (browserInstances.has(sessionKey)) {
    const browser = browserInstances.get(sessionKey)!;
    if (browser.connected) {
      return browser;
    } else {
      // Clean up disconnected browser
      browserInstances.delete(sessionKey);
    }
  }
  
  // Determine user data directory for persistent sessions
  let finalUserDataDir: string | undefined;
  if (sessionId || userDataDir) {
    if (userDataDir) {
      finalUserDataDir = userDataDir;
    } else if (sessionId) {
      // Create a session-specific directory in temp folder
      finalUserDataDir = path.join(os.tmpdir(), 'puppeteer-mcp-sessions', sessionId);
    }
  }
  
  // Launch new browser with optional persistent session
  const launchOptions: any = {
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  
  if (finalUserDataDir) {
    launchOptions.userDataDir = finalUserDataDir;
  }
  
  const browser = await puppeteer.launch(launchOptions);
  browserInstances.set(sessionKey, browser);
  
  return browser;
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

async function executePageActions(page: Page, actions: PageAction[]): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "click":
          if (!action.selector) throw new Error("Click action requires selector");
          await page.waitForSelector(action.selector, { timeout: 5000 });
          await page.click(action.selector);
          break;
          
        case "type":
          if (!action.selector || !action.text) throw new Error("Type action requires selector and text");
          await page.waitForSelector(action.selector, { timeout: 5000 });
          await page.type(action.selector, action.text);
          break;
          
        case "clear":
          if (!action.selector) throw new Error("Clear action requires selector");
          await page.waitForSelector(action.selector, { timeout: 5000 });
          await page.evaluate((selector) => {
            const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
            if (element) element.value = '';
          }, action.selector);
          break;
          
        case "scroll":
          if (action.x !== undefined && action.y !== undefined) {
            await page.evaluate((x, y) => window.scrollTo(x, y), action.x, action.y);
          } else if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: 5000 });
            await page.evaluate((selector) => {
              document.querySelector(selector)?.scrollIntoView();
            }, action.selector);
          } else {
            // Scroll to bottom of page if no coordinates or selector
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          }
          break;
          
        case "hover":
          if (!action.selector) throw new Error("Hover action requires selector");
          await page.waitForSelector(action.selector, { timeout: 5000 });
          await page.hover(action.selector);
          break;
          
        case "select":
          if (!action.selector || !action.value) throw new Error("Select action requires selector and value");
          await page.waitForSelector(action.selector, { timeout: 5000 });
          await page.select(action.selector, action.value);
          break;
          
        case "wait":
          const duration = action.duration || 1000;
          await new Promise(resolve => setTimeout(resolve, duration));
          break;
          
        case "waitForElement":
          if (!action.selector) throw new Error("WaitForElement action requires selector");
          const timeout = action.timeout || 5000;
          await page.waitForSelector(action.selector, { timeout });
          break;
          
        case "navigate":
          if (!action.url) throw new Error("Navigate action requires url");
          await page.goto(action.url, { waitUntil: 'networkidle0' });
          break;
          
        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }
      
      // Small delay between actions to ensure stability
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      throw new Error(`Failed to execute action ${action.type}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function setCookies(page: Page, cookies: Array<{name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "Strict" | "Lax" | "None";}>, url: string): Promise<void> {
  if (!cookies || cookies.length === 0) return;
  
  // Parse domain from URL if not provided
  const parsedUrl = new URL(url);
  
  for (const cookie of cookies) {
    const cookieToSet = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || parsedUrl.hostname,
      path: cookie.path || '/',
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    };
    
    try {
      await page.setCookie(cookieToSet);
    } catch (error) {
      console.error(`Failed to set cookie ${cookie.name}:`, error);
    }
  }
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
    actions = [], // Default empty actions array
    sessionId,
    userDataDir,
    cookies,
  }: ScreenshotArgs = args;

  // Determine user data directory for session info
  let finalUserDataDir: string | undefined;
  if (sessionId || userDataDir) {
    if (userDataDir) {
      finalUserDataDir = userDataDir;
    } else if (sessionId) {
      finalUserDataDir = path.join(os.tmpdir(), 'puppeteer-mcp-sessions', sessionId);
    }
  }

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
    const browser = await getBrowser(headless, sessionId, userDataDir);
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
      
      // Set cookies before navigation if provided
      if (cookies && cookies.length > 0) {
        await setCookies(page, cookies, url);
      }
      
      // Navigate to URL
      await page.goto(url, { 
        waitUntil: waitFor as any,
        timeout 
      });
      
      // Execute page actions if provided
      if (actions.length > 0) {
        await executePageActions(page, actions);
      }
      
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
    
    const result: ScreenshotResult = {
      success: true,
      screenshots: results,
      pageErrors,
      errorSummary,
    };

    // Add session info if session was used
    if (sessionId) {
      result.sessionInfo = {
        sessionId,
        userDataDir: finalUserDataDir || path.join(os.tmpdir(), 'puppeteer-mcp-sessions', sessionId),
        persistent: true,
      };
    }
    
    return result;
    
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
  if (browserInstances.size > 0) {
    for (const browser of browserInstances.values()) {
      await browser.close();
    }
    browserInstances.clear();
  }
} 