import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

/**
 * Example client that demonstrates backwards compatibility
 * Attempts Streamable HTTP first, falls back to SSE if needed
 */

async function createCompatibleClient(baseUrl: string) {
    const url = new URL(baseUrl);
    let client: Client | undefined = undefined;

    try {
        // Try modern Streamable HTTP transport first
        console.log("🔄 Attempting Streamable HTTP connection...");
        client = new Client({
            name: 'raindrop-mcp-client',
            version: '1.0.0'
        });

        const transport = new StreamableHTTPClientTransport(new URL('/mcp', url));
        await client.connect(transport);
        console.log("✅ Connected using Streamable HTTP transport");
        return client;

    } catch (error) {
        console.log("⚠️  Streamable HTTP connection failed, falling back to SSE transport");
        console.log("Error:", (error as Error).message);

        try {
            // Fall back to legacy SSE transport
            client = new Client({
                name: 'raindrop-mcp-sse-client',
                version: '1.0.0'
            });

            const sseTransport = new SSEClientTransport(new URL('/sse', url));
            await client.connect(sseTransport);
            console.log("✅ Connected using legacy SSE transport");
            return client;

        } catch (sseError) {
            console.error("❌ Both transport methods failed:");
            console.error("Streamable HTTP:", (error as Error).message);
            console.error("SSE:", (sseError as Error).message);
            throw new Error("Unable to connect with any transport method");
        }
    }
}

async function testClient() {
    const baseUrl = process.env.MCP_SERVER_URL || "http://localhost:3001";

    try {
        console.log(`🚀 Testing MCP client connection to ${baseUrl}`);

        const client = await createCompatibleClient(baseUrl);

        // Test basic capabilities
        console.log("\n📋 Testing server capabilities...");

        // List available tools
        const tools = await client.listTools();
        console.log(`📚 Available tools: ${tools.tools.length}`);
        tools.tools.slice(0, 3).forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });

        // List available resources
        const resources = await client.listResources();
        console.log(`📂 Available resources: ${resources.resources.length}`);
        resources.resources.slice(0, 3).forEach(resource => {
            console.log(`  - ${resource.name}: ${resource.description || 'No description'}`);
        });

        // Test a simple tool call
        if (tools.tools.length > 0) {
            const firstTool = tools.tools[0];
            console.log(`\n🔧 Testing tool: ${firstTool.name}`);

            try {
                // This is just a test - you'd need to provide proper arguments based on the tool
                const result = await client.callTool({
                    name: firstTool.name,
                    arguments: {}
                });
                console.log(`✅ Tool call successful`);
                console.log(`Response content: ${result.content.length} items`);
            } catch (toolError) {
                console.log(`⚠️  Tool call failed (expected - no arguments provided): ${(toolError as Error).message}`);
            }
        }

        console.log("\n✅ Client test completed successfully!");

        // Clean shutdown
        await client.close();

    } catch (error) {
        console.error("❌ Client test failed:", error);
        process.exit(1);
    }
}

// Health check function
async function checkServerHealth(baseUrl: string) {
    try {
        const response = await fetch(`${baseUrl}/health`);
        const health = await response.json();

        console.log("🏥 Server Health Check:");
        console.log(`  Status: ${health.status}`);
        console.log(`  Protocol: ${health.protocol.version}`);
        console.log(`  Active sessions: ${health.sessions.total}`);
        console.log(`  Available transports: ${health.protocol.transports.join(', ')}`);

        return health.status === 'ok';
    } catch (error) {
        console.error("❌ Health check failed:", error);
        return false;
    }
}

async function main() {
    const baseUrl = process.env.MCP_SERVER_URL || "http://localhost:3001";

    console.log("🔍 Checking server health...");
    const isHealthy = await checkServerHealth(baseUrl);

    if (!isHealthy) {
        console.error("❌ Server is not healthy. Please start the server first with: bun run start:http");
        process.exit(1);
    }

    await testClient();
}

if (import.meta.main) {
    main().catch(console.error);
}

export { createCompatibleClient, checkServerHealth };
