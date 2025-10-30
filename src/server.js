import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a simple MCP server named "hello-mcp"
const server = new McpServer({ name: "hello-mcp", version: "1.0.0" });

// Define one test tool that returns a simple message
server.tool("say_hello", {}, async () => {
  return { content: [{ type: "text", text: "Hello from your MCP server!" }] };
});

// Start the MCP server using stdio (so ChatGPT can connect to it)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP test server ready");

