import { describe, expect, test, beforeEach, vi } from 'vitest';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RaindropMCPService } from '../mcp.service.js';
import raindropService from '../raindrop.service.js';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
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
  let mockServer: Mocked<McpServer>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new RaindropMCPService();
    mockServer = (McpServer as unknown as vi.Mock).mock.results[0].value;
  });

  test('constructor initializes with correct configuration', () => {
    expect(McpServer).toHaveBeenCalledWith({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service',
      capabilities: {
        logging: true
      }
    });
  });

  test('initializeTools registers all required tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(6);
    
    // Check registrations for each tool
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'getCollection',
        visibility: 'public'
      })
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'getCollections',
        visibility: 'public'
      })
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'getBookmark',
        visibility: 'public'
      })
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'updateBookmark',
        visibility: 'public'
      })
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'mergeTags',
        visibility: 'public'
      })
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'deleteTags',
        visibility: 'public'
      })
    );
  });

  test('start connects server with StdioServerTransport', async () => {
    await service.start();
    expect(StdioServerTransport).toHaveBeenCalledWith(process.stdin, process.stdout);
    expect(mockServer.connect).toHaveBeenCalled();
  });

  test('stop closes server', async () => {
    await service.stop();
    expect(mockServer.close).toHaveBeenCalled();
  });
});
