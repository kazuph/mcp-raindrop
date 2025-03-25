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
        { _id: 1, name: 'Test Collection' }
      ];
      (raindropService.getCollections as any).mockResolvedValue(mockCollections);

      const handler = mockServer.setRequestHandler.mock.calls[0][1];
      const result = handler();

      expect(result).resolves.toEqual({
        resources: [{
          uri: 'raindrop://collection/1',
          name: 'Test Collection'
        }]
      });
    });

    it('should set up getCollections handler', () => {
      const mockCollections = [
        { _id: 1, name: 'Test Collection' }
      ];
      (raindropService.getCollections as any).mockResolvedValue(mockCollections);

      const handler = mockServer.setRequestHandler.mock.calls[1][1];
      const result = handler();

      expect(result).resolves.toEqual({
        collections: mockCollections
      });
    });

    it('should set up createCollection handler', () => {
      const mockCollection = { _id: 1, name: 'New Collection' };
      (raindropService.createCollection as any).mockResolvedValue(mockCollection);

      const handler = mockServer.setRequestHandler.mock.calls[2][1];
      const result = handler({ params: { name: 'New Collection', isPublic: true } });

      expect(result).resolves.toEqual({
        collection: mockCollection
      });
    });

    it('should set up getBookmarks handler', () => {
      const mockBookmarks = [
        { _id: 1, title: 'Test Bookmark' }
      ];
      (raindropService.getBookmarks as any).mockResolvedValue(mockBookmarks);

      const handler = mockServer.setRequestHandler.mock.calls[3][1];
      const result = handler({ params: { collectionId: 1 } });

      expect(result).resolves.toEqual({
        bookmarks: mockBookmarks
      });
    });

    it('should set up createBookmark handler', () => {
      const mockBookmark = { _id: 1, title: 'New Bookmark' };
      (raindropService.createBookmark as any).mockResolvedValue(mockBookmark);

      const handler = mockServer.setRequestHandler.mock.calls[4][1];
      const result = handler({
        params: {
          collectionId: 1,
          title: 'New Bookmark',
          link: 'https://example.com'
        }
      });

      expect(result).resolves.toEqual({
        bookmark: mockBookmark
      });
    });

    it('should set up getTags handler', () => {
      const mockTags = [{ _id: 'tag1', count: 10 }, { _id: 'tag2', count: 5 }];
      (raindropService.getTags as any).mockResolvedValue(mockTags);

      const handler = mockServer.setRequestHandler.mock.calls[5][1];
      const result = handler();

      expect(result).resolves.toEqual({
        tags: mockTags
      });
    });

    it('should set up getUserInfo handler', () => {
      const mockUser = { id: 1, name: 'Test User' };
      (raindropService.getUserInfo as any).mockResolvedValue(mockUser);

      const handler = mockServer.setRequestHandler.mock.calls[6][1];
      const result = handler();

      expect(result).resolves.toEqual({
        user: mockUser
      });
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