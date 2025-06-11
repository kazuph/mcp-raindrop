import { createOptimizedRaindropServer } from './services/mcp-optimized.service.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from 'dotenv';
config(); // Load .env file
// 


export async function main() {
  const transport = new StdioServerTransport();
  // Await the creation of the optimized server and destructure the result
  const { server, cleanup } = createOptimizedRaindropServer();

  await server.connect(transport);

  // Cleanup on exit
  process.on("SIGINT", async () => {
    await cleanup();
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
