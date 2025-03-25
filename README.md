# Raindrop MCP Server

A Model Context Protocol server implementation for Raindrop.io bookmarks, built with Bun and TypeScript.
Based on the [Raindrop.io API Documentation](https://developer.raindrop.io/)

## Features

- **MCP Server**: Implements the [Model Context Protocol](https://modelcontextprotocol.io) for AI models to interact with Raindrop.io bookmarks
- **Streaming Support**: Provides real-time SSE (Server-Sent Events) endpoints for streaming bookmark updates
- **TypeScript**: Fully typed implementation with comprehensive test coverage

## Prerequisites

- [Bun](https://bun.sh/) (>=1.0.0)
- A Raindrop.io API token

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/raindrop-mcp.git
cd raindrop-mcp

# Install dependencies
bun install

# Copy the environment example file and edit it with your Raindrop API token
cp .env.example .env
```

Edit the `.env` file to add your Raindrop.io API token.

## Development

```bash
# Start the development server
bun run src/index.ts
```

The server will start with:
- MCP SSE Server on PORT (default: 3000)
- MCP Server on MCP_PORT (default: 3001)

## Testing

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

## Building

```bash
# Build the project
bun build ./src/index.ts --outdir ./build
```

## Usage

### MCP Server

The MCP server implements functions that allow AI models to interact with Raindrop.io bookmarks following the [Model Context Protocol](https://modelcontextprotocol.io) specification.

Example MCP function call:

```json
{
  "function": "getBookmarks",
  "parameters": {
    "search": "typescript",
    "limit": 5
  }
}
```

### Streaming Bookmarks

The SSE endpoint allows for streaming bookmark updates in real-time:

```json
{
  "function": "streamBookmarks",
  "parameters": {
    "search": "typescript",
    "limit": 10
  }
}
```

## License

MIT
