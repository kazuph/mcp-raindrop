import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import raindropService from './raindrop.service';
import config from "../config/config";
import type { Collection, Bookmark, SearchParams } from "../types/raindrop.js";

export class RaindropMCPService {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service'
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tool for listing collections
    this.server.tool(
      "getCollections",
      "Retrieve all collections from Raindrop.io",
      async () => {
        const collections = await raindropService.getCollections();
        return {
          content: collections.map(collection => ({
            type: "resource",
            resource: {
              uri: `raindrop://collection/${collection._id}`,
              text: collection.name
            }
          }))
        };
      }
    );

    // Tool for creating a collection
    this.server.tool(
      "createCollection",
      {
        name: z.string().describe("Name of the collection"),
        isPublic: z.boolean().optional().describe("Whether the collection is public")
      },
      async ({ name, isPublic }) => {
        const collection = await raindropService.createCollection(name, isPublic);
        return {
          content: [{
            type: "text",
            text: `Collection created: ${collection.name}`
          }]
        };
      }
    );

    // Tool for retrieving bookmarks
    this.server.tool(
      "getBookmarks",
      {
        collectionId: z.number().optional().describe("ID of the collection to filter bookmarks"),
        search: z.string().optional().describe("Search query for filtering bookmarks"),
        tags: z.array(z.string()).optional().describe("Tags to filter bookmarks")
      },
      async (params) => {
        const bookmarks = await raindropService.getBookmarks(params);
        return {
          content: bookmarks.items.map((bookmark: Bookmark) => ({
            type: "text",
            text: bookmark.title
          }))
        };
      }
    );
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log(`MCP Server is running on port ${config.port}`);
  }

  public async stop() {
    console.log('MCP Server stopped');
  }
}

export default new RaindropMCPService();