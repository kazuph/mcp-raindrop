import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import raindropClient from './raindrop.service.js';
import type { SearchParams } from '../types/raindrop.js';
import { createServer, Server } from 'http';
import { createRaindropServer } from './mcp.service.js';
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
// Attempt to import HttpTransport directly - remove .js extension
import { HttpTransport } from "@modelcontextprotocol/sdk/server/sse.js"; 
// Remove the unused createMCPHttpServer function if MCPHttpService is used directly
// export const createMCPHttpServer = () => { ... };

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
    async ({ search, collection, limit }: { search?: string; collection?: string; limit?: number }, extra: RequestHandlerExtra) => {
      // Object to track the stream state
      const streamState = { isActive: true };
      activeStreams.add(streamState);
      
      try {
        const searchParams: SearchParams = { 
          search, 
          collection: collection ? Number(collection) : undefined,
          // Note: 'limit' is not directly supported by raindropClient.getBookmarks, 
          // it might need custom handling if required.
        };
        
        // Initial bookmarks fetch
        const bookmarks = await raindropClient.getBookmarks(searchParams);
        
        // Setup stream with enhanced error handling
        return {
          content: bookmarks.items.map(bookmark => ({
            type: "resource",
            resource: {
              text: bookmark.title || "Untitled Bookmark",
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
              priority: 0.7, // Medium priority
              audience: ["user", "assistant"]
            }
          })),
          stream: new Promise((resolve, reject) => {
            let interval: NodeJS.Timeout;
            let lastCheckTime = Date.now(); // Track the time of the last check

            // Handle uncaught errors specific to this stream
            const handleError = (err: any) => {
              streamState.isActive = false;
              if (interval) {
                 clearInterval(interval);
                 const index = activeIntervals.indexOf(interval);
                 if (index > -1) {
                   activeIntervals.splice(index, 1);
                 }
              }
              // Removed global uncaughtException handler - handle errors locally
              // process.removeListener('uncaughtException', handleError); 
              activeStreams.delete(streamState);
              reject(err); // Reject the stream promise
            };
            
            // Removed global uncaughtException listener - prefer local try/catch
            // process.on('uncaughtException', handleError);
            
            // Poll for updates
            interval = setInterval(async () => {
              if (!streamState.isActive) {
                clearInterval(interval);
                const index = activeIntervals.indexOf(interval);
                if (index > -1) {
                  activeIntervals.splice(index, 1);
                }
                // process.removeListener('uncaughtException', handleError); // Removed
                resolve(undefined); // Resolve with undefined when stream ends normally
                return;
              }
              
              try {
                const currentTime = Date.now();
                // Check for recent bookmarks since the last check
                const updatedParams: SearchParams = { 
                  search, 
                  collection: collection ? Number(collection) : undefined,
                  // Fetch items modified since the last check time
                  since: new Date(lastCheckTime).toISOString() 
                };
                lastCheckTime = currentTime; // Update last check time for the next poll
                
                const updatedBookmarks = await raindropClient.getBookmarks(updatedParams);
                
                if (updatedBookmarks.items.length > 0) {
                  // Resolve the stream promise with the new content chunk
                  resolve({
                    content: updatedBookmarks.items.map(bookmark => ({
                      type: "resource",
                      resource: {
                        text: bookmark.title || "Untitled Bookmark",
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
                        priority: 0.8, // Higher priority for new items
                        audience: ["user", "assistant"]
                      }
                    }))
                  });
                  // Stop polling after sending the update chunk
                  streamState.isActive = false; 
                  clearInterval(interval);
                  const index = activeIntervals.indexOf(interval);
                  if (index > -1) {
                    activeIntervals.splice(index, 1);
                  }
                  // process.removeListener('uncaughtException', handleError); // Removed
                  activeStreams.delete(streamState);

                }
                // If no updates, the interval continues polling. The promise remains pending.
              } catch (error) {
                // Handle errors during polling
                handleError(error); 
              }
            }, 30000); // Poll every 30 seconds
            
            // Add interval to the registry for cleanup
            activeIntervals.push(interval);
            
            // Listen for client disconnection (abort signal)
            extra.signal?.addEventListener('abort', () => {
              streamState.isActive = false;
              clearInterval(interval);
              const index = activeIntervals.indexOf(interval);
              if (index > -1) {
                activeIntervals.splice(index, 1);
              }
              // process.removeListener('uncaughtException', handleError); // Removed
              activeStreams.delete(streamState);
              resolve(undefined); // Resolve with undefined when aborted
            });
          })
        };
      } catch (error) {
        // Handle errors during initial setup
        streamState.isActive = false;
        activeStreams.delete(streamState);
        // Ensure the error is propagated correctly as an MCP error response
        return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]
        };
      }
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
    // Explicitly type the destructured result from createRaindropServer
    const { server, cleanup }: { server: McpServer; cleanup: () => Promise<void> } = await createRaindropServer(); 
    this.server = server;
    this.cleanup = cleanup;
    
    // Create HTTP server using native Node.js HTTP
    const httpServer = createServer();
    this.httpServer = httpServer;
    
    // Use the imported HttpTransport directly
    // Remove the dynamic import logic for now
    const transport = new HttpTransport({ 
        httpServer, 
        path: "/api", // Ensure this path matches client expectations
        // Add CORS options if needed by your client (e.g., the Inspector)
        cors: {
            origin: "*", // Be more specific in production
            methods: ["POST", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"], // Add headers required by MCP/client
        }
    });
    
    // Check if the server was initialized before connecting
    if (!this.server) {
        throw new Error("MCP server instance was not properly initialized.");
    }
    
    // Connect MCP server to transport
    await this.server.connect(transport); 
    
    // Start HTTP server
    return new Promise<void>((resolve) => {
      // Add error handling for server start
      httpServer.on('error', (error) => {
        process.stderr.write(`HTTP Server error: ${error.message}\n`);
        process.exit(1); // Exit if server fails to start
      });

      httpServer.listen(port, () => {
        // Use stderr for dev info, avoid console.log
        if (process.env.NODE_ENV === 'development') {
          process.stderr.write(`MCP HTTP Server running on port ${port}, accessible at /api\n`);
        }
        resolve();
      });
    });
  }
  
  public async stop(): Promise<void> {
    // Call cleanup first
    if (this.cleanup) {
      try {
        await this.cleanup();
      } catch (error) {
         process.stderr.write(`Error during MCP cleanup: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }
    
    // Close the MCP server connection
    if (this.server) {
       try {
        await this.server.close();
       } catch (error) {
         process.stderr.write(`Error closing MCP server: ${error instanceof Error ? error.message : String(error)}\n`);
       }
    }
    
    // Close the HTTP server
    if (this.httpServer && this.httpServer.listening) {
      return new Promise<void>((resolve, reject) => {
        this.httpServer?.close((err?: Error) => {
          if (err) {
            process.stderr.write(`Error closing HTTP server: ${err.message}\n`);
            reject(err);
          } else {
             if (process.env.NODE_ENV === 'development') {
               process.stderr.write(`HTTP Server stopped.\n`);
             }
            resolve();
          }
        });
      });
    }
    
    return Promise.resolve();
  }
}

// Export a singleton instance
export const mcpHttpService = new MCPHttpService();
