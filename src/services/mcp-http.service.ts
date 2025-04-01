import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import raindropClient from './raindrop.service.js';
import type { SearchParams, Bookmark } from '../types/raindrop.js';
import { createServer, Server as HttpServer } from 'http';
import { createRaindropServer } from './mcp.service.js';
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Helper function to format bookmarks for MCP
function formatBookmarkAsResource(bookmark: Bookmark) {
  return {
    type: "resource",
    resource: {
      title: bookmark.title || "Untitled Bookmark",
      uri: bookmark.link,
      metadata: {
        id: bookmark._id,
        excerpt: bookmark.excerpt,
        tags: bookmark.tags,
        collectionId: bookmark.collection?.$id,
        created: bookmark.created,
        lastUpdate: bookmark.lastUpdate,
        type: bookmark.type
      }
    },
    annotations: {
      priority: 0.7,
      audience: ["user", "assistant"]
    }
  };
}

// Function to set up streaming tools on the MCP server
function setupStreamingTools(server: McpServer) {
  server.tool(
    'streamBookmarks',
    'Stream bookmarks from Raindrop.io with real-time updates via polling',
    {
      search: z.string().optional().describe('Search query for filtering bookmarks'),
      collection: z.number().optional().describe('Collection ID to filter bookmarks'),
      limit: z.number().optional().describe('Maximum number of bookmarks to return initially')
    },
    async (params: { search?: string; collection?: number; limit?: number }, extra: RequestHandlerExtra) => {
      const { search, collection, limit } = params;
      const searchParams: SearchParams = { search, collection, perPage: limit };

      try {
        // Initial fetch
        const initialData = await raindropClient.getBookmarks(searchParams);
        const initialContent = initialData.items.map(formatBookmarkAsResource);

        // Return an AsyncIterable stream
        return {
          content: initialContent,
          stream: (async function* () {
            let lastCheckTime = new Date();

            while (!extra.signal?.aborted) {
              try {
                await new Promise(resolve => setTimeout(resolve, 30000));
                if (extra.signal?.aborted) break;

                const pollParams: SearchParams = {
                  search,
                  collection,
                  since: lastCheckTime.toISOString()
                };
                const currentTime = new Date();

                const updatedData = await raindropClient.getBookmarks(pollParams);
                lastCheckTime = currentTime;

                if (updatedData.items.length > 0) {
                  yield {
                    content: updatedData.items.map(bookmark => {
                      const resource = formatBookmarkAsResource(bookmark);
                      if (resource.annotations) resource.annotations.priority = 0.8;
                      return resource;
                    })
                  };
                }
              } catch (pollError) {
                process.stderr.write(`Polling error in streamBookmarks: ${pollError instanceof Error ? pollError.message : String(pollError)}\n`);
                if (extra.signal?.aborted) break;
              }
            }
          })()
        };
      } catch (initialError) {
        process.stderr.write(`Initial fetch error in streamBookmarks: ${initialError instanceof Error ? initialError.message : String(initialError)}\n`);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to start bookmark stream: ${initialError instanceof Error ? initialError.message : String(initialError)}` }]
        };
      }
    }
  );
}

// Service class to manage the MCP server with HTTP/SSE transport
export class MCPHttpService {
  private mcpServer: McpServer | null = null;
  private httpServer: HttpServer | null = null;
  private cleanupCallback: (() => Promise<void>) | null = null;

  public async start(port: number = 3001): Promise<void> {
    if (this.httpServer?.listening) {
      process.stderr.write("HTTP Server is already running.\n");
      return;
    }

    try {
      const { server, cleanup } = await createRaindropServer();
      this.mcpServer = server;
      this.cleanupCallback = cleanup;

      setupStreamingTools(this.mcpServer);

      this.httpServer = createServer();

      const transport = new SSEServerTransport({
        httpServer: this.httpServer,
        path: "/api",
        cors: {
          origin: "*",
          methods: ["POST", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
        }
      });

      await this.mcpServer.connect(transport);

      await new Promise<void>((resolve, reject) => {
        this.httpServer?.on('error', (error) => {
          process.stderr.write(`HTTP Server error: ${error.message}\n`);
          this.stop().finally(() => reject(error));
        });

        this.httpServer?.listen(port, () => {
          if (process.env.NODE_ENV !== 'test') {
            process.stderr.write(`MCP HTTP Server running on port ${port}, accessible at /api\n`);
          }
          resolve();
        });
      });

    } catch (error) {
      process.stderr.write(`Failed to start MCP HTTP Service: ${error instanceof Error ? error.message : String(error)}\n`);
      await this.stop();
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.httpServer?.listening) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close((err) => {
          if (err) {
            process.stderr.write(`Error closing HTTP server: ${err.message}\n`);
          } else if (process.env.NODE_ENV !== 'test') {
            process.stderr.write("HTTP Server stopped.\n");
          }
          resolve();
        });
      });
      this.httpServer = null;
    }

    if (this.mcpServer) {
      try {
        await this.mcpServer.close();
        if (process.env.NODE_ENV !== 'test') {
          process.stderr.write("MCP Server connection closed.\n");
        }
      } catch (error) {
        process.stderr.write(`Error closing MCP server: ${error instanceof Error ? error.message : String(error)}\n`);
      }
      this.mcpServer = null;
    }

    if (this.cleanupCallback) {
      try {
        await this.cleanupCallback();
        if (process.env.NODE_ENV !== 'test') {
          process.stderr.write("MCP Core Service cleanup executed.\n");
        }
      } catch (error) {
        process.stderr.write(`Error during MCP cleanup callback: ${error instanceof Error ? error.message : String(error)}\n`);
      }
      this.cleanupCallback = null;
    }
  }
}

// Export a singleton instance for convenience
export const mcpHttpService = new MCPHttpService();
