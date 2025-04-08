# CLAUDE.md - Raindrop MCP Project Guidelines

## External References
- Raindrop.io API Documentation: [https://developer.raindrop.io](https://developer.raindrop.io)
- MCP Documentation: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)
- [Model Context Protocol with LLMs](https://modelcontextprotocol.io/llms-full.txt)
- [MCP Typescript SDK v1.9.0](https://github.com/modelcontextprotocol/typescript-sdk)
- [Example MCP servers repository](https://github.com/modelcontextprotocol/servers)

## Commands
- Build/Run: `bun run start` (or `bun run src/index.ts`)
- Development: `bun run dev` (watch mode)
- Type checking: `bun run type-check`
- Tests: `bun run test`
- Run single test: `bun test src/tests/mcp.service.test.ts`
- Test with coverage: `bun run test:coverage`
- Debug: `bun run debug` or `bun run inspector` (runs with MCP inspector)
- Build: `bun run build` (builds to build directory)
- Clean: `bun run clean` (removes build directory)
- HTTP server: `bun run start:http` or `bun run http` (starts with HTTP transport)

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

## MCP Resources
- Collections: `collections://all` and `collections://{parentId}/children`
- Tags: `tags://all` and `tags://collection/{collectionId}`
- Highlights: `highlights://all`, `highlights://all?page={pageNumber}&perPage={perPageCount}`, `highlights://raindrop/{raindropId}`, and `highlights://collection/{collectionId}`
- Bookmarks: `bookmarks://collection/{collectionId}` and `bookmarks://raindrop/{id}`
- User info: `user://info`
- User stats: `user://stats`

## MCP Tools Documentation

### Exposed Tools

#### `getCollections`
- **Description**: Retrieves all collections from Raindrop.io.
- **Parameters**: None
- **Response**: Returns a list of collections with their details.

#### `getCollection`
- **Description**: Retrieves a specific collection by ID.
- **Parameters**:
  - `id` (number): ID of the collection to retrieve.
- **Response**: Returns the collection details.

#### `createCollection`
- **Description**: Creates a new collection.
- **Parameters**:
  - `title` (string): Title of the collection.
  - `isPublic` (boolean, optional): Whether the collection is public.
- **Response**: Returns the created collection details.

#### `getBookmarks`
- **Description**: Retrieves bookmarks with optional filtering.
- **Parameters**:
  - `collection` (number, optional): ID of the collection to filter bookmarks.
  - `search` (string, optional): Search query for filtering bookmarks.
  - `tags` (string[], optional): Tags to filter bookmarks.
  - `page` (number, optional): Page number for pagination.
  - `perPage` (number, optional): Items per page (max 50).
  - `sort` (string, optional): Sort order for results.
- **Response**: Returns a list of bookmarks matching the criteria.

#### `searchBookmarks`
- **Description**: Search bookmarks with advanced filters.
- **Parameters**:
  - `search` (string, optional): Search query.
  - `collection` (number, optional): Collection ID.
  - `tags` (string[], optional): Filter by tags.
  - `createdStart` (string, optional): Created after date (ISO format).
  - `createdEnd` (string, optional): Created before date (ISO format).
  - `important` (boolean, optional): Only important bookmarks.
  - `media` (string, optional): Media type filter.
  - `page` (number, optional): Page number.
  - `perPage` (number, optional): Items per page (max 50).
  - `sort` (string, optional): Sort order.
- **Response**: Returns a list of bookmarks matching the advanced criteria.

#### `getTags`
- **Description**: Retrieves tags from a specific collection or all collections.
- **Parameters**:
  - `collectionId` (number, optional): ID of the collection to filter tags.
- **Response**: Returns a list of tags with usage count.

#### `renameTag`
- **Description**: Renames a tag.
- **Parameters**:
  - `collectionId` (number, optional): ID of the collection to restrict renaming.
  - `oldName` (string): Current name of the tag.
  - `newName` (string): New name for the tag.
- **Response**: Returns confirmation of tag rename.

#### `mergeTags`
- **Description**: Merges multiple tags into one.
- **Parameters**:
  - `collectionId` (number, optional): ID of the collection to restrict merging.
  - `sourceTags` (string[]): List of tags to merge.
  - `destinationTag` (string): New name for the merged tags.
- **Response**: Returns confirmation of tag merge.

#### `deleteTags`
- **Description**: Deletes specified tags.
- **Parameters**:
  - `collectionId` (number, optional): ID of the collection to restrict deletion.
  - `tags` (string[]): List of tags to delete.
- **Response**: Returns confirmation of tag deletion.

#### `deleteTag`
- **Description**: Remove a tag from all bookmarks or in a specific collection.
- **Parameters**:
  - `tag` (string): Tag to delete.
  - `collectionId` (number, optional): Collection ID to restrict deletion.
- **Response**: Returns confirmation of tag deletion.

#### `getAllTags`
- **Description**: Retrieves all tags across all collections.
- **Parameters**: None
- **Response**: Returns a list of all tags with usage count.

#### `getHighlights`
- **Description**: Retrieves highlights for a specific raindrop.
- **Parameters**:
  - `raindropId` (number): ID of the raindrop to retrieve highlights for.
- **Response**: Returns a list of highlights with text, color, notes, timestamps, and additional metadata fields (title, tags, link, domain, and excerpt).

#### `getAllHighlights`
- **Description**: Retrieves all highlights across all raindrops with pagination support.
- **Parameters**: 
  - `page` (number, optional): Page number for pagination.
  - `perPage` (number, optional): Items per page (default 50).
- **Response**: Returns a list of all highlights with text, color, notes, timestamps, and additional metadata (title, tags, link, domain, excerpt, and last update).

#### `getHighlightsByCollection`
- **Description**: Retrieves all highlights for bookmarks in a specific collection with pagination support.
- **Parameters**:
  - `collectionId` (number): ID of the collection to retrieve highlights from.
  - `page` (number, optional): Page number for pagination.
  - `perPage` (number, optional): Items per page (default 50).
- **Response**: Returns a list of highlights with associated raindrop IDs and additional metadata (title, tags, link, domain, excerpt, and last update).

#### `updateCollection`
- **Description**: Update an existing collection.
- **Parameters**:
  - `id` (number): Collection ID.
  - `title` (string, optional): New title.
  - `isPublic` (boolean, optional): Whether the collection is public.
  - `view` (string, optional): View type ('list', 'simple', 'grid', 'masonry').
  - `sort` (string, optional): Sort order ('title', '-created').
- **Response**: Returns the updated collection details.

#### `deleteCollection`
- **Description**: Delete a collection.
- **Parameters**:
  - `id` (number): Collection ID.
- **Response**: Returns confirmation of collection deletion.

#### `shareCollection`
- **Description**: Share a collection with others.
- **Parameters**:
  - `id` (number): Collection ID.
  - `level` (string): Access level ('view', 'edit', 'remove').
  - `emails` (string[], optional): Email addresses to share with.
- **Response**: Returns sharing details including public link.

#### `reorderCollections`
- **Description**: Reorders collections based on a sort parameter.
- **Parameters**:
  - `sort` (string): Sort order ('title', '-title', or '-count').
- **Response**: Returns confirmation of collection reordering.

#### `toggleCollectionsExpansion`
- **Description**: Expands or collapses all collections.
- **Parameters**:
  - `expand` (boolean): True to expand all collections, false to collapse.
- **Response**: Returns confirmation of collection expansion state change.

#### `mergeCollections`
- **Description**: Merges multiple collections into one target collection.
- **Parameters**:
  - `targetId` (number): ID of the target collection.
  - `sourceIds` (number[]): List of collection IDs to merge.
- **Response**: Returns confirmation of collection merge.

#### `removeEmptyCollections`
- **Description**: Removes all empty collections.
- **Parameters**: None
- **Response**: Returns the number of empty collections removed.

#### `emptyTrash`
- **Description**: Empties the trash collection.
- **Parameters**: None
- **Response**: Returns confirmation of trash emptying.

#### `getUserInfo`
- **Description**: Get user information.
- **Parameters**: None
- **Response**: Returns user details including email, name, and subscription status.

#### `getUserStats`
- **Description**: Get user statistics.
- **Parameters**:
  - `collectionId` (number, optional): Collection ID for specific collection stats.
- **Response**: Returns statistics about user's raindrops and collections.

#### `getImportStatus`
- **Description**: Check the status of an ongoing import.
- **Parameters**: None
- **Response**: Returns the current import status, progress, and results.

#### `getExportStatus`
- **Description**: Check the status of an ongoing export.
- **Parameters**: None
- **Response**: Returns the current export status, progress, and download URL if ready.

#### `exportBookmarks`
- **Description**: Export bookmarks in various formats.
- **Parameters**:
  - `format` (string): Export format ('csv', 'html', 'pdf').
  - `collectionId` (number, optional): Export specific collection.
  - `broken` (boolean, optional): Include broken links.
  - `duplicates` (boolean, optional): Include duplicates.
- **Response**: Returns confirmation with status URL.


#### `getBookmark`
- **Description**: Get a specific bookmark by ID.
- **Parameters**:
  - `id` (number): Bookmark ID.
- **Response**: Returns the bookmark details.

#### `createBookmark`
- **Description**: Create a new bookmark.
- **Parameters**:
  - `link` (string): URL of the bookmark.
  - `collectionId` (number): Collection ID.
  - `title` (string, optional): Title of the bookmark.
  - `excerpt` (string, optional): Short description.
  - `tags` (string[], optional): List of tags.
  - `important` (boolean, optional): Mark as important.
- **Response**: Returns the created bookmark details.

#### `updateBookmark`
- **Description**: Update an existing bookmark.
- **Parameters**:
  - `id` (number): Bookmark ID.
  - `title` (string, optional): Title of the bookmark.
  - `excerpt` (string, optional): Short excerpt or description.
  - `tags` (string[], optional): List of tags.
  - `collectionId` (number, optional): Collection ID to move the bookmark to.
  - `important` (boolean, optional): Mark as important.
- **Response**: Returns the updated bookmark details.

#### `deleteBookmark`
- **Description**: Delete a bookmark.
- **Parameters**:
  - `id` (number): Bookmark ID.
  - `permanent` (boolean, optional): Permanently delete (skip trash).
- **Response**: Returns confirmation of bookmark deletion.

#### `batchUpdateBookmarks`
- **Description**: Update multiple bookmarks at once.
- **Parameters**:
  - `ids` (number[]): List of bookmark IDs.
  - `tags` (string[], optional): Tags to apply to all bookmarks.
  - `collectionId` (number, optional): Collection ID to move bookmarks to.
  - `important` (boolean, optional): Mark as important.
- **Response**: Returns confirmation of batch update.

#### `bulkMoveBookmarks`
- **Description**: Move multiple bookmarks to another collection.
- **Parameters**:
  - `ids` (number[]): List of bookmark IDs to move.
  - `collectionId` (number): Target collection ID.
- **Response**: Returns confirmation of bulk move operation.

#### `bulkTagBookmarks`
- **Description**: Add or remove tags from multiple bookmarks.
- **Parameters**:
  - `ids` (number[]): List of bookmark IDs.
  - `tags` (string[]): Tags to apply.
  - `operation` (string): Whether to 'add' or 'remove' the specified tags.
- **Response**: Returns confirmation of bulk tag operation.

#### `batchDeleteBookmarks`
- **Description**: Delete multiple bookmarks at once.
- **Parameters**:
  - `ids` (number[]): List of bookmark IDs to delete.
  - `permanent` (boolean, optional): Permanently delete (skip trash).
- **Response**: Returns confirmation of batch deletion.

#### `createHighlight`
- **Description**: Create a new highlight for a bookmark.
- **Parameters**:
  - `raindropId` (number): Bookmark ID.
  - `text` (string): Highlighted text.
  - `note` (string, optional): Additional note for the highlight.
  - `color` (string, optional): Color for the highlight (e.g., "yellow", "#FFFF00").
- **Response**: Returns the created highlight details.

#### `updateHighlight`
- **Description**: Update an existing highlight.
- **Parameters**:
  - `id` (number): Highlight ID.
  - `text` (string, optional): New highlighted text.
  - `note` (string, optional): New note.
  - `color` (string, optional): New color.
- **Response**: Returns the updated highlight details.

#### `deleteHighlight`
- **Description**: Delete a highlight.
- **Parameters**:
  - `id` (number): Highlight ID.
- **Response**: Returns confirmation of highlight deletion.

#### `setReminder`
- **Description**: Sets a reminder for a specific raindrop.
- **Parameters**:
  - `raindropId` (number): ID of the raindrop to set the reminder for.
  - `date` (string): Reminder date in ISO format.
  - `note` (string, optional): Optional note for the reminder.
- **Response**: Returns the updated raindrop with the reminder details.

#### `deleteReminder`
- **Description**: Delete a reminder from a bookmark.
- **Parameters**:
  - `raindropId` (number): Bookmark ID.
- **Response**: Returns confirmation of reminder deletion.
