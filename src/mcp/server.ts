#!/usr/bin/env node
/**
 * ATUI Tokens Manager — MCP Server
 *
 * This is a Model Context Protocol (MCP) server that exposes design token
 * management tools to AI assistants like Claude Desktop and Claude Code.
 *
 * MCP is a protocol that lets AI assistants discover and call tools
 * exposed by external servers. This server uses the "stdio" transport,
 * meaning it communicates via stdin/stdout using JSON-RPC messages.
 *
 * CRITICAL: Never use console.log() in this file or any file it imports.
 * stdout is the JSON-RPC communication channel. Use console.error() for
 * all debug/info output — stderr is safe and shows in the MCP client logs.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";

// Explicit model imports — required in standalone Node.js process.
// Mongoose models are registered lazily on first import; in a standalone
// process (outside Next.js) they won't auto-register unless explicitly imported.
import "@/lib/db/models/TokenCollection";

import { registerTokenTools } from "./tools/tokens";
import { registerGroupTools } from "./tools/groups";
import { registerGeneratorTools } from "./tools/generators";
import { registerThemeTools } from "./tools/themes";

// Create the MCP server instance.
// The name and version are advertised to MCP clients during handshake.
const server = new McpServer({
  name: "atui-tokens-manager",
  version: "1.0.0",
});

// Register all tools before connecting to the transport.
// Tools must be registered synchronously before server.connect() is called.
registerTokenTools(server);
registerGroupTools(server);
registerGeneratorTools(server);
registerThemeTools(server);

async function main() {
  // Connect to MongoDB before accepting any tool calls.
  // dbConnect() uses the cached connection pattern — safe to call multiple times.
  await dbConnect();
  console.error("[MCP] MongoDB connected");

  // StdioServerTransport reads from stdin and writes to stdout.
  // This is the standard transport for local MCP servers used with
  // Claude Desktop (configured via claude_desktop_config.json) and
  // Claude Code (configured via mcp.json or the MCP CLI).
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] Token Manager MCP server running on stdio");
}

// Graceful shutdown: disconnect Mongoose when the process is terminated.
// This ensures MongoDB connection is cleanly closed (flushes buffered writes,
// releases connection pool slots).
process.on("SIGINT", async () => {
  console.error("[MCP] Shutting down (SIGINT)...");
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("[MCP] Shutting down (SIGTERM)...");
  await mongoose.disconnect();
  process.exit(0);
});

main().catch((err) => {
  console.error("[MCP] Fatal error:", err);
  process.exit(1);
});
