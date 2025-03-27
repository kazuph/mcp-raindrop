import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import RaindropMCPService from '../mcp.service.js';
import raindropService from '../raindrop.service.js';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => {
      return {
        addTool: jest.fn(),
        connect: jest.fn(),
        close: jest.fn()
      };
    })
  };
});

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: jest.fn().mockImplementation(() => {
      return {};
    })
  };
});

jest.mock('../raindrop.service.js', () => {
  return {
    default: {
      getCollection: jest.fn(),
      getCollections: jest.fn(),
      getBookmark: jest.fn(),
      updateBookmark: jest.fn(),
      mergeTags: jest.fn(),
      deleteTags: jest.fn()
    }
  };
});

describe('RaindropMCPService', () => {
  let service: RaindropMCPService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new RaindropMCPService();
  });

  test('should initialize with correct parameters', () => {
    expect(McpServer).toHaveBeenCalledWith({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service',
      capabilities: {
        logging: true
      }
    });
  });

  test('should register appropriate tools', () => {
    const mockServer = new McpServer({} as any);
    expect(mockServer.addTool).toHaveBeenCalledTimes(6); // Should register 6 tools
  });

  test('start should connect to transport', async () => {
    await service.start();
    expect((service as any).server.connect).toHaveBeenCalled();
  });

  test('stop should close the server', async () => {
    await service.stop();
    expect((service as any).server.close).toHaveBeenCalled();
  });
});
