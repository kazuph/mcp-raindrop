# CLAUDE.md - Raindrop MCP Project Guidelines

## Commands
- Build/Run: `bun run start` (or `bun run src/index.ts`)
- Development: `bun run dev` (watch mode)
- Type checking: `bun run type-check`
- Tests: `bun run test`
- Run single test: `bun test src/services/__tests__/mcp.service.test.ts`
- Test with coverage: `bun run test:coverage`

## Code Style
- TypeScript with strict type checking
- ESM modules (`import/export`) with `.js` extension in imports
- Use Zod for validation and schema definitions
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
- Tests should be co-located with source files in `__tests__` directories

## Project Structure
- Source code in `src/` directory
- Tests co-located with source files in `__tests__` directories
- Configuration in `src/config`
- Types in `src/types`
- Services in `src/services`

## MCP Resources
- Collections: `collections://all` and `collections://{parentId}/children`
- Tags: `tags://all`
- Highlights: `highlights://all`
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
  - `tags` (string[]): List of tags to merge.
  - `newName` (string): New name for the merged tags.
- **Response**: Returns confirmation of tag merge.

#### `deleteTags`
- **Description**: Deletes specified tags.
- **Parameters**:
  - `collectionId` (number, optional): ID of the collection to restrict deletion.
  - `tags` (string[]): List of tags to delete.
- **Response**: Returns confirmation of tag deletion.

#### `getAllTags`
- **Description**: Retrieves all tags across all collections.
- **Parameters**: None
- **Response**: Returns a list of all tags with usage count.

#### `getHighlights`
- **Description**: Retrieves highlights for a specific raindrop.
- **Parameters**:
  - `raindropId` (number): ID of the raindrop to retrieve highlights for.
- **Response**: Returns a list of highlights with text, color, notes, and timestamps.

#### `getAllHighlights`
- **Description**: Retrieves all highlights across all raindrops.
- **Parameters**: None
- **Response**: Returns a list of all highlights with text, color, notes, and timestamps.

#### `getHighlightsByCollection`
- **Description**: Retrieves all highlights for bookmarks in a specific collection.
- **Parameters**:
  - `collectionId` (number): ID of the collection to retrieve highlights from.
- **Response**: Returns a list of highlights with associated raindrop IDs.

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
  - `targetCollectionId` (number): ID of the target collection.
  - `collectionIds` (number[]): List of collection IDs to merge.
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

#### `uploadFile`
- **Description**: Uploads a file to a specified collection.
- **Parameters**:
  - `collectionId` (number): ID of the collection to upload the file to.
  - `file` (File): The file to upload.
- **Response**: Returns the uploaded file details.

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

#### `createHighlight`
- **Description**: Create a new highlight for a bookmark.
- **Parameters**:
  - `raindropId` (number): Bookmark ID.
  - `text` (string): Highlighted text.
  - `note` (string, optional): Additional note for the highlight.
  - `color` (string, optional): Color for the highlight.
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
