import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import raindropClient from './raindrop.service';
import config from '../config/config';
import type { SearchParams } from '../types/raindrop.js';

export class MCPSSEService {
  private mcpServer: McpServer;

  constructor(port: number) {
    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: 'raindrop-mcp-sse',
      version: '1.0.0',
      description: 'MCP SSE Server for Raindrop.io bookmarking service'
    });

    // this.mcpServer.server.sendLoggingMessage({
    //   level: "info",
    //   data: "Setting up MCP SSE handlers for Raindrop.io streaming"
    // });

    // Define the SSE function for streaming Raindrop data
    this.mcpServer.tool(
      'streamBookmarks',
      'Stream bookmarks from Raindrop.io with real-time updates',
      {
        search: z.string().optional().describe('Search query for filtering bookmarks'),
        collection: z.string().optional().describe('Collection ID to filter bookmarks'),
        limit: z.number().optional().describe('Maximum number of bookmarks to return')
      },
      async ({ search, collection, limit }: { search?: string; collection?: string; limit?: number }, extra) => {
        let isStreaming = true;
        let interval: NodeJS.Timeout;

        try {
          // Initial data fetch
          const searchParams: SearchParams = { 
            search, 
            collection: collection ? Number(collection) : undefined
          };
          const bookmarks = await raindropClient.getBookmarks(searchParams);
          
          // Send initial data
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
              }
            })),
            stream: new Promise((resolve, reject) => {
              interval = setInterval(async () => {
                if (!isStreaming) {
                  clearInterval(interval);
                  resolve(undefined);
                  return;
                }

                try {
                  const updatedParams: SearchParams = { 
                    search, 
                    collection: collection ? Number(collection) : undefined,
                    since: new Date(Date.now() - 60000) 
                  };
                  
                  const updatedBookmarks = await raindropClient.getBookmarks(updatedParams);
                  
                  if (updatedBookmarks.items.length > 0) {
                    return {
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
                        }
                      }))
                    };
                  }
                } catch (error) {
                  isStreaming = false;
                  clearInterval(interval);
                  reject(error);
                }
              }, 30000);

              // Clean up on cancel
              extra.signal?.addEventListener('abort', () => {
                isStreaming = false;
                clearInterval(interval);
                resolve(undefined);
              });
            })
          };
        } catch (error) {
          throw error;
        }
      }
    );
  }

  public async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport(process.stdin, process.stdout);
      await this.mcpServer.connect(transport);
      
      // this.mcpServer.server.sendLoggingMessage({
      //   level: "info",
      //   data: "Starting Raindrop MCP SSE server"
      // });
      
      // this.mcpServer.server.sendLoggingMessage({
      //   level: "info",
      //   data: "Raindrop MCP SSE server started successfully"
      // });
    } catch (error) {
      throw error;
    }
  }

  public async stop(): Promise<void> {
    // this.mcpServer.server.sendLoggingMessage({
    //   level: "info",
    //   data: "Stopping Raindrop MCP SSE server"
    // });
    // Nothing needed here as the StdioServerTransport handles cleanup
  }
}

export const mcpSSEService = new MCPSSEService(config.port);
