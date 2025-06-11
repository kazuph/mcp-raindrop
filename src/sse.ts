import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { createRaindropServer } from './services/mcp.service.js';
import { config } from 'dotenv';

config(); // Load .env file

const app = express();

// Add middleware for JSON parsing and CORS
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Store transports for session management
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>
};

// Modern Streamable HTTP endpoint (recommended)
app.all('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.streamable[sessionId]) {
      // Reuse existing transport
      transport = transports.streamable[sessionId];
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      // New initialization request
      const { server, cleanup } = createRaindropServer();

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports.streamable[sessionId] = transport;
          console.log(`New session initialized: ${sessionId}`);
        }
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports.streamable[transport.sessionId];
          console.log(`Session closed: ${transport.sessionId}`);
        }
        cleanup();
      };

      // Connect to the MCP server
      await server.connect(transport);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided or invalid initialization',
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Legacy SSE endpoint for backwards compatibility
app.get('/sse', async (req, res) => {
  try {
    console.log("SSE connection established (legacy mode)");
    const { server, cleanup } = createRaindropServer();

    const transport = new SSEServerTransport('/messages', res);
    const sessionId = randomUUID();
    transports.sse[sessionId] = transport;

    res.on("close", () => {
      delete transports.sse[sessionId];
      cleanup();
      console.log(`SSE session closed: ${sessionId}`);
    });

    await server.connect(transport);
  } catch (error) {
    console.error('Error establishing SSE connection:', error);
    if (!res.headersSent) {
      res.status(500).send('Failed to establish SSE connection');
    }
  }
});

// Legacy message endpoint for older SSE clients
app.post('/messages', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    const transport = transports.sse[sessionId];

    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'No transport found for sessionId',
        },
        id: null,
      });
    }
  } catch (error) {
    console.error('Error handling SSE message:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    protocol: 'mcp',
    transports: ['streamable-http', 'sse'],
    sessions: {
      streamable: Object.keys(transports.streamable).length,
      sse: Object.keys(transports.sse).length
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Raindrop MCP Server running on port ${PORT}`);
  console.log(`📡 Streamable HTTP: http://localhost:${PORT}/mcp`);
  console.log(`📡 Legacy SSE: http://localhost:${PORT}/sse`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});