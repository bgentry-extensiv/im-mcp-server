import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// ---- Basic MCP server with one test tool
const mcp = new McpServer({ name: "hello-mcp-sse", version: "1.0.0" });

mcp.tool("say_hello", {}, async () => {
  return { content: [{ type: "text", text: "Hello from your MCP SSE server!" }] };
});

// ---- Minimal Express app that exposes the MCP SSE endpoints
const app = express();
app.use(express.json());

// Keep a single transport per live SSE connection (simple demo)
let transport;

// Health check
app.get("/", (_req, res) => res.status(200).send("OK"));

// SSE stream endpoint (server -> client)
app.get("/sse", async (_req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await mcp.connect(transport);
});

// Messages endpoint (client -> server)
app.post("/messages", async (req, res) => {
  if (!transport || !transport.handlePostMessage) {
    return res.status(400).json({ error: "No active SSE session" });
  }
  try {
    await transport.handlePostMessage(req, res);
  } catch (err) {
    console.error("Message handling error:", err);
    if (!res.headersSent) res.status(500).json({ error: "message handling failed" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`MCP SSE server listening on http://localhost:${PORT} (SSE at /sse)`);
});
