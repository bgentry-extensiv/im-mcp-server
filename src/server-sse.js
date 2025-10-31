import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();

// Simple request logging (shows up in Render logs)
app.use((req, _res, next) => {
  console.error(`[req] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Minimal MCP server with one test tool
const mcp = new McpServer({ name: "hello-mcp-sse", version: "1.0.4" });
mcp.tool("say_hello", {}, async () => {
  return { content: [{ type: "text", text: "Hello from your Render MCP server!" }] };
});

// Health check
app.get("/", (_req, res) => res.status(200).send("OK"));

// Handle proxy health probes that use HEAD on /sse
app.head("/sse", (_req, res) => {
  res.status(200).end();
});

// SSE stream endpoint (server -> client)
// Let the SDK manage the SSE headers.
app.get("/sse", async (_req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await mcp.connect(transport);
});

// Messages endpoint (client -> server)
// NOTE: Newer SDKs expose handlePost (not handlePostMessage).
app.post("/messages", async (req, res) => {
  try {
    await SSEServerTransport.handlePost(req, res);
  } catch (err) {
    console.error("Message handling error:", err);
    if (!res.headersSent) res.status(500).json({ error: "message handling failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`✅ MCP SSE server listening on :${PORT} (SSE at /sse)`);
});
