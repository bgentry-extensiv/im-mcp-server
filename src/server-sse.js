import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();

// Basic request logging (shows in Render logs)
app.use((req, _res, next) => {
  console.error(`[req] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Minimal MCP server and a test tool
const mcp = new McpServer({ name: "hello-mcp-sse", version: "1.0.5" });
mcp.tool("say_hello", {}, async () => {
  return { content: [{ type: "text", text: "Hello from your Render MCP server!" }] };
});

// Health
app.get("/", (_req, res) => res.status(200).send("OK"));

// Proxies sometimes send HEAD to probe /sse — reply OK without starting SSE
app.head("/sse", (_req, res) => res.status(200).end());

// SSE stream endpoint (server -> client)
// Let the SDK manage SSE headers internally.
app.get("/sse", async (_req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await mcp.connect(transport);
});

// Messages endpoint (client -> server)
// Robustly detect the correct static handler on the installed SDK.
app.post("/messages", async (req, res) => {
  try {
    // List possible handler names (covering known SDK variants)
    const candidates = [
      "handlePost",          // newer SDKs
      "handlePostMessage",   // older SDKs
      "handle",              // fallback seen in some builds
    ];

    let picked = null;
    for (const name of candidates) {
      if (typeof SSEServerTransport?.[name] === "function") {
        picked = name;
        break;
      }
    }

    if (!picked) {
      const keys = Object.getOwnPropertyNames(SSEServerTransport || {});
      console.error(
        "No SSE POST handler found on SSEServerTransport. Static keys:",
        keys
      );
      if (!res.headersSent) {
        return res.status(501).json({
          error: "SSE handler unavailable on this SDK build",
          knownHandlers: candidates,
          availableKeys: keys,
        });
      }
      return;
    }

    console.error(`Using SSEServerTransport.${picked} for POST /messages`);
    await SSEServerTransport[picked](req, res); // call the discovered handler
  } catch (err) {
    console.error("Message handling error:", err);
    if (!res.headersSent) res.status(500).json({ error: "message handling failed" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`✅ MCP SSE server listening on :${PORT} (SSE at /sse)`);
});
