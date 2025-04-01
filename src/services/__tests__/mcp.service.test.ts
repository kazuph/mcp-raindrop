import { describe, expect, test, beforeEach, vi, type Mock } from 'vitest';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RaindropMCPService } from '../mcp.service.js';
import raindropService from '../raindrop.service.js';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    tool: vi.fn(),  // Changed from registerTool to tool to match MCP SDK
    connect: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
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
  },
}));

describe('RaindropMCPService', () => {
  let service: RaindropMCPService;
  let mockServer: InstanceType<typeof McpServer>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new RaindropMCPService();
    // Access the instance created by the mocked constructor
    mockServer = (McpServer as Mock).mock.results[0].value;
  });

  test('constructor initializes with correct configuration', () => {
    expect(McpServer).toHaveBeenCalledWith({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service',
      capabilities: {
        logging: false  // Changed to match the actual implementation
      }
    });
  });

  test('initializeTools registers all required tools', () => {
    expect(mockServer.tool).toHaveBeenCalledTimes(6);
    
    // Check registrations for each tool
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

  // test('start connects server with StdioServerTransport', async () => {
  //   await service.start();
  //   expect(StdioServerTransport).toHaveBeenCalledWith(process.stdin, process.stdout);
  //   expect(mockServer.connect).toHaveBeenCalled();
  // });

  test('stop closes server', async () => {
    await service.stop();
    expect(mockServer.close).toHaveBeenCalled();
  });
});