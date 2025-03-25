import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import raindropService from './raindrop.service';
import config from "../config/config";
import { rateLimiterService } from "../middleware/rateLimiter";

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
        resources: {},
        // Add tools capability
        tools: {
          // Collection tools
          getCollections: {
            description: 'Get all collections from Raindrop.io',
            parameters: {}
          },
          createCollection: {
            description: 'Create a new collection in Raindrop.io',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the collection' },
                isPublic: { type: 'boolean', description: 'Whether the collection is public', default: false }
              },
              required: ['name']
            }
          },
          updateCollection: {
            description: 'Update an existing collection in Raindrop.io',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID of the collection to update' },
                name: { type: 'string', description: 'New name for the collection' },
                isPublic: { type: 'boolean', description: 'Whether the collection is public' },
                view: { type: 'string', description: 'View type (list, grid, etc.)' }
              },
              required: ['id']
            }
          },
          deleteCollection: {
            description: 'Delete a collection from Raindrop.io',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID of the collection to delete' }
              },
              required: ['id']
            }
          },
          
          // Raindrop (bookmark) tools
          getBookmarks: {
            description: 'Get bookmarks from Raindrop.io with optional filtering',
            parameters: {
              type: 'object',
              properties: {
                collectionId: { type: 'number', description: 'Collection ID to filter bookmarks' },
                search: { type: 'string', description: 'Search query for filtering bookmarks' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Tags to filter bookmarks'
                },
                page: { type: 'number', description: 'Page number for pagination' },
                perPage: { type: 'number', description: 'Number of items per page' },
                sort: { 
                  type: 'string', 
                  description: 'Sort order for results',
                  enum: ['-created', 'created', '-title', 'title', '-last_update', 'last_update']
                }
              }
            }
          },
          createBookmark: {
            description: 'Create a new bookmark in Raindrop.io',
            parameters: {
              type: 'object',
              properties: {
                collectionId: { type: 'number', description: 'Collection ID to add the bookmark to' },
                title: { type: 'string', description: 'Title of the bookmark' },
                link: { type: 'string', description: 'URL of the bookmark' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Tags for the bookmark'
                }
              },
              required: ['collectionId', 'title', 'link']
            }
          },
          getBookmark: {
            description: 'Get a specific bookmark from Raindrop.io by ID',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID of the bookmark to retrieve' }
              },
              required: ['id']
            }
          },
          updateBookmark: {
            description: 'Update an existing bookmark in Raindrop.io',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID of the bookmark to update' },
                title: { type: 'string', description: 'New title for the bookmark' },
                excerpt: { type: 'string', description: 'New excerpt/description for the bookmark' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Updated tags for the bookmark'
                },
                collection: { type: 'number', description: 'Collection ID to move the bookmark to' }
              },
              required: ['id']
            }
          },
          deleteBookmark: {
            description: 'Delete a bookmark from Raindrop.io',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID of the bookmark to delete' }
              },
              required: ['id']
            }
          },
          
          // Tag tools
          getTags: {
            description: 'Get all tags from Raindrop.io',
            parameters: {}
          },
          
          // User tools
          getUserInfo: {
            description: 'Get user information from Raindrop.io',
            parameters: {}
          },
          
          // Highlight tools
          getHighlights: {
            description: 'Get highlights for a specific raindrop (bookmark)',
            parameters: {
              type: 'object',
              properties: {
                raindropId: { type: 'number', description: 'ID of the raindrop/bookmark to get highlights for' }
              },
              required: ['raindropId']
            }
          },
          createHighlight: {
            description: 'Create a new highlight for a raindrop',
            parameters: {
              type: 'object',
              properties: {
                raindropId: { type: 'number', description: 'ID of the raindrop/bookmark to add highlight to' },
                text: { type: 'string', description: 'The text to highlight' },
                note: { type: 'string', description: 'Optional note for this highlight' },
                color: { type: 'string', description: 'Highlight color', default: 'yellow' }
              },
              required: ['raindropId', 'text']
            }
          },
          updateHighlight: {
            description: 'Update an existing highlight',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID of the highlight to update' },
                text: { type: 'string', description: 'The updated highlight text' },
                note: { type: 'string', description: 'Updated note for this highlight' },
                color: { type: 'string', description: 'Updated highlight color' }
              },
              required: ['id']
            }
          },
          deleteHighlight: {
            description: 'Delete a highlight',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID of the highlight to delete' }
              },
              required: ['id']
            }
          },
          
          // Advanced search with filters
          searchRaindrops: {
            description: 'Advanced search for raindrops with multiple filter options',
            parameters: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Search query' },
                collection: { type: 'number', description: 'Collection ID to search within' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Tags to filter by'
                },
                createdStart: { type: 'string', description: 'ISO date string for created date range start' },
                createdEnd: { type: 'string', description: 'ISO date string for created date range end' },
                important: { type: 'boolean', description: 'Filter by important status' },
                media: { 
                  type: 'string', 
                  description: 'Media type filter',
                  enum: ['article', 'image', 'video', 'document', 'audio']
                },
                page: { type: 'number', description: 'Page number for pagination' },
                perPage: { type: 'number', description: 'Items per page' },
                sort: { 
                  type: 'string', 
                  description: 'Sort order',
                  enum: ['-created', 'created', '-last_update', 'last_update', '-title', 'title', '-domain', 'domain']
                }
              }
            }
          }
        }
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

    // Tool execution handler for getCollections
    this.server.setToolHandler('getCollections', async () => {
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

    // Tool execution handler for createCollection
    this.server.setToolHandler('createCollection', async (params) => {
      const { name, isPublic } = params;
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

    // Tool execution handler for getBookmarks
    this.server.setToolHandler('getBookmarks', async (params) => {
      const bookmarks = await raindropService.getBookmarks(params);
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

    // Tool execution handler for createBookmark
    this.server.setToolHandler('createBookmark', async (params) => {
      const { collectionId, ...bookmarkData } = params;
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

    // Tool execution handler for getTags
    this.server.setToolHandler('getTags', async () => {
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

    // Tool execution handler for getUserInfo
    this.server.setToolHandler('getUserInfo', async () => {
      const user = await raindropService.getUserInfo();
      return { user };
    });

    // Get single bookmark
    this.server.setRequestHandler(z.object({
      method: z.literal('getBookmark'),
      params: z.object({
        id: z.number()
      })
    }), async (req) => {
      const bookmark = await raindropService.getBookmark(req.params.id);
      return { bookmark };
    });

    // Tool execution handler for getBookmark
    this.server.setToolHandler('getBookmark', async (params) => {
      const bookmark = await raindropService.getBookmark(params.id);
      return { bookmark };
    });

    // Update bookmark
    this.server.setRequestHandler(z.object({
      method: z.literal('updateBookmark'),
      params: z.object({
        id: z.number(),
        title: z.string().optional(),
        excerpt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        collection: z.number().optional()
      })
    }), async (req) => {
      const { id, ...updates } = req.params;
      const bookmark = await raindropService.updateBookmark(id, updates);
      return { bookmark };
    });

    // Tool execution handler for updateBookmark
    this.server.setToolHandler('updateBookmark', async (params) => {
      const { id, ...updates } = params;
      const bookmark = await raindropService.updateBookmark(id, updates);
      return { bookmark };
    });

    // Delete bookmark
    this.server.setRequestHandler(z.object({
      method: z.literal('deleteBookmark'),
      params: z.object({
        id: z.number()
      })
    }), async (req) => {
      await raindropService.deleteBookmark(req.params.id);
      return { success: true };
    });

    // Tool execution handler for deleteBookmark
    this.server.setToolHandler('deleteBookmark', async (params) => {
      await raindropService.deleteBookmark(params.id);
      return { success: true };
    });

    // Update collection
    this.server.setRequestHandler(z.object({
      method: z.literal('updateCollection'),
      params: z.object({
        id: z.number(),
        name: z.string().optional(),
        isPublic: z.boolean().optional(),
        view: z.string().optional()
      })
    }), async (req) => {
      const { id, isPublic, ...rest } = req.params;
      const updates = { ...rest };
      if (isPublic !== undefined) {
        updates.public = isPublic;
      }
      const collection = await raindropService.updateCollection(id, updates);
      return { collection };
    });

    // Tool execution handler for updateCollection
    this.server.setToolHandler('updateCollection', async (params) => {
      const { id, isPublic, ...rest } = params;
      const updates = { ...rest };
      if (isPublic !== undefined) {
        updates.public = isPublic;
      }
      const collection = await raindropService.updateCollection(id, updates);
      return { collection };
    });

    // Delete collection
    this.server.setRequestHandler(z.object({
      method: z.literal('deleteCollection'),
      params: z.object({
        id: z.number()
      })
    }), async (req) => {
      await raindropService.deleteCollection(req.params.id);
      return { success: true };
    });

    // Tool execution handler for deleteCollection
    this.server.setToolHandler('deleteCollection', async (params) => {
      await raindropService.deleteCollection(params.id);
      return { success: true };
    });

    // Advanced search with filters
    this.server.setRequestHandler(z.object({
      method: z.literal('searchRaindrops'),
      params: z.object({
        search: z.string().optional(),
        collection: z.number().optional(),
        tags: z.array(z.string()).optional(),
        createdStart: z.string().optional(),
        createdEnd: z.string().optional(),
        important: z.boolean().optional(),
        media: z.string().optional(),
        page: z.number().optional(),
        perPage: z.number().optional(),
        sort: z.string().optional()
      })
    }), async (req) => {
      const searchResults = await raindropService.getBookmarks(req.params);
      return { results: searchResults };
    });

    // Tool execution handler for searchRaindrops
    this.server.setToolHandler('searchRaindrops', async (params) => {
      const searchResults = await raindropService.getBookmarks(params);
      return { results: searchResults };
    });

    // Highlight handlers
    // Get highlights for a raindrop
    this.server.setRequestHandler(z.object({
      method: z.literal('getHighlights'),
      params: z.object({
        raindropId: z.number()
      })
    }), async (req) => {
      const highlights = await raindropService.getHighlights(req.params.raindropId);
      return { highlights };
    });

    // Tool execution handler for getHighlights
    this.server.setToolHandler('getHighlights', async (params) => {
      const highlights = await raindropService.getHighlights(params.raindropId);
      return { highlights };
    });

    // Create highlight
    this.server.setRequestHandler(z.object({
      method: z.literal('createHighlight'),
      params: z.object({
        raindropId: z.number(),
        text: z.string(),
        note: z.string().optional(),
        color: z.string().optional()
      })
    }), async (req) => {
      const { raindropId, ...highlightData } = req.params;
      const highlight = await raindropService.createHighlight(raindropId, highlightData);
      return { highlight };
    });

    // Tool execution handler for createHighlight
    this.server.setToolHandler('createHighlight', async (params) => {
      const { raindropId, ...highlightData } = params;
      const highlight = await raindropService.createHighlight(raindropId, highlightData);
      return { highlight };
    });

    // Update highlight
    this.server.setRequestHandler(z.object({
      method: z.literal('updateHighlight'),
      params: z.object({
        id: z.number(),
        text: z.string().optional(),
        note: z.string().optional(),
        color: z.string().optional()
      })
    }), async (req) => {
      const { id, ...updates } = req.params;
      const highlight = await raindropService.updateHighlight(id, updates);
      return { highlight };
    });

    // Tool execution handler for updateHighlight
    this.server.setToolHandler('updateHighlight', async (params) => {
      const { id, ...updates } = params;
      const highlight = await raindropService.updateHighlight(id, updates);
      return { highlight };
    });

    // Delete highlight
    this.server.setRequestHandler(z.object({
      method: z.literal('deleteHighlight'),
      params: z.object({
        id: z.number()
      })
    }), async (req) => {
      await raindropService.deleteHighlight(req.params.id);
      return { success: true };
    });

    // Tool execution handler for deleteHighlight
    this.server.setToolHandler('deleteHighlight', async (params) => {
      await raindropService.deleteHighlight(params.id);
      return { success: true };
    });
  }

  public async start() {
    const transport = new StdioServerTransport();
    this.server.connect(transport);
    console.log(`MCP Server is running on port ${config.port}`);
  }

  public async stop() {
    // Method to gracefully stop the server
    if (this.server) {
      // Add any cleanup logic here
      console.log('MCP Server stopped');
    }
  }
}

export default new RaindropMCPService();