#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { screenshotTool } from "./tools/screenshotTool.js";
const server = new Server({
    name: "puppeteer-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "screenshot",
                description: "Capture screenshots of web pages at multiple viewport breakpoints using Puppeteer",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "URL to capture screenshots from"
                        },
                        breakpoints: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    width: {
                                        type: "number",
                                        description: "Viewport width in pixels"
                                    }
                                },
                                required: ["width"]
                            },
                            description: "Viewport breakpoints (optional, defaults to mobile: 375px, tablet: 768px, desktop: 1280px)"
                        },
                        headless: {
                            type: "boolean",
                            description: "Run browser in headless mode",
                            default: true
                        },
                        waitFor: {
                            type: "string",
                            enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
                            description: "Wait condition before capturing screenshot",
                            default: "networkidle0"
                        },
                        timeout: {
                            type: "number",
                            description: "Navigation timeout in milliseconds",
                            default: 30000
                        },
                        maxWidth: {
                            type: "number",
                            description: "Maximum width for image optimization (images wider than this will be clipped)",
                            default: 1280
                        },
                        imageFormat: {
                            type: "string",
                            enum: ["png", "jpeg"],
                            description: "Image format (JPEG recommended for smaller file sizes)",
                            default: "jpeg"
                        },
                        quality: {
                            type: "number",
                            minimum: 1,
                            maximum: 100,
                            description: "JPEG quality (1-100, only applies when imageFormat is 'jpeg')",
                            default: 80
                        },
                        actions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: {
                                        type: "string",
                                        enum: ["click", "type", "scroll", "wait", "hover", "select", "clear", "navigate", "waitForElement"],
                                        description: "Type of action to perform"
                                    },
                                    selector: {
                                        type: "string",
                                        description: "CSS selector for element-based actions"
                                    },
                                    text: {
                                        type: "string",
                                        description: "Text to type (for type action)"
                                    },
                                    value: {
                                        type: "string",
                                        description: "Value to select (for select action)"
                                    },
                                    x: {
                                        type: "number",
                                        description: "X coordinate (for scroll action)"
                                    },
                                    y: {
                                        type: "number",
                                        description: "Y coordinate (for scroll action)"
                                    },
                                    duration: {
                                        type: "number",
                                        description: "Duration in milliseconds (for wait action)",
                                        default: 1000
                                    },
                                    url: {
                                        type: "string",
                                        description: "URL to navigate to (for navigate action)"
                                    },
                                    timeout: {
                                        type: "number",
                                        description: "Timeout in milliseconds (for waitForElement action)",
                                        default: 5000
                                    }
                                },
                                required: ["type"]
                            },
                            description: "Array of page interactions to perform before taking screenshots"
                        },
                        sessionId: {
                            type: "string",
                            description: "Session identifier for persistent browser state (maintains cookies, login data, localStorage, etc.)"
                        },
                        userDataDir: {
                            type: "string",
                            description: "Custom user data directory path for browser session storage"
                        },
                        cookies: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string",
                                        description: "Cookie name"
                                    },
                                    value: {
                                        type: "string",
                                        description: "Cookie value"
                                    },
                                    domain: {
                                        type: "string",
                                        description: "Cookie domain (optional, defaults to URL domain)"
                                    },
                                    path: {
                                        type: "string",
                                        description: "Cookie path (optional, defaults to '/')"
                                    },
                                    expires: {
                                        type: "number",
                                        description: "Cookie expiration timestamp (optional)"
                                    },
                                    httpOnly: {
                                        type: "boolean",
                                        description: "HttpOnly flag (optional)"
                                    },
                                    secure: {
                                        type: "boolean",
                                        description: "Secure flag (optional)"
                                    },
                                    sameSite: {
                                        type: "string",
                                        enum: ["Strict", "Lax", "None"],
                                        description: "SameSite policy (optional)"
                                    }
                                },
                                required: ["name", "value"]
                            },
                            description: "Cookies to inject into the browser session before navigation"
                        }
                    },
                    required: ["url"]
                }
            }
        ]
    };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === "screenshot") {
            const result = await screenshotTool(request.params.arguments);
            if (!result.success) {
                throw new McpError(ErrorCode.InternalError, result.error || "Screenshot capture failed");
            }
            // Build content array with text description and images
            const content = [];
            // Add summary text with error information
            let summaryText = `Successfully captured ${result.screenshots.length} screenshot(s) for ${request.params.arguments?.url || 'the requested URL'}`;
            // Add actions summary if actions were provided
            if (request.params.arguments?.actions && Array.isArray(request.params.arguments.actions) && request.params.arguments.actions.length > 0) {
                const actionTypes = request.params.arguments.actions.map((action) => action.type);
                summaryText += `\n🎯 Executed ${actionTypes.length} page action(s): ${actionTypes.join(', ')}`;
            }
            // Add session info if session was used
            if (result.sessionInfo) {
                summaryText += `\n🔒 Session: ${result.sessionInfo.sessionId} (persistent login data maintained)`;
            }
            // Add error summary if there are any issues
            if (result.errorSummary.totalErrors > 0 || result.errorSummary.totalWarnings > 0 || result.errorSummary.totalLogs > 0) {
                summaryText += `\n\n📊 Page Activity Detected:`;
                if (result.errorSummary.totalErrors > 0) {
                    summaryText += `\n• ${result.errorSummary.totalErrors} error(s)`;
                }
                if (result.errorSummary.totalWarnings > 0) {
                    summaryText += `\n• ${result.errorSummary.totalWarnings} warning(s)`;
                }
                if (result.errorSummary.totalLogs > 0) {
                    summaryText += `\n• ${result.errorSummary.totalLogs} console log(s)`;
                }
                if (result.errorSummary.hasJavaScriptErrors) {
                    summaryText += `\n• JavaScript errors present`;
                }
                if (result.errorSummary.hasNetworkErrors) {
                    summaryText += `\n• Network/loading errors present`;
                }
                if (result.errorSummary.hasConsoleLogs) {
                    summaryText += `\n• Console logs available`;
                }
            }
            else {
                summaryText += `\n✅ No errors, warnings, or console activity detected`;
            }
            content.push({
                type: "text",
                text: summaryText
            });
            // Add detailed error information if present
            if (result.pageErrors.length > 0) {
                let errorDetails = "\n📋 Detailed Error Report:\n";
                // Group errors by type
                const errorsByType = result.pageErrors.reduce((acc, error) => {
                    if (!acc[error.type])
                        acc[error.type] = [];
                    acc[error.type].push(error);
                    return acc;
                }, {});
                Object.entries(errorsByType).forEach(([type, errors]) => {
                    errorDetails += `\n${type.toUpperCase()} ISSUES (${errors.length}):\n`;
                    errors.forEach((error, index) => {
                        const icon = error.level === 'error' ? '❌' : '⚠️';
                        errorDetails += `${icon} ${error.message}`;
                        if (error.source)
                            errorDetails += `\n   Source: ${error.source}`;
                        if (error.line && error.column)
                            errorDetails += ` (line ${error.line}, col ${error.column})`;
                        if (error.url && error.url !== error.source)
                            errorDetails += `\n   URL: ${error.url}`;
                        if (error.statusCode)
                            errorDetails += ` [${error.statusCode}]`;
                        errorDetails += `\n   Time: ${new Date(error.timestamp).toLocaleTimeString()}\n`;
                    });
                });
                content.push({
                    type: "text",
                    text: errorDetails
                });
            }
            // Add each screenshot as an image
            for (const screenshot of result.screenshots) {
                // Extract base64 data - handle both PNG and JPEG formats
                const base64Data = screenshot.screenshot.replace(/^data:image\/(png|jpeg);base64,/, '');
                const mimeType = screenshot.format === "jpeg" ? "image/jpeg" : "image/png";
                // Add minimal description
                content.push({
                    type: "text",
                    text: `${screenshot.width}px viewport (${screenshot.format.toUpperCase()})`
                });
                content.push({
                    type: "image",
                    data: base64Data,
                    mimeType: mimeType
                });
            }
            return { content };
        }
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }
    catch (error) {
        if (error instanceof McpError) {
            throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("PuppeteerMCP server running on stdio");
}
// Handle shutdown gracefully
process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
});
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
