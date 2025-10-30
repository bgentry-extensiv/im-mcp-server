import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();

// --- basic logging so we can see requests in Render logs
app.use((req, _res, next) => {
  console.error(`[req] ${req.method} ${req.url}`);
  next();
});

// Parse JSON bodies for /messages
app.use(express.json());

// ---- Basic MCP server with one test tool
const mcp = new McpServer({ name: "hello-mcp-sse", version: "1.0.1" });

mcp.tool("say_hello", {}, async () => {
  return { content: [{ type: "text", text: "Hello from your MCP SSE server!" }] };
});

// Health
app.get("/", (_req, res) => res.status(200).send("OK"));

// SSE stream endpoint (server -> client)
app.get("/sse", async (req, res) => {
  // Explicit SSE headers (some proxies like to see these up front)
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Optional CORS header (harmless for server-to-server, can help in some setups)
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Wire up MCP SSE transport
  const transport = new SSEServerTransport("/messages", res);
  await mcp.connect(transport);
});

// Messages endpoint (client -> server)
app.post("/messages", async (req, res) => {
  // Optional CORS for POST
  res.setHeader("Access-Control-Allow-Origin", "*");

  // We don’t persist the transport—SSEServerTransport provides a handler
  try {
    await SSEServerTransport.handlePostMessage(req, res);
  } catch (err) {
    console.error("Message handling error:", err);
    if (!res.headersSent) res.status(500).json({ error: "message handling failed" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`MCP SSE server listening on :${PORT} (SSE at /sse)`);
});

