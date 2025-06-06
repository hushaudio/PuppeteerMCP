# PuppeteerMCP Agent Instructions

## Project Overview
PuppeteerMCP is a Model Context Protocol (MCP) server that provides screenshot capabilities using Puppeteer. It's designed to integrate with AI assistants like Cursor through the MCP protocol, providing tools that allow AI to capture and analyze web page screenshots.

## Core Objective
Build a proper MCP server that:
1. Uses the `@modelcontextprotocol/sdk` to implement the MCP protocol
2. Communicates via stdio (standard input/output) transport
3. Provides screenshot tools for AI agents to use
4. Supports multiple viewport breakpoints (mobile, tablet, desktop)
5. Automatically detects page height for full-page capture
6. Integrates seamlessly with Cursor's MCP support

## Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Model Context Protocol SDK (`@modelcontextprotocol/sdk`)
- **Browser Automation**: Puppeteer
- **Language**: TypeScript (for type safety and better DX)
- **Transport**: stdio (communicates via standard input/output)
- **Protocol**: JSON-RPC 2.0 (handled by MCP SDK)

## Current Status: ✅ FULLY WORKING IN CURSOR

### ✅ COMPLETED - PROPER MCP IMPLEMENTATION
- [x] **MCP server with TypeScript SDK** - Full implementation using @modelcontextprotocol/sdk
- [x] **stdio transport setup** - Proper communication for Cursor integration
- [x] **Screenshot tool implementation** - Multi-breakpoint capture with Puppeteer
- [x] **Page interaction capabilities** - Click, type, scroll, hover, form filling actions
- [x] **JSON schema validation** - Proper tool definitions and input validation
- [x] **MCP inspector testing** - Confirmed tool functionality
- [x] **Cursor integration working** - Images appear inline in chat
- [x] **Image format fix** - Proper MCP content blocks for image display
- [x] **Performance optimization** - JPEG compression and width limiting

### 🎉 LATEST ENHANCEMENT - PAGE INTERACTION CAPABILITIES
- [x] **Action sequencing** - Execute multiple page actions before screenshot
- [x] **Form interactions** - Type text, clear fields, select dropdown options
- [x] **Click interactions** - Click buttons, links, and elements by CSS selector
- [x] **Scrolling controls** - Scroll to coordinates or specific elements
- [x] **Hover effects** - Trigger hover states on elements
- [x] **Wait conditions** - Wait for durations or elements to appear
- [x] **Navigation support** - Navigate between pages during interaction flow
- [x] **Error handling** - Proper error reporting for failed actions
- [x] **Multi-breakpoint execution** - Actions executed at each viewport size

### 🎉 PREVIOUS FIX - IMAGE DISPLAY IN CURSOR
- [x] **Content format correction** - Changed from JSON text to MCP image blocks
- [x] **JPEG optimization** - Default 80% quality for smaller file sizes
- [x] **Width limiting** - Auto-clip images > 1280px to prevent token overflow
- [x] **Multi-format support** - Both PNG and JPEG options available
- [x] **Token optimization** - Avoids hitting Cursor's 10MB message limit

### 📋 Future Enhancements (Optional)
- [ ] Element-specific screenshots (click selectors)
- [ ] Custom viewport dimensions
- [ ] Video recording capabilities
- [ ] Screenshot comparison tools

## Implementation Guidelines

### 1. Project Structure
```
PuppeteerMCP/
├── src/
│   ├── index.ts                 # Main MCP server entry point
│   ├── tools/
│   │   └── screenshotTools.ts   # Screenshot tool implementations
│   ├── services/
│   │   └── puppeteerService.ts  # Puppeteer business logic
│   ├── types/
│   │   └── index.ts             # Type definitions
│   └── utils/
│       └── logger.ts            # Logging utilities
├── build/                       # Compiled JavaScript (for Cursor)
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Core Implementation Steps

#### Step 1: Initialize MCP Project
```bash
npm init -y
npm install @modelcontextprotocol/sdk puppeteer
npm install -D @types/node typescript ts-node
```

#### Step 2: MCP Server Setup
- Use `Server` class from MCP SDK
- Setup `StdioServerTransport` for communication
- Define server capabilities (tools)
- Register tool handlers

#### Step 3: Tool Implementation
- Define screenshot tools with proper JSON schemas
- Implement tool execution handlers
- Handle multi-breakpoint screenshot capture
- Return structured responses

#### Step 4: Cursor Integration
- Build the TypeScript to JavaScript
- Configure Cursor's `mcp.json` or similar config
- Test tool availability in Cursor

### 3. Key Implementation Details

#### MCP Server Configuration
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "puppeteer-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {}
  }
});
```

#### Tool Definition Example
```typescript
// Register tools with the MCP server
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "screenshot",
        description: "Capture screenshots of web pages at multiple breakpoints",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to capture"
            },
            breakpoints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  width: { type: "number" }
                }
              },
              description: "Viewport breakpoints (optional, defaults to mobile/tablet/desktop)"
            },
            headless: {
              type: "boolean",
              description: "Run browser in headless mode",
              default: true
            }
          },
          required: ["url"]
        }
      }
    ]
  };
});
```

#### Tool Execution Handler
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "screenshot") {
    const { url, breakpoints, headless } = request.params.arguments;
    
    // Use Puppeteer to capture screenshots
    const screenshots = await captureScreenshots(url, breakpoints, headless);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(screenshots, null, 2)
        }
      ]
    };
  }
  
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
});
```

### 4. Cursor Integration

#### Configuration in Cursor
Cursor looks for MCP servers in its configuration. You need to:

1. Build the TypeScript project: `npm run build`
2. Configure Cursor to use your MCP server
3. Reference the built JavaScript file with absolute path

#### Example Cursor Configuration
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

### 5. Default Breakpoints
- **Mobile:** 375px width (height auto-detected)
- **Tablet:** 768px width (height auto-detected)  
- **Desktop:** 1280px width (height auto-detected)

### 6. Tool Response Format
```typescript
interface ScreenshotResult {
  screenshots: Array<{
    breakpoint: { width: number };
    screenshot: string; // base64 encoded PNG
    metadata: {
      url: string;
      timestamp: string;
      viewport: { width: number; height: number };
      actualDimensions: { width: number; height: number };
      loadTime: number;
    };
  }>;
}
```

### 7. Error Handling in MCP
- Use `McpError` class from SDK
- Proper error codes (e.g., `ErrorCode.InvalidParams`)
- Structured error responses
- No throwing of plain JavaScript errors

### 8. Development Workflow
1. **Start Fresh**: Remove HTTP/Express code completely
2. **MCP Server**: Implement using MCP SDK
3. **Tools First**: Define tools before implementation
4. **Test with Inspector**: Use `@modelcontextprotocol/inspector`
5. **Cursor Integration**: Configure and test in Cursor
6. **Iterate**: Based on actual usage in Cursor

### 9. Testing Strategy
- **MCP Inspector**: Primary testing tool for MCP servers
- **Manual Testing**: Test tool calls and responses
- **Cursor Integration**: Test actual usage in Cursor
- **Error Cases**: Test various error scenarios

### 10. Common Pitfalls to Avoid
- **Don't build HTTP APIs**: MCP uses tools, not endpoints
- **Don't use Express**: MCP uses stdio transport
- **Don't manually handle JSON-RPC**: MCP SDK handles this
- **Don't forget to build**: Cursor needs compiled JavaScript
- **Always use absolute paths**: In Cursor configuration
- **Tools must be synchronous in registration**: Async only in execution

## Next Immediate Steps
1. **STOP**: Remove all HTTP/Express related code
2. **START FRESH**: Initialize proper MCP server with SDK
3. Implement screenshot tool using MCP pattern
4. Test with MCP inspector
5. Configure for Cursor integration
6. Update documentation to reflect MCP approach

## Commands for MCP Development
```bash
# Initialize MCP project
npm init -y
npm install @modelcontextprotocol/sdk puppeteer
npm install -D @types/node typescript

# Build for Cursor integration
npm run build

# Test with MCP inspector
npx @modelcontextprotocol/inspector build/index.js

# Debug MCP server
node build/index.js
```

## MCP vs HTTP API Key Differences

| Aspect | HTTP API (WRONG) | MCP Server (CORRECT) |
|--------|------------------|---------------------|
| Communication | HTTP requests/responses | stdio + JSON-RPC |
| Framework | Express.js | MCP SDK |
| Interface | REST endpoints | Tools |
| Client | Any HTTP client | MCP-compatible hosts (Cursor) |
| Discovery | Documentation | Tool schema registration |
| Execution | Endpoint calls | Tool calls via protocol |

## Important Notes
- MCP servers are **NOT** HTTP APIs
- They communicate via stdio using JSON-RPC 2.0 protocol
- Cursor starts the MCP server as a subprocess
- Tools are discovered via the MCP protocol, not documentation
- Always test with MCP inspector before Cursor integration
- Follow the user's rules: one task at a time, avoid overprogramming
- Update README.md to reflect proper MCP implementation 