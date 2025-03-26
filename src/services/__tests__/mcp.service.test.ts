import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RaindropMCPService } from '../mcp.service';
import raindropService from '../raindrop.service';

// Mock the dependencies
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn()
  }))
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn()
}));

vi.mock('../raindrop.service', () => ({
  default: {
    getCollections: vi.fn(),
    createCollection: vi.fn(),
    getBookmarks: vi.fn(),
    createBookmark: vi.fn(),
    getTags: vi.fn(),
    getUserInfo: vi.fn()
  }
}));

describe('RaindropMCPService', () => {
  let service: RaindropMCPService;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      setRequestHandler: vi.fn(),
      connect: vi.fn()
    };
    (Server as any).mockImplementation(() => mockServer);
    service = new RaindropMCPService();
  });

  describe('constructor', () => {
    it('should initialize the server with correct configuration', () => {
      expect(Server).toHaveBeenCalledWith({
        name: 'raindrop-mcp',
        version: '1.0.0',
        description: 'MCP Server for Raindrop.io bookmarking service'
      }, {
        capabilities: {
          resources: {}
        }
      });
    });
  });

  describe('setupHandlers', () => {
    it('should set up listResources handler', () => {
      const mockCollections = [
        { 
          _id: 1, 
          title: 'Test Collection',
          count: 5,
          public: false,
          createdAt: '2025-03-26T00:00:00Z',
          updatedAt: '2025-03-26T00:00:00Z'
        }
      ];
      (raindropService.getCollections as any).mockResolvedValue(mockCollections);

      const handler = mockServer.setRequestHandler.mock.calls[0][1];
      const result = handler();

      expect(result).resolves.toEqual({
        content: mockCollections.map(collection => ({
          type: "text",
          text: collection.title || "Unnamed Collection",
          metadata: {
            id: collection._id,
            count: collection.count,
            public: collection.public,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt
          }
        }))
      });
    });

    it('should set up getBookmarks handler', () => {
      const mockBookmarks = {
        items: [
          { 
            _id: 1, 
            title: 'Test Bookmark', 
            link: 'https://example.com',
            excerpt: 'Test excerpt',
            tags: ['test', 'example'],
            collection: { $id: 1 },
            created: '2025-03-26T00:00:00Z',
            lastUpdate: '2025-03-26T00:00:00Z',
            type: 'link'
          }
        ]
      };
      (raindropService.getBookmarks as any).mockResolvedValue(mockBookmarks);

      const handler = mockServer.setRequestHandler.mock.calls.find((call: any[]) => call[0] === 'getBookmarks')[1];
      const result = handler({ params: { collectionId: 1 } });

      expect(result).resolves.toEqual({
        content: mockBookmarks.items.map(bookmark => ({
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
      });
    });

    it('should handle empty search query gracefully', async () => {
      const emptyResult = { items: [] };
      (raindropService.getBookmarks as any).mockResolvedValue(emptyResult);

      const handler = mockServer.setRequestHandler.mock.calls.find((call: any[]) => call[0] === 'getBookmarks')[1];
      const result = await handler({ params: { search: '' } });

      expect(result).toEqual({
        content: []
      });
    });

    it('should handle special characters in search query', async () => {
      const mockBookmarks = {
        items: [
          { 
            _id: 1, 
            title: 'Special Bookmark', 
            link: 'https://example.com',
            excerpt: 'Test excerpt',
            tags: ['test', 'example'],
            collection: { $id: 1 },
            created: '2025-03-26T00:00:00Z',
            lastUpdate: '2025-03-26T00:00:00Z',
            type: 'link'
          }
        ]
      };
      (raindropService.getBookmarks as any).mockResolvedValue(mockBookmarks);

      const handler = mockServer.setRequestHandler.mock.calls.find((call: any[]) => call[0] === 'getBookmarks')[1];
      const result = await handler({ params: { search: '!@#$%^&*()' } });

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
              collectionId: bookmark.collection?.$id,
              created: bookmark.created,
              lastUpdate: bookmark.lastUpdate,
              type: bookmark.type
            }
          }
        }))
      });
    });

    it('should handle excessively long search query', async () => {
      const longQuery = 'a'.repeat(1000);
      const emptyResult = { items: [] };
      (raindropService.getBookmarks as any).mockResolvedValue(emptyResult);

      const handler = mockServer.setRequestHandler.mock.calls.find((call: any[]) => call[0] === 'getBookmarks')[1];
      const result = await handler({ params: { search: longQuery } });

      expect(result).toEqual({
        content: []
      });
    });

    it('should return an error for invalid search parameters', async () => {
      const handler = mockServer.setRequestHandler.mock.calls.find((call: any[]) => call[0] === 'getBookmarks')[1];

      await expect(handler({ params: { search: 12345 } })).rejects.toThrow('Invalid search parameter');
    });
  });

  describe('start', () => {
    it('should connect the server with stdio transport', () => {
      service.start();

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
    });
  });
});
