import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
//import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"; // Hypothetical import
import { z } from "zod";
import raindropService from './raindrop.service';
import config from "../config/config";
import { response } from "express";

// Define request schemas
const ListResourcesSchema = z.object({
  method: z.literal('listResources')
});

export class RaindropMCPService {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service'
    }, {
      capabilities: {
        resources: {}
      }
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesSchema, async () => {
      const collections = await raindropService.getCollections();
      return {
        resources: collections.map(collection => ({
          uri: `raindrop://collection/${collection._id}`,
          name: collection.name
        }))
      };
    });

    // Collections
    this.server.setRequestHandler(z.object({
      method: z.literal('getCollections')
    }), async () => {
      const collections = await raindropService.getCollections();
      return { collections };
    });

    this.server.setRequestHandler(z.object({
      method: z.literal('createCollection'),
      params: z.object({
        name: z.string(),
        isPublic: z.boolean().optional()
      })
    }), async (req) => {
      const { name, isPublic } = req.params;
      const collection = await raindropService.createCollection(name, isPublic);
      return { collection };
    });

    // Bookmarks
    this.server.setRequestHandler(z.object({
      method: z.literal('getBookmarks'),
      params: z.object({
        collectionId: z.number().optional(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional()
      })
    }), async (req) => {
      const bookmarks = await raindropService.getBookmarks(req.params);
      return { bookmarks };
    });

    this.server.setRequestHandler(z.object({
      method: z.literal('createBookmark'),
      params: z.object({
        collectionId: z.number(),
        title: z.string(),
        link: z.string(),
        tags: z.array(z.string()).optional()
      })
    }), async (req) => {
      const { collectionId, ...bookmarkData } = req.params;
      const bookmark = await raindropService.createBookmark(collectionId, bookmarkData);
      return { bookmark };
    });

    // Tags
    this.server.setRequestHandler(z.object({
      method: z.literal('getTags')
    }), async () => {
      const tags = await raindropService.getTags();
      return { tags };
    });

    // User
    this.server.setRequestHandler(z.object({
      method: z.literal('getUserInfo')
    }), async () => {
      const user = await raindropService.getUserInfo();
      return { user };
    });
  }

  public start() {
    let transport;
    // if (config.transportType === 'stdio') {
      transport = new StdioServerTransport();
    //  console.log(`Using stdio transport`);
    // } else if (config.transportType === 'sse') {
    //   const app = express();
    //   transport = new SSEServerTransport(app);
    //   app.listen(config.port, () => {
    //     console.log(`Using SSE transport on port ${config.port}`);
    //   });
    // } else {
    //   throw new Error("Invalid transport type specified in configuration");
    // }

    this.server.connect(transport);
   // console.log(`MCP Server is running on ${config.transportType} transport`);
  }
}

export default new RaindropMCPService();