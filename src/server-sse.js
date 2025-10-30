import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();

app.use((req, _res, next) => {
  console.error(`[req] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

const mcp = new McpServer({ name: "hello-mcp-sse", version: "1.0.2" });

mcp.tool("say_hello", {}, async () => {
  return { content: [{ type: "text", text: "Hello from your Render MCP server!" }] };
});

app.get("/", (_req, res) => res.status(200).send("OK"));

app.get("/sse", async (req, res) => {
  // Skip if already sent to prevent the ERR_HTTP_HEADERS_SENT
  if (res.headersSent) return;

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders?.();

  const transport = new SSEServerTransport("/messages", res);
  await mcp.connect(transport);
});

app.post("/messages", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
