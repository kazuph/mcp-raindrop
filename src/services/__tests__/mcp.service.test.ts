import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RaindropMCPService from '../mcp.service.js';
import raindropService from '../raindrop.service.js';
import type { Collection, Bookmark } from '../../types/raindrop.js';

// Mock the raindropService
vi.mock('../raindrop.service.js', () => {
  return {
    default: {
      createCollection: vi.fn(),
      createBookmark: vi.fn(),
      getCollection: vi.fn(),
      getBookmark: vi.fn()
    }
  };
});

// Mock implementations for MCP SDK
const resourceMock = vi.fn();
const toolMock = vi.fn();

const MockMcpServer = vi.fn().mockImplementation(() => ({
  resource: resourceMock,
  tool: toolMock
}));

const MockResourceTemplate = vi.fn();

// Mock the SDK module
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: MockMcpServer,
    ResourceTemplate: MockResourceTemplate
  };
});

describe('RaindropMCPService', () => {
  let mcpService: RaindropMCPService;
  // Define a proper type for toolHandlers to fix the indexing error
  let toolHandlers: Record<string, (...args: any[]) => any> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock implementations
    toolMock.mockImplementation((name: string, _description: string, _schema: unknown, handler: (...args: any[]) => any) => {
      toolHandlers[name] = handler;
    });
    
    // Create a fresh instance of the service for each test
    mcpService = new RaindropMCPService();
  });

  afterEach(() => {
    vi.resetAllMocks();
    toolHandlers = {};
  });

  it('should create a dummy collection and add a bookmark to it', async () => {
    // Mock collection and bookmark data with all required properties
    const mockCollection: Collection = {
      _id: 12345,
      title: "Test Collection",
      count: 0,
      public: false,
      created: "2025-04-02T10:00:00.000Z",
      lastUpdate: "2025-04-02T10:00:00.000Z",
      view: "list",
      sort: "0",
      user: { $id: 123 }
    };
    
    const mockBookmark: Bookmark = {
      _id: 67890,
      title: "Test Bookmark",
      link: "https://example.com",
      excerpt: "Test excerpt",
      tags: ["test", "example"],
      collection: { $id: 12345 },
      created: "2025-04-02T10:05:00.000Z",
      lastUpdate: "2025-04-02T10:05:00.000Z",
      type: "link",
      domain: "example.com",
      removed: false,
      user: { $id: 123 },
      important: false
    };

    // Setup the mock implementations
    vi.mocked(raindropService.createCollection).mockResolvedValue(mockCollection);
    vi.mocked(raindropService.createBookmark).mockResolvedValue(mockBookmark);
    vi.mocked(raindropService.getCollection).mockResolvedValue(mockCollection);
    vi.mocked(raindropService.getBookmark).mockResolvedValue(mockBookmark);

    // 1. Test the create collection tool
    const createCollectionParams = {
      title: "Test Collection",
      isPublic: false
    };
    
    const createCollectionResult = await toolHandlers['createCollection'](createCollectionParams);
    
    // Verify the result
    expect(raindropService.createCollection).toHaveBeenCalledWith(
      createCollectionParams.title,
      createCollectionParams.isPublic
    );
    
    expect(createCollectionResult).toEqual({
      content: [{
        type: "text",
        text: mockCollection.title,
        metadata: {
          id: mockCollection._id,
          count: mockCollection.count,
          public: mockCollection.public
        }
      }]
    });

    // 2. Test the create bookmark tool
    const createBookmarkParams = {
      link: "https://example.com",
      collectionId: mockCollection._id,
      title: "Test Bookmark",
      excerpt: "Test excerpt",
      tags: ["test", "example"]
    };
    
    const createBookmarkResult = await toolHandlers['createBookmark'](createBookmarkParams);
    
    // Verify the raindropService was called with correct params
    expect(raindropService.createBookmark).toHaveBeenCalledWith(
      mockCollection._id,
      {
        link: createBookmarkParams.link,
        title: createBookmarkParams.title,
        excerpt: createBookmarkParams.excerpt,
        tags: createBookmarkParams.tags
      }
    );
    
    // Verify the result structure
    expect(createBookmarkResult).toEqual({
      content: [{
        type: "resource",
        resource: {
          text: mockBookmark.title,
          uri: mockBookmark.link,
          metadata: {
            id: mockBookmark._id,
            excerpt: mockBookmark.excerpt,
            tags: mockBookmark.tags,
            collectionId: mockBookmark.collection.$id,
            created: mockBookmark.created,
            lastUpdate: mockBookmark.lastUpdate,
            type: mockBookmark.type
          }
        }
      }]
    });

    // 3. Verify the bookmark exists in the collection
    const getCollectionResult = await toolHandlers['getCollection']({ id: mockCollection._id });
    expect(raindropService.getCollection).toHaveBeenCalledWith(mockCollection._id);
    expect(getCollectionResult.content[0].text).toEqual(mockCollection.title);
    
    const getBookmarkResult = await toolHandlers['getBookmark']({ id: mockBookmark._id });
    expect(raindropService.getBookmark).toHaveBeenCalledWith(mockBookmark._id);
    expect(getBookmarkResult.content[0].resource.text).toEqual(mockBookmark.title);
  });

  it('should initialize McpServer with correct configuration', () => {
    expect(MockMcpServer).toHaveBeenCalledWith({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service',
      capabilities: {
        logging: false
      }
    });
  });

  it('should register tools for collection and bookmark operations', () => {
    // Verify essential tools are registered
    expect(toolMock).toHaveBeenCalledWith(
      'createCollection',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(toolMock).toHaveBeenCalledWith(
      'createBookmark',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(toolMock).toHaveBeenCalledWith(
      'getCollection',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(toolMock).toHaveBeenCalledWith(
      'getBookmark',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });
});