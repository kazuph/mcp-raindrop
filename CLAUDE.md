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
- ESM modules (`import/export`)
- Use Zod for validation and schema definitions
- Class-based services with dependency injection
- Functional controllers with try/catch error handling
- Use error objects with status codes and messages

## Conventions
- Imports: Group imports by type (external, internal)
- Naming: camelCase for variables/functions, PascalCase for classes/types
- Error handling: Use try/catch blocks with descriptive error messages
- Type definitions: Prefer interfaces for object types
- Async: Use async/await pattern consistently
- Testing: Use Vitest with mocks for dependencies

## MCP Tools Documentation

### Exposed Tools

#### `getCollections`
- **Description**: Retrieves all collections from Raindrop.io.
- **Parameters**: None
- **Response**: Returns a list of collections with their details.

#### `createCollection`
- **Description**: Creates a new collection.
- **Parameters**:
  - `name` (string): Name of the collection.
  - `isPublic` (boolean, optional): Whether the collection is public.
- **Response**: Returns the created collection details.

#### `getBookmarks`
- **Description**: Retrieves bookmarks with optional filtering.
- **Parameters**:
  - `collectionId` (number, optional): ID of the collection to filter bookmarks.
  - `search` (string, optional): Search query for filtering bookmarks.
  - `tags` (string[], optional): Tags to filter bookmarks.
- **Response**: Returns a list of bookmarks matching the criteria.

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

#### `uploadFile`
- **Description**: Uploads a file to a specified collection.
- **Parameters**:
  - `collectionId` (string): ID of the collection to upload the file to.
  - `file` (File): The file to upload.
- **Response**: Returns the uploaded file details.

#### `setReminder`
- **Description**: Sets a reminder for a specific raindrop.
- **Parameters**:
  - `raindropId` (number): ID of the raindrop to set the reminder for.
  - `reminder` (object):
    - `date` (string): Reminder date in ISO format.
    - `note` (string, optional): Optional note for the reminder.
- **Response**: Returns the updated raindrop with the reminder details.
