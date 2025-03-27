import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import raindropService from './raindrop.service.js';
import config from "../config/config.js";
import type { Collection, Bookmark, SearchParams } from "../types/raindrop.js";

export class RaindropMCPService {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service',
      capabilities: {
        logging: false
      }
    });

    this.initializeTools();
  }

  private initializeTools() {
    // Collection operations
    this.server.registerTool({
      name: 'getCollection',
      description: 'Get a specific collection by ID',
      parameters: z.object({
        id: z.number().describe('Collection ID')
      }),
      execute: async ({ id }: { id: number }) => {
        try {
          const collection = await raindropService.getCollection(id);
          return {
            content: [{
              type: "text",
              text: collection.title,
              metadata: {
                id: collection._id,
                count: collection.count,
                public: collection.public,
                created: collection.created,
                lastUpdate: collection.lastUpdate
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to get collection: ${(error as Error).message}`);
        }
      },
      visibility: 'public'
    });

    this.server.registerTool({
      name: 'getCollections',
      description: 'Get all collections',
      parameters: z.object({}),
      execute: async () => {
        try {
          const collections = await raindropService.getCollections();
          return {
            content: collections.map(collection => ({
              type: "text",
              text: collection.title,
              metadata: {
                id: collection._id,
                count: collection.count,
                public: collection.public,
                created: collection.created,
                lastUpdate: collection.lastUpdate
              }
            }))
          };
        } catch (error) {
          throw new Error(`Failed to get collections: ${(error as Error).message}`);
        }
      },
      visibility: 'public'
    });

    this.server.registerTool({
      name: 'getBookmark',
      description: 'Get a specific bookmark by ID',
      parameters: z.object({
        id: z.number().describe('Bookmark ID')
      }),
      execute: async ({ id }: { id: number }) => {
        try {
          const bookmark = await raindropService.getBookmark(id);
          return {
            content: [{
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
            }]
          };
        } catch (error) {
          throw new Error(`Failed to get bookmark: ${(error as Error).message}`);
        }
      },
      visibility: 'public'
    });

    this.server.registerTool({
      name: 'updateBookmark',
      description: 'Update an existing bookmark',
      parameters: z.object({
        id: z.number().describe('Bookmark ID'),
        title: z.string().optional().describe('Title of the bookmark'),
        excerpt: z.string().optional().describe('Short excerpt or description'),
        tags: z.array(z.string()).optional().describe('List of tags'),
        collectionId: z.number().optional().describe('Collection ID to move the bookmark to')
      }),
      execute: async ({ id, ...updates }: { id: number; title?: string; excerpt?: string; tags?: string[]; collectionId?: number }) => {
        try {
          const updatedBookmark = await raindropService.updateBookmark(id, updates);
          return {
            content: [{
              type: "resource",
              resource: {
                text: updatedBookmark.title || "Untitled Bookmark",
                uri: updatedBookmark.link,
                metadata: {
                  id: updatedBookmark._id,
                  excerpt: updatedBookmark.excerpt,
                  tags: updatedBookmark.tags,
                  collectionId: updatedBookmark.collection?.$id,
                  created: updatedBookmark.created,
                  lastUpdate: updatedBookmark.lastUpdate,
                  type: updatedBookmark.type
                }
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to update bookmark: ${(error as Error).message}`);
        }
      },
      visibility: 'public'
    });

    this.server.registerTool({
      name: 'mergeTags',
      description: 'Merge multiple tags into one destination tag',
      parameters: z.object({
        sourceTags: z.array(z.string()).describe('List of source tags to merge'),
        destinationTag: z.string().describe('Destination tag name')
      }),
      execute: async ({ sourceTags, destinationTag }: { sourceTags: string[]; destinationTag: string }) => {
        try {
          await raindropService.mergeTags(sourceTags, destinationTag);
          return {
            content: [{
              type: "text",
              text: `Merged tags [${sourceTags.join(', ')}] into "${destinationTag}".`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to merge tags: ${(error as Error).message}`);
        }
      },
      visibility: 'public'
    });

    this.server.registerTool({
      name: 'deleteTags',
      description: 'Delete tags from all bookmarks',
      parameters: z.object({
        tags: z.array(z.string()).describe('List of tags to delete')
      }),
      execute: async ({ tags }: { tags: string[] }) => {
        try {
          await raindropService.deleteTags(tags);
          return {
            content: [{
              type: "text",
              text: `Deleted tags: [${tags.join(', ')}].`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to delete tags: ${(error as Error).message}`);
        }
      },
      visibility: 'public'
    });
  }

  async start() {
    const transport = new StdioServerTransport(process.stdin, process.stdout);
    await this.server.connect(transport);
    return this.server;
  }

  async stop() {
    await this.server.close();
  }
}

// Create singleton and export factory function
export function createRaindropServer() {
  const service = new RaindropMCPService();
  return { 
    server: service.start(),
    cleanup: () => service.stop()
  };
}

export default RaindropMCPService;
