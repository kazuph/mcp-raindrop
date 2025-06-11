# HTTP SSE Transport for Raindrop MCP

This document explains the HTTP Server-Sent Events (SSE) implementation for the Raindrop MCP server, providing both modern Streamable HTTP and legacy SSE transport support.

## Transport Types

### 1. Streamable HTTP Transport (Recommended)

The modern, recommended transport that supports:
- Session management with unique session IDs
- Proper request/response handling
- Server-to-client notifications via SSE
- Session termination via DELETE requests
- Better error handling and resilience

**Endpoint:** `/mcp`
**Methods:** GET, POST, DELETE

### 2. Legacy SSE Transport (Backwards Compatibility)

Provided for backwards compatibility with older MCP clients:
- Traditional SSE connection
- Separate message posting endpoint
- Basic session tracking

**Endpoints:** 
- SSE Connection: `/sse`
- Message Posting: `/messages`

## Getting Started

### 1. Start the HTTP Server

```bash
# Development mode with auto-reload
bun run dev:http

# Production mode
bun run start:http

# Alternative legacy SSE server
bun run start:sse
```

The server will start on port 3001 (or the PORT environment variable) and display:

```
🚀 Raindrop MCP Server started successfully!
📡 Streamable HTTP (recommended): http://localhost:3001/mcp
📡 Legacy SSE: http://localhost:3001/sse
🏥 Health check: http://localhost:3001/health
📚 API docs: http://localhost:3001/
🔧 Protocol version: 2024-11-05
```

### 2. Test the Connection

```bash
# Test with the included client
bun run src/test-client.ts

# Check server health
curl http://localhost:3001/health
```

### 3. Use with MCP Inspector

```bash
# Debug with Inspector (Streamable HTTP)
bun run inspector:http

# Debug with Inspector (STDIO - original)
bun run inspector
```

## Client Implementation Examples

### Modern Client (Streamable HTTP)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({
  name: 'my-raindrop-client',
  version: '1.0.0'
});

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:3001/mcp')
);

await client.connect(transport);

// Use the client...
const tools = await client.listTools();
```

### Backwards Compatible Client

```typescript
import { createCompatibleClient } from './src/test-client.js';

// Automatically tries Streamable HTTP first, falls back to SSE
const client = await createCompatibleClient('http://localhost:3001');
```

### Legacy SSE Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({
  name: 'my-sse-client',
  version: '1.0.0'
});

const transport = new SSEClientTransport(
  new URL('http://localhost:3001/sse')
);

await client.connect(transport);
```

## HTTP API Reference

### Health Check
```http
GET /health
```

Returns server status and session information:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "server": "raindrop-mcp",
  "protocol": {
    "version": "2024-11-05",
    "transports": ["streamable-http", "sse"]
  },
  "sessions": {
    "streamable": 0,
    "sse": 0,
    "total": 0
  }
}
```

### Streamable HTTP Endpoint
```http
POST /mcp
Content-Type: application/json
MCP-Session-Id: <session-id> (optional for initialize)

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}
```

### SSE Endpoints
```http
# Establish SSE connection
GET /sse

# Send messages
POST /messages?sessionId=<session-id>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

## Session Management

### Streamable HTTP Sessions
- Automatic session ID generation on initialize
- Session state maintained server-side
- Clean session termination with DELETE requests
- Automatic cleanup on connection close

### SSE Sessions
- UUID-based session tracking
- Manual session management via query parameters
- Connection cleanup on SSE stream close

## Error Handling

The server provides comprehensive error handling:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Bad Request: No valid session ID provided"
  },
  "id": null
}
```

Common error codes:
- `-32000`: Bad Request (missing session, invalid request)
- `-32603`: Internal Server Error
- `-32602`: Invalid Method/Parameters

## CORS Support

The server includes CORS headers for web client support:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version`

## Environment Variables

- `PORT`: Server port (default: 3001)
- `RAINDROP_ACCESS_TOKEN`: Your Raindrop.io access token
- `MCP_SERVER_URL`: Server URL for client testing (default: http://localhost:3001)

## Debugging

### Enable Debug Logging
Set environment variable for more verbose logging:
```bash
DEBUG=mcp:* bun run start:http
```

### Using MCP Inspector
The MCP Inspector provides a web interface for testing:
```bash
bun run inspector:http
```

Then open the provided URL to interact with your server visually.

### Health Monitoring
Monitor active sessions and server status:
```bash
curl http://localhost:3001/health | jq
```

## Protocol Compliance

This implementation follows the Model Context Protocol specification:
- Protocol version: 2024-11-05
- JSON-RPC 2.0 compliant
- Proper capability negotiation
- Standard error codes and messages
- Session lifecycle management

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure server is running: `bun run start:http`
   - Check port availability: `lsof -i :3001`

2. **Session Not Found**
   - Verify session ID in headers
   - Check session hasn't expired or been cleaned up

3. **CORS Errors**
   - Server includes permissive CORS headers
   - Check browser console for specific CORS issues

4. **Transport Fallback Not Working**
   - Ensure both endpoints are accessible
   - Check network connectivity to both `/mcp` and `/sse`

### Debug Steps

1. Check server health: `curl http://localhost:3001/health`
2. Test with included client: `bun run src/test-client.ts`
3. Use MCP Inspector: `bun run inspector:http`
4. Enable debug logging and check console output

## Migration from Legacy SSE

If you're currently using the legacy SSE implementation:

1. **No changes required** - The server supports both transports
2. **Recommended**: Update clients to use Streamable HTTP for better reliability
3. **Gradual migration**: Use the backwards-compatible client approach
4. **Testing**: Use the included test client to verify both transports work

The legacy SSE endpoints will continue to work, but new development should use the Streamable HTTP transport for better performance and reliability.
