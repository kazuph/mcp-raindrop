import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RaindropMCPService } from '../mcp.service';
import raindropService from '../raindrop.service';

// Mock the dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn()
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('../raindrop.service', () => ({
  default: {
    getCollections: vi.fn(),
    getCollection: vi.fn(),
    createCollection: vi.fn(),
    getBookmarks: vi.fn(),
    createBookmark: vi.fn(),
    getTags: vi.fn(),
    getUserInfo: vi.fn(),
    getAllHighlights: vi.fn(),
    reorderCollections: vi.fn()
  }
}));

describe('RaindropMCPService', () => {
  let service: RaindropMCPService;
  let mockServer: any;
  let toolHandlers: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    toolHandlers = new Map();
    
    mockServer = {
      tool: vi.fn().mockImplementation((name, description, ...args) => {
        // Handle both function-only and schema+function cases
        const handler = args.length > 1 ? args[1] : args[0];
        toolHandlers.set(name, handler);
        return mockServer;
      }),
      connect: vi.fn().mockResolvedValue(undefined)
    };
    
    (McpServer as any).mockImplementation((config) => {
      expect(config).toEqual({
        name: 'raindrop-mcp',
        version: '1.0.0',
        description: 'MCP Server for Raindrop.io bookmarking service',
        capabilities: {
          logging: true
        }
      });
      return mockServer;
    });
    
    service = new RaindropMCPService();
  });

  describe('constructor', () => {
    it('should initialize the server with correct configuration', () => {
      expect(McpServer).toHaveBeenCalledWith({
        name: 'raindrop-mcp',
        version: '1.0.0',
        description: 'MCP Server for Raindrop.io bookmarking service',
        capabilities: {
          logging: true
        }
      });
    });
  });

  describe('setupHandlers', () => {
    it('should set up getCollection handler', async () => {
      const mockCollection = { 
        _id: 24419967, 
        title: 'gdelt',
        count: 42,
        public: false,
        created: '2025-03-26T00:00:00Z',
        lastUpdate: '2025-03-26T00:00:00Z'
      };
      (raindropService.getCollection as jest.Mock).mockResolvedValue(mockCollection);
      
      const handler = toolHandlers.get('getCollection');
      expect(handler).toBeDefined();
      
      const result = await handler({ id: 24419967 });
      expect(result).toEqual({
        content: [{
          type: "text",
          text: mockCollection.title,
          metadata: {
            id: mockCollection._id,
            count: mockCollection.count,
            public: mockCollection.public,
            created: mockCollection.created,
            lastUpdate: mockCollection.lastUpdate
          }
        }]
      });
    });

    it('should set up getCollections handler', async () => {
      const mockCollections = [
        { 
          _id: 24419967, 
          title: 'gdelt',
          count: 42,
          public: false,
          created: '2025-03-26T00:00:00Z',
          lastUpdate: '2025-03-26T00:00:00Z'
        },
        { 
          _id: 24419968, 
          title: 'Research Papers',
          count: 156,
          public: true,
          created: '2025-03-26T00:00:00Z',
          lastUpdate: '2025-03-26T00:00:00Z'
        }
      ];
      (raindropService.getCollections as jest.Mock).mockResolvedValue(mockCollections);
      
      const handler = toolHandlers.get('getCollections');
      expect(handler).toBeDefined();
      
      const result = await handler();
      expect(result).toEqual({
        content: mockCollections.map(collection => ({
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
      });
    });

    it('should set up getBookmarks handler', async () => {
      const mockBookmarks = {
        items: [
          { 
            _id: 1, 
            title: 'Test Bookmark', 
            link: 'https://example.com',
            excerpt: 'Test excerpt',
            tags: ['test', 'example'],
            collection: { $id: 24419967 },
            created: '2025-03-26T00:00:00Z',
            lastUpdate: '2025-03-26T00:00:00Z',
            type: 'link'
          }
        ]
      };
      (raindropService.getBookmarks as jest.Mock).mockResolvedValue(mockBookmarks);
      
      const handler = toolHandlers.get('getBookmarks');
      expect(handler).toBeDefined();
      
      const result = await handler({ collectionId: 24419967 });
      expect(result).toEqual({
        content: mockBookmarks.items.map(bookmark => ({
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
        }))
      });
    });

    it('should set up getTags handler', async () => {
      const mockTags = [
        { _id: 'javascript', count: 42 },
        { _id: 'typescript', count: 35 },
        { _id: 'api', count: 28 }
      ];
      (raindropService.getTags as jest.Mock).mockResolvedValue(mockTags);
      
      const handler = toolHandlers.get('getTags');
      expect(handler).toBeDefined();
      
      const result = await handler({ collectionId: 24419967 });
      expect(result).toEqual({
        content: mockTags.map(tag => ({
          type: "text",
          text: tag._id,
          metadata: {
            count: tag.count
          }
        }))
      });
    });

    it('should handle collection not found error', async () => {
      (raindropService.getCollection as jest.Mock).mockRejectedValue(new Error('Collection not found'));
      
      const handler = toolHandlers.get('getCollection');
      expect(handler).toBeDefined();
      
      await expect(handler({ id: 999999 })).rejects.toThrow('Collection not found');
    });
  });

  describe('start', () => {
    it('should connect the server with stdio transport', async () => {
      await service.start();
      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
    });
  });
});
