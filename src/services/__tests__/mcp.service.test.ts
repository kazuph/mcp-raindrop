import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RaindropMCPService } from '../mcp.service';
import raindropService from '../raindrop.service';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../raindrop.service.js', () => ({
  __esModule: true,
  default: {
    getCollection: jest.fn(),
    getCollections: jest.fn(),
    getBookmark: jest.fn(),
    updateBookmark: jest.fn(),
    mergeTags: jest.fn(),
    deleteTags: jest.fn(),
  },
}));

describe('RaindropMCPService', () => {
  let service: RaindropMCPService;
  let mockServer: jest.Mocked<McpServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RaindropMCPService();
    mockServer = (McpServer as jest.Mock).mock.results[0].value;
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
