# Raindrop.io MCP Server

This project provides a Model Context Protocol (MCP) server for interacting with the [Raindrop.io](https://raindrop.io/) bookmarking service. It allows Language Models (LLMs) and other AI agents to access and manage your Raindrop.io data through the MCP standard.

## Features

- **CRUD Operations**: Create, Read, Update, and Delete collections and bookmarks.
- **Advanced Search**: Filter bookmarks by various criteria like tags, domain, type, creation date, etc.
- **Tag Management**: List, rename, merge, and delete tags.
- **Highlight Access**: Retrieve text highlights from bookmarks.
- **Collection Management**: Reorder, expand/collapse, merge, and remove empty collections.
- **File Upload**: Upload files directly to Raindrop.io.
- **Reminders**: Set reminders for specific bookmarks.
- **Import/Export**: Initiate and check the status of bookmark imports and exports.
- **Trash Management**: Empty the trash.
- **MCP Compliance**: Exposes Raindrop.io functionalities as MCP resources and tools.
- **Streaming Support**: Provides real-time SSE (Server-Sent Events) endpoints for streaming bookmark updates (Optional, via `mcp-sse.service.ts`).
- **Built with TypeScript**: Strong typing for better maintainability.
- **Uses Axios**: For making requests to the Raindrop.io API.
- **Uses Zod**: For robust schema validation of API parameters and responses.
- **Uses MCP SDK**: Leverages the official `@modelcontextprotocol/sdk`.

## Prerequisites

- Node.js (v18 or later recommended) or Bun
- A Raindrop.io account
- A Raindrop.io API Access Token (create one in your [Raindrop.io settings](https://app.raindrop.io/settings/integrations))

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/raindrop-mcp.git
    cd raindrop-mcp
    ```

2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using Bun:
    ```bash
    bun install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory by copying the example:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file and add your Raindrop.io API Access Token:
    ```env
    RAINDROP_ACCESS_TOKEN=YOUR_RAINDROP_ACCESS_TOKEN
    ```

## Running the Server

The server uses standard input/output (stdio) for communication by default.

**Using Node.js:**

```bash
npm run build
npm start
```

**Using Bun:**

```bash
bun run build
bun start
```

This will start the MCP server, listening for requests on stdin and sending responses to stdout.

<!-- Removed section about SSE server and ports -->

## Usage with MCP Clients

Connect your MCP client (like an LLM agent) to the running server process via stdio. The server exposes the following roots:

- `collections`: Manage bookmark collections (folders).
- `bookmarks`: Manage individual bookmarks.
- `tags`: List tags.
- `highlights`: Access text highlights.

It also provides several tools for operational tasks (renaming tags, merging collections, import/export, etc.). Refer to `src/services/mcp.service.ts` for detailed definitions of resources, operations, and tools.

## Development

- **Linting:** `npm run lint` or `bun run lint`
- **Formatting:** `npm run format` or `bun run format`
- **Testing:** `npm test` or `bun test`
- **Build:** `npm run build` or `bun run build`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
