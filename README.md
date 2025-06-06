# PuppeteerMCP Server

Developing website UI's with MCP just got a lot easier. A Model Context Protocol (MCP) server that provides screenshot tools for AI assistants using Puppeteer. This server integrates with MCP-compatible hosts like Cursor to enable AI agents to capture and analyze web page screenshots, console logs, errors, and warnings.

## Overview

PuppeteerMCP implements the Model Context Protocol to bridge AI assistants with web page screenshot capabilities. When working with AI-assisted development, this server allows AI agents to:

1. Navigate to any URL via tools
2. Capture screenshots at multiple viewport breakpoints
3. Return visual feedback with structured metadata
4. Support both headless and headful browser modes

This enables more effective AI-assisted development by providing visual context through the standardized MCP protocol.

## Features

### Current Features
- ✅ **MCP server implementation** with TypeScript SDK
- ✅ **Screenshot tools for AI agents** with multi-breakpoint capture
- ✅ **stdio transport** for seamless Cursor integration
- ✅ **Multi-breakpoint screenshots** (mobile, tablet, desktop)
- ✅ **Automatic page height detection** for full-page capture
- ✅ **Structured tool responses** with detailed metadata
- ✅ **Error reporting** - JavaScript errors, console logs, network issues
- ✅ **Performance optimization** - JPEG compression and width limiting

### In Progress
- ✅ **Completed** - Error reporting and debugging features

### Future Developments

#### 🚀 High Priority Features
- 📋 **Element-specific screenshots** - Target CSS selectors for component-level captures
- 📋 **Page interaction capabilities** - Click, scroll, fill forms, hover elements
- 📋 **Performance monitoring** - Lighthouse scores, Core Web Vitals, bundle analysis
- 📋 **Accessibility testing** - WCAG violations, color contrast, keyboard navigation

#### 🎯 Advanced Testing & Analysis
- 📋 **Visual regression testing** - Compare screenshots against baselines
- 📋 **Cross-browser testing** - Firefox, Safari, Edge screenshot comparison
- 📋 **Content extraction** - Pull text, links, SEO data for analysis
- 📋 **Form validation testing** - Auto-fill and validate form behavior
- 📋 **Animation capture** - Record CSS animations and transitions
- 📋 **Multi-step user flows** - Test complete user journeys

#### 🛠️ Development Workflow Integration
- 📋 **Local development watching** - Auto-screenshot on file changes
- 📋 **Git integration** - Commit screenshots with code changes
- 📋 **Hot reload capture** - Screenshot after development server updates
- 📋 **API-driven testing** - Screenshot pages with different data sets
- 📋 **Database integration** - Test with real/mock data scenarios

#### 📱 Device & Platform Testing
- 📋 **Real device emulation** - iPhone, Android, tablet testing
- 📋 **Mobile-specific features** - Touch gestures, device orientation
- 📋 **Progressive Web App testing** - Offline states, service workers
<!-- - 📋 **Video recording capabilities** - Capture user interactions -->

#### 🤖 AI-Powered Analysis
- 📋 **Design review automation** - AI analysis of UI/UX patterns
- 📋 **Code quality insights** - Spot code smells through visual patterns
- 📋 **Automated bug detection** - Visual anomaly detection
- 📋 **Performance recommendations** - AI-driven optimization suggestions

## MCP Tool Specification

### screenshot

Captures screenshots of web pages at one or more viewport breakpoints using Puppeteer.

#### Tool Schema
```json
{
  "name": "screenshot",
  "description": "Capture screenshots of web pages at multiple viewport breakpoints",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "URL to capture screenshots from"
      },
      "breakpoints": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "width": { "type": "number" }
          }
        },
        "description": "Viewport breakpoints (optional, defaults to mobile/tablet/desktop)"
      },
      "headless": {
        "type": "boolean",
        "description": "Run browser in headless mode",
        "default": true
      },
      "waitFor": {
        "type": "string",
        "enum": ["load", "domcontentloaded", "networkidle0", "networkidle2"],
        "description": "Wait condition before capturing",
        "default": "networkidle0"
      },
      "timeout": {
        "type": "number",
        "description": "Navigation timeout in milliseconds",
        "default": 30000
      }
    },
    "required": ["url"]
  }
}
```

#### Default Breakpoints
If no breakpoints are specified, the tool uses these standard responsive breakpoints:
- **Mobile:** 375px width (height auto-detected)
- **Tablet:** 768px width (height auto-detected)  
- **Desktop:** 1280px width (height auto-detected)

#### Tool Response
```json
{
  "screenshots": [
    {
      "width": 375,
      "height": 2340,
      "screenshot": "data:image/jpeg;base64,/9j/4AAQ...",
      "format": "jpeg",
      "metadata": {
        "viewport": { "width": 375, "height": 800 },
        "actualContentSize": { "width": 375, "height": 2340 },
        "loadTime": 1250,
        "timestamp": "2024-01-15T10:30:00Z",
        "optimized": false
      }
    }
  ],
  "pageErrors": [
    {
      "type": "console",
      "level": "info",
      "message": "User clicked login button",
      "source": "https://example.com/app.js",
      "line": 42,
      "column": 8,
      "timestamp": "2024-01-15T10:30:01Z"
    },
    {
      "type": "network",
      "level": "warning", 
      "message": "Failed to load resource: 404 Not Found",
      "url": "https://example.com/missing-image.png",
      "statusCode": 404,
      "timestamp": "2024-01-15T10:30:02Z"
    }
  ],
  "errorSummary": {
    "totalErrors": 0,
    "totalWarnings": 1,
    "totalLogs": 1,
    "hasJavaScriptErrors": false,
    "hasNetworkErrors": false,
    "hasConsoleLogs": true
  }
}
```

## Error Reporting & Debugging

### ✅ NEW: Comprehensive Error Monitoring
The screenshot tool now captures and reports all page activity, making it perfect for debugging web applications:

#### What Gets Captured:
- **🟥 JavaScript Errors**: Runtime errors with stack traces, line numbers, and sources
- **🟨 Console Messages**: All `console.log()`, `console.warn()`, `console.error()` output  
- **🟦 Network Issues**: Failed requests (404s, 500s), CORS violations, timeouts
- **🟪 Security Problems**: CORS policy violations, blocked requests

#### Error Types:
```typescript
interface PageError {
  type: "javascript" | "console" | "network" | "security";
  level: "error" | "warning" | "info";
  message: string;
  source?: string;        // File/URL where error occurred
  line?: number;          // Line number (for JS errors)
  column?: number;        // Column number (for JS errors)  
  timestamp: string;      // When the error occurred
  url?: string;           // Request URL (for network errors)
  statusCode?: number;    // HTTP status code (for network errors)
}
```

#### Summary Statistics:
- Total count of errors, warnings, and console logs
- Quick flags for JavaScript and network error presence
- Instant overview of page health

#### How It Appears in Cursor:
When you take a screenshot, Cursor will show:
1. **Visual Screenshot** - The actual page capture
2. **Activity Summary** - "📊 Page Activity Detected: • 2 error(s) • 1 warning(s) • 5 console log(s)"
3. **Detailed Report** - Grouped by error type with full context

This makes the screenshot tool incredibly powerful for **debugging, development, and code review** - you can literally see what's happening on the page while viewing how it looks!

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Chrome/Chromium browser (for Puppeteer)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd PuppeteerMCP

# Install dependencies
npm install

# Build the server
npm run build

# Test with MCP inspector
npx @modelcontextprotocol/inspector build/index.js
```

## Cursor Integration

To use this MCP server with Cursor:

### 1. Build the Server
```bash
npm run build
```

### 2. Configure Cursor
Add the MCP server to your Cursor configuration. The exact location depends on your OS:

**macOS:** `~/.cursor/mcp.json`
**Windows:** `%APPDATA%\Cursor\mcp.json`
**Linux:** `~/.config/cursor/mcp.json`

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "node",
      "args": ["/absolute/path/to/PuppeteerMCP/build/index.js"]
    }
  }
}
```

**Important:** Use the absolute path to your built JavaScript file.

### 3. Restart Cursor
Restart Cursor to load the MCP server. You should see the screenshot tool available in Cursor's AI interface.

### 4. Usage in Cursor
You can now ask Cursor to take screenshots and they will appear as inline images in the chat:

#### Basic Screenshots:
- "Take a screenshot of https://example.com"
- "Capture mobile and desktop screenshots of this website"  
- "Show me how this page looks on different screen sizes"
- "Take a high-quality PNG screenshot of this website"
- "Get optimized JPEG screenshots for faster loading"

#### ✅ NEW - Error Debugging:
- "Take a screenshot of my app and show me any JavaScript errors"
- "Debug this webpage - capture screenshots and check for console errors"
- "Screenshot this site and tell me about any network failures"
- "Show me the page visually and report any CORS issues"
- "Take screenshots and analyze all console output for debugging"

The screenshots will appear directly in Cursor's chat interface with **comprehensive error reporting**, allowing multimodal AI models (GPT-4o, Claude 3, Gemini Pro) to analyze them visually AND provide feedback on both design/layout AND technical issues like JavaScript errors, failed network requests, and console warnings.

## Development

### Project Structure
```
PuppeteerMCP/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── tools/
│   │   └── screenshotTools.ts # Screenshot tool implementations
│   ├── services/
│   │   └── puppeteerService.ts # Puppeteer business logic
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── utils/
│       └── logger.ts         # Logging utilities
├── build/                    # Compiled JavaScript (for Cursor)
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts
- `npm run build`: Build TypeScript to JavaScript
- `npm run watch`: Build in watch mode during development
- `npm run test`: Run test suite (when implemented)
- `npm run lint`: Run ESLint (when configured)

### Testing with MCP Inspector
The MCP inspector is the primary tool for testing MCP servers:

```bash
# After building
npx @modelcontextprotocol/inspector build/index.js
```

This opens a web interface where you can:
- View available tools
- Test tool calls with different parameters
- Inspect tool responses
- Debug server behavior

## Architecture

### Core Components
1. **MCP Server**: Main server using `@modelcontextprotocol/sdk`
2. **stdio Transport**: Communication layer for Cursor integration
3. **Screenshot Tools**: Tool implementations using Puppeteer
4. **Puppeteer Service**: Browser automation and screenshot capture

### Communication Flow
```
Cursor AI → MCP Protocol → stdio Transport → PuppeteerMCP Server → Puppeteer → Browser → Screenshots → Response
```

### Key Differences from HTTP APIs

| Aspect | HTTP API | MCP Server |
|--------|----------|------------|
| Communication | HTTP requests/responses | stdio + JSON-RPC 2.0 |
| Discovery | Documentation | Tool schema registration |
| Integration | Manual API calls | Native MCP protocol support |
| AI Usage | Requires custom code | Direct tool calling |
| Transport | Network-based | Process-based (subprocess) |

## Configuration

### Environment Variables
- `PUPPETEER_EXECUTABLE_PATH`: Custom Chrome/Chromium path
- `NODE_ENV`: Environment mode (development/production)

### Tool Configuration
Tools can be configured through their input parameters:
- Viewport breakpoints
- Browser mode (headless/headful)
- Navigation timeouts
- Wait conditions

## Error Handling

The server uses MCP's structured error handling:
- `InvalidParams`: Invalid tool parameters
- `InternalError`: Server-side errors (browser failures, timeouts)
- `MethodNotFound`: Unknown tool names

All errors include descriptive messages for debugging.

## Security Considerations

- URL validation to prevent malicious requests
- Timeout controls to prevent hanging processes
- Browser sandboxing through Puppeteer
- Input sanitization via JSON schema validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following MCP patterns
4. Test with MCP inspector
5. Test integration with Cursor
6. Submit a pull request

## Troubleshooting

### Common Issues

**Server not appearing in Cursor:**
- Check the absolute path in your Cursor configuration
- Ensure the build/ directory exists and contains index.js
- Restart Cursor after configuration changes

**Tool calls failing:**
- Test the server with MCP inspector first
- Check console output for error messages
- Verify Puppeteer can launch browsers on your system

**Browser launch failures:**
- Install Chrome/Chromium if not present
- Set PUPPETEER_EXECUTABLE_PATH if using custom browser location
- Check for missing dependencies on Linux systems

### Debugging
1. **Test with MCP Inspector**: Primary debugging tool
2. **Check Console Output**: Server logs errors to stderr
3. **Verify Configuration**: Ensure Cursor config uses absolute paths
4. **Browser Testing**: Test Puppeteer separately if needed

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check existing documentation and examples
- Test with MCP inspector before reporting integration issues

## Standard Viewport Breakpoints

| Name     | Width | Description              |
|----------|-------|--------------------------|
| Mobile   | 375px | Typical smartphone width |
| Tablet   | 768px | Standard tablet width    |
| Desktop  | 1280px| Common desktop width     |

All screenshots automatically detect page height for full content capture.

## Image Optimization

To ensure screenshots work well with Cursor's chat interface and don't exceed token limits:

### Automatic Optimization
- **Format**: JPEG by default (80% quality) for smaller file sizes
- **Width Limiting**: Images wider than 1280px are automatically clipped
- **Full Page Capture**: Height is always full page content

### Custom Options
```typescript
// High quality PNG (larger files)
{
  "imageFormat": "png"
}

// Custom JPEG quality
{
  "imageFormat": "jpeg",
  "quality": 90
}

// Custom width limit
{
  "maxWidth": 1920
}
```

### Size Considerations
- Large base64 images can hit Cursor's 10MB message limit
- JPEG format recommended for most use cases
- PNG only for cases requiring transparency or pixel-perfect quality 