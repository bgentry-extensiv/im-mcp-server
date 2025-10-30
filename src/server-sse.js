import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();

// Basic request logging
app.use((req, _res, next) => {
  console.error(`[req] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Minimal MCP server with one tool
const mcp = new McpServer({ name: "hello-mcp-sse", version: "1.0.3" });
mcp.tool("say_hello", {}, async () => {
  return { content: [{ type: "text", text: "Hello from your Render MCP server!" }] };
});

// Health
app.get("/", (_req, res) => res.status(200).send("OK"));

// IMPORTANT: handle proxy health probes that use HEAD on /sse
app.head("/sse", (_req, res) => {
  // Respond OK without starting SSE or setting headers twice
  res.status(200).end();
});

// SSE stream endpoint (server -> client)
// Let the SDK set the correct SSE headers; do NOT set headers manually.
app.get("/sse", async (_req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await mcp.connect(transport);
});

// Messages endpoint (client -> server)
app.post("/messages", async (req, res) => {
  try {
    await SSEServerTransport.handlePostMessage(req, res);
  } catch (err) {
    console.error("Message handling error:", err);
    if (!res.headersSent) res.status(500).json({ error: "message handling failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`✅ MCP SSE server listening on :${PORT} (SSE at /sse)`);
});
