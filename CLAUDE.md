# CLAUDE.md - Raindrop MCP Project Guidelines

## External References
- Raindrop.io API Documentation: [https://developer.raindrop.io](https://developer.raindrop.io)
- MCP Documentation: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)
- [Model Context Protocol with LLMs](https://modelcontextprotocol.io/llms-full.txt)
- [MCP Typescript SDK v1.9.0](https://github.com/modelcontextprotocol/typescript-sdk)
- [Example MCP servers repository](https://github.com/modelcontextprotocol/servers)
- [This project on GitHub](https://github.com/kazuph/mcp-raindrop)

## Installation and Usage

### NPM Package
You can use this package directly from npm:
```bash
npx @kazuph/mcp-raindrop
```

### Development Commands
- Build/Run: `bun run start` (or `bun run src/index.ts`)
- Development: `bun run dev` (watch mode)
- Type checking: `bun run type-check`
- Tests: `bun run test`
- Run single test: `bun test src/tests/mcp.service.test.ts`
- Test with coverage: `bun run test:coverage`
- Debug: `bun run debug` or `bun run inspector` (runs with MCP inspector)
- Build: `bun run build` (builds to build directory)
- Clean: `bun run clean` (removes build directory)
- HTTP server: `bun run start:http` (starts with HTTP transport)

## Code Style
- TypeScript with strict type checking
- ESM modules (`import/export`) with `.js` extension in imports
- Use Zod for validation and schema definitions
- Use Axios for API requests
- Class-based services with dependency injection
- Functional controllers with try/catch error handling
- Use error objects with status codes and messages
- Resource-based MCP design using ResourceTemplate where appropriate

## Conventions
- Imports: Group imports by type (external, internal)
- Naming: camelCase for variables/functions, PascalCase for classes/types
- Error handling: Use try/catch blocks with descriptive error messages
- Type definitions: Prefer interfaces for object types
- Async: Use async/await pattern consistently
- Testing: Use Vitest with mocks for dependencies
- Tests should be co-located with source files in `src/tests` directory

## Project Structure
- Source code in `src/` directory
- Tests co-located with source files in `src/tests` directory
- Configuration in .env
- Types in `src/types`
- Services in `src/services`
- OpenAPI specification in `raindrop.yaml`
- Smithery configuration in `smithery.yaml`

## MCP Resources
- Collections: `collections://all` and `collections://{parentId}/children`
- Tags: `tags://all` and `tags://collection/{collectionId}`
- Highlights: `highlights://all`, `highlights://all?page={pageNumber}&perPage={perPageCount}`, `highlights://raindrop/{raindropId}`, and `highlights://collection/{collectionId}`
- Bookmarks: `bookmarks://collection/{collectionId}` and `bookmarks://raindrop/{id}`
- User info: `user://info`
- User stats: `user://stats`

## MCP Configuration

To use this MCP server with your AI assistant, add the following to your `.mcp.json` file:

```json
{
  "servers": {
    "raindrop": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@kazuph/mcp-raindrop@latest"],
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

### Alternative Configuration Options

For local development, you can use the following:

```json
{
  "servers": {
    "raindrop": {
      "type": "stdio",
      "command": "cd /path/to/raindrop-mcp && bun start",
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

For HTTP transport instead of stdio:

```json
{
  "servers": {
    "raindrop": {
      "type": "http",
      "url": "http://localhost:3000",
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

### Smithery Configuration

This project includes a `smithery.yaml` configuration file for [Smithery](https://smithery.ai/), which allows easy discovery and installation of MCP servers. The configuration specifies how to start the MCP server and requires no additional configuration options.

## MCP Tools Documentation

### Exposed Tools

#### `collection_list`
- **Description**: List all collections or child collections of a parent. Use this to understand the user's collection structure before performing other operations.
- **Parameters**:
  - `parentId` (number, optional): Parent collection ID to list children. Omit to list root collections.
- **Response**: Returns a list of collections with their details.

#### `collection_get`
- **Description**: Get detailed information about a specific collection by ID. Use this when you need full details about a collection.
- **Parameters**:
  - `id` (number): Collection ID (e.g., 12345).
- **Response**: Returns the collection details.

#### `collection_create`
- **Description**: Create a new collection (folder) for organizing bookmarks. Collections help organize bookmarks by topic, project, or any categorization system.
- **Parameters**:
  - `title` (string): Collection name (e.g., "Web Development Resources", "Research Papers").
  - `isPublic` (boolean, optional): Make collection publicly viewable (default: false).
- **Response**: Returns the created collection details.

#### `collection_find`
- **Description**: Find collection ID by name (e.g., "archive", "unread", "アーカイブ"). This helps identify target collections for moving bookmarks.
- **Parameters**:
  - `name` (string): Collection name to search for (case-insensitive, supports partial matches).
- **Response**: Returns matching collections with IDs and metadata.

#### `bookmark_search`
- **Description**: Search bookmarks with advanced filtering. This is the primary tool for finding bookmarks. Supports full-text search, tag filtering, date ranges, and collection scoping.
- **Parameters**:
  - `query` (string, optional): Search query (searches title, description, content, and URL).
  - `collection` (number, optional): Limit search to specific collection ID.
  - `tags` (string[], optional): Filter by tags (e.g., ["javascript", "tutorial"]).
  - `createdStart` (string, optional): Created after date (ISO format: YYYY-MM-DD).
  - `createdEnd` (string, optional): Created before date (ISO format: YYYY-MM-DD).
  - `important` (boolean, optional): Only show important/starred bookmarks.
  - `media` (string, optional): Filter by media type ('image', 'video', 'document', 'audio').
  - `page` (number, optional): Page number for pagination (starts at 0).
  - `perPage` (number, optional): Results per page (1-50).
  - `sort` (string, optional): Sort order (prefix with - for descending).
- **Response**: Returns a list of bookmarks matching the criteria with pagination metadata.

#### `tag_list`
- **Description**: List all tags or tags from a specific collection. Use this to understand the current tag structure before performing tag operations.
- **Parameters**:
  - `collectionId` (number, optional): Collection ID to filter tags (omit for all tags).
- **Response**: Returns a list of tags with usage count.

#### `tag_manage`
- **Description**: Perform tag management operations like renaming, merging, or deleting tags. Use this to maintain a clean tag structure.
- **Parameters**:
  - `operation` (string): Tag management operation ('rename', 'merge', 'delete', 'delete_multiple').
  - `collectionId` (number, optional): Collection ID to scope operation (omit for all collections).
  - `oldName` (string, optional): Current tag name (required for rename).
  - `newName` (string, optional): New tag name (required for rename).
  - `sourceTags` (string[], optional): Tags to merge from (required for merge).
  - `destinationTag` (string, optional): Tag to merge into (required for merge).
  - `tagName` (string, optional): Tag to delete (required for single delete).
  - `tagNames` (string[], optional): Tags to delete (required for multiple delete).
- **Response**: Returns confirmation of tag operation.

#### `highlight_list`
- **Description**: List highlights from all bookmarks, a specific bookmark, or a collection. Use this to find and review saved text highlights.
- **Parameters**:
  - `scope` (string): Scope of highlights to retrieve ('all', 'bookmark', 'collection').
  - `bookmarkId` (number, optional): Bookmark ID (required when scope=bookmark).
  - `collectionId` (number, optional): Collection ID (required when scope=collection).
  - `page` (number, optional): Page number for pagination (starts at 0).
  - `perPage` (number, optional): Results per page (1-50).
- **Response**: Returns a list of highlights with text, color, notes, timestamps, and associated raindrop metadata.

#### `collection_update`
- **Description**: Update collection properties like title, visibility, or view settings. Use this to rename collections or change their configuration.
- **Parameters**:
  - `id` (number): Collection ID to update.
  - `title` (string, optional): New collection title.
  - `isPublic` (boolean, optional): Change public visibility.
  - `view` (string, optional): Collection view type in Raindrop.io interface ('list', 'simple', 'grid', 'masonry').
  - `sort` (string, optional): Default sort order ('title', '-created').
- **Response**: Returns the updated collection details.

#### `collection_delete`
- **Description**: Delete a collection permanently. WARNING: This action cannot be undone. Bookmarks in the collection will be moved to Unsorted.
- **Parameters**:
  - `id` (number): Collection ID to delete.
- **Response**: Returns confirmation of collection deletion.

#### `collection_share`
- **Description**: Share a collection with specific users or generate a public sharing link. Useful for collaboration or sharing curated bookmark lists.
- **Parameters**:
  - `id` (number): Collection ID to share.
  - `level` (string): Access level ('view', 'edit', 'remove').
  - `emails` (string[], optional): Email addresses to share with (for specific user sharing).
- **Response**: Returns sharing details including public link.

#### `collection_maintenance`
- **Description**: Perform maintenance operations on collections. Use this to clean up your collection structure.
- **Parameters**:
  - `operation` (string): Maintenance operation to perform ('merge', 'remove_empty', 'empty_trash').
  - `targetId` (number, optional): Target collection ID (required for merge operation).
  - `sourceIds` (number[], optional): Source collection IDs to merge (required for merge operation).
- **Response**: Returns confirmation of maintenance operation.

#### `user_profile`
- **Description**: Get user account information including name, email, subscription status, and registration date.
- **Parameters**: None
- **Response**: Returns user details including email, name, and subscription status.

#### `user_statistics`
- **Description**: Get user account statistics or statistics for a specific collection. Includes bookmark counts, collection counts, and other usage metrics.
- **Parameters**:
  - `collectionId` (number, optional): Collection ID for specific collection statistics (omit for account-wide stats).
- **Response**: Returns statistics about user's raindrops and collections.

#### `import_status`
- **Description**: Check the status of an ongoing import operation. Use this to monitor import progress.
- **Parameters**: None
- **Response**: Returns the current import status, progress, and results.

#### `export_status`
- **Description**: Check the status of an ongoing export operation and get download link when ready.
- **Parameters**: None
- **Response**: Returns the current export status, progress, and download URL if ready.

#### `export_bookmarks`
- **Description**: Export bookmarks in various formats for backup or migration. Supports CSV, HTML, and PDF formats with filtering options.
- **Parameters**:
  - `format` (string): Export format ('csv', 'html', 'pdf').
  - `collectionId` (number, optional): Export specific collection only (omit for all bookmarks).
  - `includeBroken` (boolean, optional): Include bookmarks with broken/dead links.
  - `includeDuplicates` (boolean, optional): Include duplicate bookmarks.
- **Response**: Returns confirmation with status URL.


#### `bookmark_get`
- **Description**: Get detailed information about a specific bookmark by ID. Use this when you need full bookmark details.
- **Parameters**:
  - `id` (number): Bookmark ID.
- **Response**: Returns the bookmark details.

#### `bookmark_create`
- **Description**: Add a new bookmark to a collection. The system will automatically extract title, description, and other metadata from the URL.
- **Parameters**:
  - `url` (string): URL to bookmark (e.g., "https://example.com/article").
  - `collectionId` (number): Collection ID where bookmark will be saved.
  - `title` (string, optional): Custom title (if not provided, will be extracted from URL).
  - `description` (string, optional): Custom description or notes.
  - `tags` (string[], optional): Tags for organization (e.g., ["javascript", "tutorial"]).
  - `important` (boolean, optional): Mark as important/starred.
- **Response**: Returns the created bookmark details.

#### `bookmark_update`
- **Description**: Update bookmark properties like title, description, tags, or move to different collection. Use this to modify existing bookmarks.
- **Parameters**:
  - `id` (number): Bookmark ID to update.
  - `title` (string, optional): New title.
  - `description` (string, optional): New description or notes.
  - `tags` (string[], optional): New tags (replaces existing tags).
  - `collectionId` (number, optional): Move to different collection.
  - `important` (boolean, optional): Change important/starred status.
- **Response**: Returns the updated bookmark details.

#### `bookmark_recent`
- **Description**: Get your most recent bookmarks. This is useful to quickly see your latest saved items and their IDs for further operations.
- **Parameters**:
  - `count` (number, optional): Number of recent bookmarks to retrieve (1-20, default: 10).
- **Response**: Returns list of recent bookmarks with metadata.

#### `bookmark_reminders`
- **Description**: Manage reminders for bookmarks. Set or remove reminder notifications for important bookmarks you want to revisit.
- **Parameters**:
  - `operation` (string): Reminder operation ('set', 'remove').
  - `bookmarkId` (number): Bookmark ID.
  - `date` (string, optional): Reminder date in ISO format (required for set operation).
  - `note` (string, optional): Optional reminder note.
- **Response**: Returns confirmation of reminder operation.

#### `bookmark_batch_operations`
- **Description**: Perform operations on multiple bookmarks at once. Efficient for bulk updates, moves, tagging, or deletions.
- **Parameters**:
  - `operation` (string): Batch operation type ('update', 'move', 'tag_add', 'tag_remove', 'delete', 'delete_permanent').
  - `bookmarkIds` (number[]): List of bookmark IDs to operate on.
  - `collectionId` (number, optional): Target collection ID (for move/update operations).
  - `important` (boolean, optional): Set important status (for update operations).
  - `tags` (string[], optional): Tags to add/remove (for tag operations).
- **Response**: Returns confirmation of batch operation with affected bookmark count.

#### `highlight_create`
- **Description**: Create a new text highlight for a bookmark. Use this to save important text passages from articles or documents.
- **Parameters**:
  - `bookmarkId` (number): Bookmark ID to add highlight to.
  - `text` (string): Text to highlight (the actual content to be highlighted).
  - `note` (string, optional): Optional note or comment about this highlight.
  - `color` (string, optional): Highlight color (e.g., "yellow", "blue", "#FFFF00").
- **Response**: Returns the created highlight details.

#### `highlight_update`
- **Description**: Update an existing highlight's text, note, or color. Use this to modify saved highlights.
- **Parameters**:
  - `id` (number): Highlight ID to update.
  - `text` (string, optional): New highlighted text.
  - `note` (string, optional): New note or comment.
  - `color` (string, optional): New highlight color.
- **Response**: Returns the updated highlight details.

#### `highlight_delete`
- **Description**: Delete a highlight permanently. This action cannot be undone.
- **Parameters**:
  - `id` (number): Highlight ID to delete.
- **Response**: Returns confirmation of highlight deletion.

