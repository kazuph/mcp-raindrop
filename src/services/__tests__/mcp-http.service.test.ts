import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mcpHttpService } from '../mcp-http.service.js';
import axios from 'axios';

describe('MCPHttpService', () => {
  const PORT = 3002;
  
  beforeAll(async () => {
    // Start HTTP server for testing
    await mcpHttpService.start();
  });
  
  afterAll(async () => {
    // Stop HTTP server after tests
    await mcpHttpService.stop();
  });
  
  test('should respond to MCP API requests', async () => {
    try {
      const response = await axios.post(
        `http://localhost:${PORT}/api`,
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'listTools'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.jsonrpc).toBe('2.0');
      expect(response.data.id).toBe('1');
      expect(response.data.result).toBeDefined();
      expect(Array.isArray(response.data.result.tools)).toBe(true);
    } catch (error) {
      // Using process.stderr.write instead of console.log
      process.stderr.write(`Test error: ${error}\n`);
      throw error;
    }
  });
});