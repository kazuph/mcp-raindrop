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
          content: collections.map(collection => {
            return {
              type: "text", // Assuming "text" type is expected for collections
              text: collection.title || "Unnamed Collection", // Use "title" for the collection name
              id: collection._id // Include the collection ID
            };
          })
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
            type: "text", // Assuming "text" type is expected for bookmarks
            text: bookmark.title || "Untitled Bookmark", // Use "title" for the bookmark name
            link: bookmark.link, // Include the bookmark URL
            excerpt: bookmark.excerpt || "No description available", // Include the description
            tags: bookmark.tags || [], // Include tags
            collectionId: bookmark.collection?.$id // Include the collection ID
          }))
        };
      }
    );

    // Tool for retrieving tags
    this.server.tool(
      "getTags",
      {
        collectionId: z.number().optional().describe("ID of the collection to filter tags")
      },
      async ({ collectionId }) => {
        const tags = await raindropService.getTags(collectionId);
        return {
          content: tags.items.map(tag => ({
            type: "text", // Assuming "text" type is expected for tags
            text: tag._id, // Use "_id" for the tag name
            count: tag.count // Include the count of tag usage
          }))
        };
      }
    );

    // Tool for renaming a tag
    this.server.tool(
      "renameTag",
      {
        collectionId: z.number().optional().describe("ID of the collection to restrict renaming"),
        oldName: z.string().describe("Current name of the tag"),
        newName: z.string().describe("New name for the tag")
      },
      async ({ collectionId, oldName, newName }) => {
        await raindropService.renameTag(collectionId, oldName, newName);
        return {
          content: [{
            type: "text",
            text: `Tag renamed from '${oldName}' to '${newName}'`
          }]
        };
      }
    );

    // Tool for merging tags
    this.server.tool(
      "mergeTags",
      {
        collectionId: z.number().optional().describe("ID of the collection to restrict merging"),
        tags: z.array(z.string()).describe("List of tags to merge"),
        newName: z.string().describe("New name for the merged tags")
      },
      async ({ collectionId, tags, newName }) => {
        await raindropService.mergeTags(collectionId, tags, newName);
        return {
          content: [{
            type: "text",
            text: `Tags [${tags.join(", ")}] merged into '${newName}'`
          }]
        };
      }
    );

    // Tool for deleting tags
    this.server.tool(
      "deleteTags",
      {
        collectionId: z.number().optional().describe("ID of the collection to restrict deletion"),
        tags: z.array(z.string()).describe("List of tags to delete")
      },
      async ({ collectionId, tags }) => {
        await raindropService.deleteTags(collectionId, tags);
        return {
          content: [{
            type: "text",
            text: `Tags [${tags.join(", ")}] deleted`
          }]
        };
      }
    );

    // Tool for retrieving all tags across all collections
    this.server.tool(
      "getAllTags",
      "Retrieve all tags across all collections",
      async () => {
        const tags = await raindropService.getTags();
        return {
          content: tags.items.map(tag => ({
            type: "text",
            text: tag._id,
            count: tag.count
          }))
        };
      }
    );

    // Tool for retrieving all highlights across all raindrops
    this.server.tool(
      "getAllHighlights",
      "Retrieve all highlights across all raindrops",
      async () => {
        const highlights = await raindropService.getAllHighlights();
        return {
          content: highlights.items.map(highlight => ({
            type: "text",
            text: highlight.text,
            color: highlight.color,
            note: highlight.note || "No note provided",
            created: highlight.created,
            lastUpdate: highlight.lastUpdate
          }))
        };
      }
    );

    // Tool for retrieving highlights
    this.server.tool(
      "getHighlights",
      {
        raindropId: z.number().describe("ID of the raindrop to retrieve highlights for")
      },
      async ({ raindropId }) => {
        const highlights = await raindropService.getHighlights(raindropId);
        return {
          content: highlights.items.map(highlight => ({
            type: "text", // Assuming "text" type is expected for highlights
            text: highlight.text, // Use "text" for the highlighted text
            color: highlight.color, // Include the highlight color
            note: highlight.note || "No note provided", // Include the note or a default message
            created: highlight.created, // Include the creation date
            lastUpdate: highlight.lastUpdate // Include the last update date
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