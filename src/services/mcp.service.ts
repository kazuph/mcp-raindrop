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
        logging: true
      }
    });

    this.initializeTools();
  }

  private initializeTools() {
    // Collection operations
    this.server.addTool(
      'getCollection',
      {
        description: 'Get a specific collection by ID',
        parameters: {
          type: 'object',
          properties: {
            id: {
              description: 'Collection ID',
              type: 'number'
            }
          },
          required: ['id']
        }
      },
      async ({ id }: { id: number }) => {
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
      { visibility: 'public' }
    );

    this.server.addTool(
      'getCollections',
      {
        description: 'Get all collections',
        parameters: {
          type: 'object',
          properties: {},
        }
      },
      async () => {
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
      { visibility: 'public' }
    );

    this.server.addTool(
      'getBookmark',
      {
        description: 'Get a specific bookmark by ID',
        parameters: {
          type: 'object',
          properties: {
            id: {
              description: 'Bookmark ID',
              type: 'number'
            }
          },
          required: ['id']
        }
      },
      async ({ id }: { id: number }) => {
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
                  collectionId: bookmark.collection.$id,
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
      { visibility: 'public' }
    );

    this.server.addTool(
      'updateBookmark',
      {
        description: 'Update an existing bookmark',
        parameters: {
          type: 'object',
          properties: {
            id: {
              description: 'Bookmark ID',
              type: 'number'
            },
            title: {
              description: 'Title of the bookmark',
              type: 'string'
            },
            excerpt: {
              description: 'Short excerpt or description',
              type: 'string'
            },
            tags: {
              description: 'List of tags',
              type: 'array',
              items: { type: 'string' }
            },
            collectionId: {
              description: 'Collection ID to move the bookmark to',
              type: 'number'
            }
          },
          required: ['id']
        }
      },
      async ({ id, ...updates }: { id: number; title?: string; excerpt?: string; tags?: string[]; collectionId?: number }) => {
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
                  collectionId: updatedBookmark.collection.$id,
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
      { visibility: 'public' }
    );

    this.server.addTool(
      'mergeTags',
      {
        description: 'Merge multiple tags into one destination tag',
        parameters: {
          type: 'object',
          properties: {
            sourceTags: {
              description: 'List of source tags to merge',
              type: 'array',
              items: { type: 'string' }
            },
            destinationTag: {
              description: 'Destination tag name',
              type: 'string'
            }
          },
          required: ['sourceTags', 'destinationTag']
        }
      },
      async ({ sourceTags, destinationTag }: { sourceTags: string[]; destinationTag: string }) => {
        try {
          await raindropService.mergeTags(sourceTags, destinationTag, true);
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
      { visibility: 'public' }
    );

    this.server.addTool(
      'deleteTags',
      {
        description: 'Delete tags from all bookmarks',
        parameters: {
          type: 'object',
          properties: {
            tags: {
              description: 'List of tags to delete',
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['tags']
        }
      },
      async ({ tags }: { tags: string[] }) => {
        try {
          await raindropService.deleteTags(tags, true);
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
      { visibility: 'public' }
    );
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
