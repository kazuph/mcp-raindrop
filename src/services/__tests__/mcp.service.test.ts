import { describe, expect, test, beforeEach, vi, type Mock } from 'vitest';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RaindropMCPService } from '../mcp.service.js';
import raindropService from '../raindrop.service.js';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    tool: vi.fn(),
    resource: vi.fn(),
    connect: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('../raindrop.service.js', () => ({
  __esModule: true,
  default: {
    getCollection: vi.fn(),
    getCollections: vi.fn(),
    getBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    mergeTags: vi.fn(),
    deleteTags: vi.fn(),
    getTags: vi.fn(),
    getAllHighlights: vi.fn(),
    getUserInfo: vi.fn(),
    getUserStats: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    shareCollection: vi.fn(),
    mergeCollections: vi.fn(),
    removeEmptyCollections: vi.fn(),
    emptyTrash: vi.fn(),
    createBookmark: vi.fn(),
    batchUpdateBookmarks: vi.fn(),
    setReminder: vi.fn(),
    deleteReminder: vi.fn(),
  },
}));

describe('RaindropMCPService', () => {
  let service: RaindropMCPService;
  let mockServer: InstanceType<typeof McpServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RaindropMCPService();
    mockServer = (McpServer as Mock).mock.results[0]?.value || new McpServer();
  });

  test('constructor initializes with correct configuration', () => {
    expect(McpServer).toHaveBeenCalledWith({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service',
      capabilities: {
        logging: false,
      },
    });
  });

  test('initializeTools registers all required tools', () => {
    expect(mockServer.tool).toHaveBeenCalledTimes(6);

    expect(mockServer.tool).toHaveBeenCalledWith(
      'getCollection',
      'Get a specific collection by ID',
      expect.any(Object),
      expect.any(Function)
    );

    expect(mockServer.tool).toHaveBeenCalledWith(
      'getCollections',
      'Get all collections',
      expect.any(Object),
      expect.any(Function)
    );

    expect(mockServer.tool).toHaveBeenCalledWith(
      'getBookmark',
      'Get a specific bookmark by ID',
      expect.any(Object),
      expect.any(Function)
    );

    expect(mockServer.tool).toHaveBeenCalledWith(
      'updateBookmark',
      'Update an existing bookmark',
      expect.any(Object),
      expect.any(Function)
    );

    expect(mockServer.tool).toHaveBeenCalledWith(
      'mergeTags',
      'Merge multiple tags into one destination tag',
      expect.any(Object),
      expect.any(Function)
    );

    expect(mockServer.tool).toHaveBeenCalledWith(
      'deleteTags',
      'Delete tags from all bookmarks',
      expect.any(Object),
      expect.any(Function)
    );
  });

  test('initializeResources registers all required resources', () => {
    expect(mockServer.resource).toHaveBeenCalledTimes(6);

    expect(mockServer.resource).toHaveBeenCalledWith(
      'collections',
      'collections://all',
      expect.any(Function)
    );

    expect(mockServer.resource).toHaveBeenCalledWith(
      'child-collections',
      expect.any(Object),
      expect.any(Function)
    );

    expect(mockServer.resource).toHaveBeenCalledWith(
      'tags',
      'tags://all',
      expect.any(Function)
    );

    expect(mockServer.resource).toHaveBeenCalledWith(
      'highlights',
      'highlights://all',
      expect.any(Function)
    );

    expect(mockServer.resource).toHaveBeenCalledWith(
      'user-info',
      'user://info',
      expect.any(Function)
    );

    expect(mockServer.resource).toHaveBeenCalledWith(
      'user-stats',
      'user://stats',
      expect.any(Function)
    );
  });

  test('stop closes server', async () => {
    await service.stop();
    expect(mockServer.close).toHaveBeenCalled();
  });

  test('getServerInstance returns the server instance', () => {
    const serverInstance = service.getServerInstance();
    expect(serverInstance).toBe(mockServer);
  });

  test('createRaindropServer factory function returns server and cleanup', () => {
    const { server, cleanup } = require('../mcp.service.js').createRaindropServer();
    expect(server).toBeInstanceOf(McpServer);
    expect(typeof cleanup).toBe('function');
  });

  test('createCollection tool calls raindropService.createCollection', async () => {
    const mockCollection = { _id: 1, title: 'Test Collection', count: 0, public: false };
    (raindropService.createCollection as Mock).mockResolvedValue(mockCollection);

    const tool = mockServer.tool.mock.calls.find(call => call[0] === 'createCollection');
    const handler = tool[3];
    const result = await handler({ title: 'Test Collection', isPublic: false });

    expect(raindropService.createCollection).toHaveBeenCalledWith('Test Collection', false);
    expect(result.content[0].text).toBe('Test Collection');
  });

  test('deleteCollection tool calls raindropService.deleteCollection', async () => {
    const tool = mockServer.tool.mock.calls.find(call => call[0] === 'deleteCollection');
    const handler = tool[3];
    await handler({ id: 1 });

    expect(raindropService.deleteCollection).toHaveBeenCalledWith(1);
  });

  test('getTags resource calls raindropService.getTags', async () => {
    const mockTags = [{ _id: 'tag1', count: 10 }, { _id: 'tag2', count: 5 }];
    (raindropService.getTags as Mock).mockResolvedValue(mockTags);

    const resource = mockServer.resource.mock.calls.find(call => call[0] === 'tags');
    const handler = resource[2];
    const result = await handler({ href: 'tags://all' });

    expect(raindropService.getTags).toHaveBeenCalled();
    expect(result.contents).toHaveLength(2);
    expect(result.contents[0].text).toBe('tag1');
  });

  test('mergeTags tool calls raindropService.mergeTags', async () => {
    const tool = mockServer.tool.mock.calls.find(call => call[0] === 'mergeTags');
    const handler = tool[3];
    await handler({ sourceTags: ['tag1', 'tag2'], destinationTag: 'mergedTag' });

    expect(raindropService.mergeTags).toHaveBeenCalledWith(undefined, ['tag1', 'tag2'], 'mergedTag');
  });

  test('emptyTrash tool calls raindropService.emptyTrash', async () => {
    const tool = mockServer.tool.mock.calls.find(call => call[0] === 'emptyTrash');
    const handler = tool[3];
    await handler({});

    expect(raindropService.emptyTrash).toHaveBeenCalled();
  });

  test('getUserInfo resource calls raindropService.getUserInfo', async () => {
    const mockUser = { _id: 1, email: 'test@example.com', fullName: 'Test User', pro: true, registered: '2023-01-01' };
    (raindropService.getUserInfo as Mock).mockResolvedValue(mockUser);

    const resource = mockServer.resource.mock.calls.find(call => call[0] === 'user-info');
    const handler = resource[2];
    const result = await handler({ href: 'user://info' });

    expect(raindropService.getUserInfo).toHaveBeenCalled();
    expect(result.contents[0].text).toBe('User: Test User');
  });
});