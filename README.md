# PuppeteerMCP Server

A Model Context Protocol (MCP) server that provides screenshot tools for AI assistants using Puppeteer. This server integrates with MCP-compatible hosts like Cursor to enable AI agents to capture and analyze web page screenshots.

## Overview

PuppeteerMCP implements the Model Context Protocol to bridge AI assistants with web page screenshot capabilities. When working with AI-assisted development, this server allows AI agents to:

1. Navigate to any URL via tools
2. Capture screenshots at multiple viewport breakpoints
3. Return visual feedback with structured metadata
4. Support both headless and headful browser modes

This enables more effective AI-assisted development by providing visual context through the standardized MCP protocol.

## Features

### Current Features
- ✅ **PLANNED** - MCP server implementation with TypeScript SDK
- ✅ **PLANNED** - Screenshot tools for AI agents  
- ✅ **PLANNED** - stdio transport for Cursor integration
- ✅ **PLANNED** - Multi-breakpoint screenshots (mobile, tablet, desktop)
- ✅ **PLANNED** - Automatic page height detection for full-page capture
- ✅ **PLANNED** - Structured tool responses with metadata

### In Progress
- 🔄 Implementing proper MCP server structure
- 🔄 Screenshot tool development

### Future Developments
- 📋 Multiple screenshot formats (PNG, JPEG, WebP)
- 📋 Element-specific screenshots (CSS selectors)
- 📋 Page interaction capabilities (click, scroll, type)
- 📋 Performance metrics capture
- 📋 Advanced viewport configurations
- 📋 Screenshot annotations and markup
- 📋 Mobile device emulation

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
      "breakpoint": { "width": 375 },
      "screenshot": "base64-encoded-png-data",
      "metadata": {
        "url": "https://example.com",
        "timestamp": "2024-01-15T10:30:00Z",
        "viewport": { "width": 375, "height": 1024 },
        "actualDimensions": { "width": 375, "height": 2340 },
        "loadTime": 2340
      }
    }
  ]
}
```

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
- "Take a screenshot of https://example.com"
- "Capture mobile and desktop screenshots of this website"
- "Show me how this page looks on different screen sizes"
- "Take a high-quality PNG screenshot of this website"
- "Get optimized JPEG screenshots for faster loading"

The screenshots will appear directly in Cursor's chat interface, allowing multimodal AI models (GPT-4o, Claude 3, Gemini Pro) to analyze them visually and provide feedback on design, layout, and functionality.

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