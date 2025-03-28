import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHttpTransport } from "@modelcontextprotocol/sdk/server/transport.js";
import { z } from "zod";
import raindropClient from './raindrop.service.js';
import type { SearchParams } from '../types/raindrop.js';
import { createServer, Server } from 'http';
import { createRaindropServer } from './mcp.service.js';

export const createMCPHttpServer = () => {
  // Tracking intervals and streams for proper cleanup
  let activeIntervals: NodeJS.Timeout[] = [];
  let activeStreams: Set<{ isActive: boolean }> = new Set();
  
  const server = new McpServer({
    name: 'raindrop-mcp-http',
    version: '1.0.0',
    description: 'MCP HTTP Server for Raindrop.io bookmarking service',
    capabilities: {
      logging: true,
      streaming: true
    }
  });
  
  setupEventStreams(server, activeIntervals, activeStreams);
  
  // Cleanup function to be returned from factory
  const cleanup = async () => {
    // Clear all intervals
    activeIntervals.forEach(interval => clearInterval(interval));
    activeIntervals = [];
    
    // Terminate all streams
    activeStreams.forEach(stream => {
      stream.isActive = false;
    });
    activeStreams.clear();
  };
  
  return { server, cleanup };
};

function setupEventStreams(server: McpServer, activeIntervals: NodeJS.Timeout[], activeStreams: Set<{ isActive: boolean }>) {
  // The stream tool implementation remains mostly unchanged
  server.tool(
    'streamBookmarks',
    'Stream bookmarks from Raindrop.io with real-time updates',
    {
      search: z.string().optional().describe('Search query for filtering bookmarks'),
      collection: z.string().optional().describe('Collection ID to filter bookmarks'),
      limit: z.number().optional().describe('Maximum number of bookmarks to return')
    },
    async ({ search, collection, limit }: { search?: string; collection?: string; limit?: number }, extra) => {
      // Implementation unchanged, omitted for brevity
      // ...
    }
  );

  server.tool(
    'getActiveStreams', 
    'Get information about currently active streams',
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: `Currently active streams: ${activeStreams.size}`,
          metadata: {
            count: activeStreams.size
          }
        }]
      };
    }
  );
}

// New service using native HTTP transport
export class MCPHttpService {
  private server: McpServer | null = null;
  private cleanup: (() => Promise<void>) | null = null;
  private httpServer: Server | null = null;
  
  public async start(port: number = 3001): Promise<void> {
    // Create MCP server using the same configuration as STDIO transport
    const { server, cleanup } = createRaindropServer();
    this.server = server;
    this.cleanup = cleanup;
    
    // Create HTTP server using native Node.js HTTP
    const httpServer = createServer();
    this.httpServer = httpServer;
    
    // Import the HTTP transport dynamically to avoid import errors
    // The import path differs between MCP SDK versions
    let transport;
    try {
      // Try the newer import path first (MCP SDK 1.8+)
      const { HttpTransport } = await import("@modelcontextprotocol/sdk/server/http.js");
      transport = new HttpTransport({ httpServer, path: "/api" });
    } catch (error) {
      // Fall back to older import path
      try {
        const { HttpServerTransport } = await import("@modelcontextprotocol/sdk/server/transport.js");
        transport = new HttpServerTransport(httpServer, {
          path: "/api",
          cors: {
            origin: "*",
            methods: ["POST", "OPTIONS"],
            allowedHeaders: ["Content-Type"]
          }
        });
      } catch (importError) {
        process.stderr.write(`Failed to import HTTP transport: ${importError}\n`);
        throw importError;
      }
    }
    
    // Connect MCP server to transport
    await server.connect(transport);
    
    // Start HTTP server
    return new Promise<void>((resolve) => {
      httpServer.listen(port, () => {
        if (process.env.NODE_ENV === 'development') {
          process.stderr.write(`HTTP Server running on port ${port}\n`);
        }
        resolve();
      });
    });
  }
  
  public async stop(): Promise<void> {
    if (this.cleanup) {
      await this.cleanup();
    }
    
    if (this.server) {
      await this.server.close();
    }
    
    if (this.httpServer) {
      return new Promise<void>((resolve, reject) => {
        this.httpServer?.close((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    return Promise.resolve();
  }
}

// Export a singleton instance
export const mcpHttpService = new MCPHttpService();