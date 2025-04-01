import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import raindropClient from './raindrop.service.js';
import type { SearchParams, Bookmark } from '../types/raindrop.js';
import { createServer, Server as HttpServer } from 'http';
import { createRaindropServer } from './mcp.service.js';
import type { RequestHandlerExtra, ContentChunk, ContentChunkResource } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Helper function to format bookmarks for MCP
function formatBookmarkAsResource(bookmark: Bookmark): ContentChunk {
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
      priority: 0.7, // Default priority
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
      // Limit is not directly supported by the underlying getBookmarks, but kept for potential future use
      limit: z.number().optional().describe('Maximum number of bookmarks to return initially') 
    },
    async (params: { search?: string; collection?: number; limit?: number }, extra: RequestHandlerExtra) => {
      const { search, collection, limit } = params;
      const searchParams: SearchParams = { search, collection, perPage: limit }; // Use limit for perPage initially

      try {
        // Initial fetch
        const initialData = await raindropClient.getBookmarks(searchParams);
        const initialContent = initialData.items.map(formatBookmarkAsResource);

        // Return an AsyncIterable stream
        return {
          content: initialContent, // Send initial batch immediately
          stream: (async function*() {
            let lastCheckTime = new Date(); // Use Date object

            // Polling loop
            while (!extra.signal?.aborted) {
              try {
                // Wait for 30 seconds before the next poll
                await new Promise(resolve => setTimeout(resolve, 30000));

                // Check for cancellation again after waiting
                if (extra.signal?.aborted) break;

                const pollParams: SearchParams = {
                  search,
                  collection,
                  since: lastCheckTime.toISOString() // Fetch items modified since the last check
                };
                const currentTime = new Date(); // Capture time before the API call

                const updatedData = await raindropClient.getBookmarks(pollParams);
                lastCheckTime = currentTime; // Update last check time *after* successful fetch

                if (updatedData.items.length > 0) {
                  // Yield new bookmarks found since the last poll
                  yield {
                    content: updatedData.items.map(bookmark => {
                      const resource = formatBookmarkAsResource(bookmark);
                      // Optionally increase priority for updates
                      if (resource.annotations) resource.annotations.priority = 0.8; 
                      return resource;
                    })
                  };
                }
                // If no updates, the loop continues to the next poll cycle
              } catch (pollError) {
                 // Log polling errors to stderr but continue polling unless aborted
                 process.stderr.write(`Polling error in streamBookmarks: ${pollError instanceof Error ? pollError.message : String(pollError)}\n`);
                 // Optional: Implement backoff or stop polling after too many errors
                 if (extra.signal?.aborted) break; 
              }
            }
          })() // Immediately invoke the async generator
        };
      } catch (initialError) {
        // Handle errors during the initial fetch
        process.stderr.write(`Initial fetch error in streamBookmarks: ${initialError instanceof Error ? initialError.message : String(initialError)}\n`);
        // Return an MCP error response
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to start bookmark stream: ${initialError instanceof Error ? initialError.message : String(initialError)}` }]
        };
      }
    }
  );

  // Add other streaming-related tools if needed, e.g., getActiveStreams (though managing this state becomes more complex with async iterables)
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
      // Create the core MCP server instance and get cleanup function
      const { server, cleanup } = await createRaindropServer();
      this.mcpServer = server;
      this.cleanupCallback = cleanup;

      // Setup streaming tools on the created server instance
      setupStreamingTools(this.mcpServer);

      // Create the native HTTP server
      this.httpServer = createServer();

      // Configure the SSE transport
      const transport = new SSEServerTransport({
        httpServer: this.httpServer,
        path: "/api", // Standard API path
        cors: { // Basic CORS for development/Inspector
          origin: "*", // Restrict in production
          methods: ["POST", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
        }
      });

      // Connect the MCP server to the transport
      await this.mcpServer.connect(transport);

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.httpServer?.on('error', (error) => {
          process.stderr.write(`HTTP Server error: ${error.message}\n`);
          this.stop().finally(() => reject(error)); // Attempt cleanup on error
        });

        this.httpServer?.listen(port, () => {
          if (process.env.NODE_ENV !== 'test') { // Avoid logging during tests
             process.stderr.write(`MCP HTTP Server running on port ${port}, accessible at /api\n`);
          }
          resolve();
        });
      });

    } catch (error) {
      process.stderr.write(`Failed to start MCP HTTP Service: ${error instanceof Error ? error.message : String(error)}\n`);
      await this.stop(); // Attempt cleanup if start fails
      throw error; // Re-throw the error after cleanup attempt
    }
  }

  public async stop(): Promise<void> {
    // Close the HTTP server first
    if (this.httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer?.close((err) => {
          if (err) {
            process.stderr.write(`Error closing HTTP server: ${err.message}\n`);
            // Don't reject here, proceed to MCP cleanup
          } else if (process.env.NODE_ENV !== 'test') {
             process.stderr.write("HTTP Server stopped.\n");
          }
          resolve();
        });
      });
      this.httpServer = null;
    }

    // Close the MCP server connection
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

    // Call the specific cleanup function from createRaindropServer (which might include stopping the base service)
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
