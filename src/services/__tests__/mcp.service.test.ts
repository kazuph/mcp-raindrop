import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import RaindropMCPService from '../mcp.service.js';
import raindropService from '../raindrop.service.js';

// Mock the dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn()
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('../raindrop.service', () => ({
  default: {
    getCollections: vi.fn(),
    getCollection: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    reorderCollections: vi.fn(),
    getBookmarks: vi.fn(),
    createBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    getTags: vi.fn(),
    renameTag: vi.fn(),
    mergeTags: vi.fn(),
    deleteTags: vi.fn(),
    getUserInfo: vi.fn(),
    getAllHighlights: vi.fn(),
  }
}));

// Constants for test IDs and data
const KNOWN_COLLECTION_ID = 24419967; // Specific ID for "gdelt" as per instructions
const OTHER_COLLECTION_ID = 24419968; // Generic ID for testing
const NEW_COLLECTION_ID = 12345;     // ID for newly created items
const BOOKMARK_ID_1 = 1;             // Generic bookmark ID
const BOOKMARK_ID_2 = 2;             // Another generic bookmark ID
const HIGHLIGHT_ID_1 = 'h1';         // Generic highlight ID
const USER_ID = 123;                 // Generic user ID
const TAG_JS = 'javascript';
const TAG_TS = 'typescript';
const TAG_API = 'api';
const TAG_NEW = 'new';
const TAG_TEST = 'test';
const TAG_EXAMPLE = 'example';
const TAG_UPDATED = 'updated';
const TAG_JS_RENAMED = 'js';
const TAG_ECMASCRIPT = 'ecmascript';
const TAG_OBSOLETE = 'obsolete';
const TAG_TEMP = 'temp';

describe('RaindropMCPService', () => {
  let service: typeof RaindropMCPService;
  let mockServer: any;
  let toolHandlers: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    toolHandlers = new Map();

    mockServer = {
      tool: vi.fn().mockImplementation((name, description, ...args) => {
        // Handle both function-only and schema+function cases
        const handler = args.length > 1 ? args[1] : args[0];
        toolHandlers.set(name, handler);
        return mockServer;
      }),
      connect: vi.fn().mockResolvedValue(undefined)
    };

    (McpServer as any).mockImplementation((config: { name: string; version: string; description: string; capabilities: { logging: boolean } }) => {
      expect(config).toEqual({
        name: 'raindrop-mcp',
        version: '1.0.0',
        description: 'MCP Server for Raindrop.io bookmarking service',
        capabilities: {
          logging: true
        }
      });
      return mockServer;
    });

    service = new RaindropMCPService();
  });

  describe('constructor', () => {
    it('should initialize the server with correct configuration', () => {
      expect(McpServer).toHaveBeenCalledWith({
        name: 'raindrop-mcp',
        version: '1.0.0',
        description: 'MCP Server for Raindrop.io bookmarking service',
        capabilities: {
          logging: true
        }
      });
    });
  });

  describe('setupHandlers', () => {
    it('should set up getCollection handler for known ID', async () => {
      const mockCollection = {
        _id: KNOWN_COLLECTION_ID,
        title: 'gdelt', // As per instructions
        count: 42,
        public: false,
        created: '2025-03-26T00:00:00Z',
        lastUpdate: '2025-03-26T00:00:00Z'
      };
      (raindropService.getCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockCollection);

      const handler = toolHandlers.get('getCollection');
      if (!handler) {
        throw new Error('Handler getCollection not registered');
      }

      const result = await handler({ id: KNOWN_COLLECTION_ID });
      expect(raindropService.getCollection).toHaveBeenCalledWith(KNOWN_COLLECTION_ID);
      expect(result).toEqual({
        content: [{
          type: "text",
          text: mockCollection.title,
          metadata: {
            id: mockCollection._id,
            count: mockCollection.count,
            public: mockCollection.public,
            created: mockCollection.created,
            lastUpdate: mockCollection.lastUpdate
          }
        }]
      });
    });

    it('should set up getCollections handler', async () => {
      const mockCollections = [
        {
          _id: KNOWN_COLLECTION_ID,
          title: 'gdelt',
          count: 42,
          public: false,
          created: '2025-03-26T00:00:00Z',
          lastUpdate: '2025-03-26T00:00:00Z'
        },
        {
          _id: OTHER_COLLECTION_ID,
          title: 'Research Papers',
          count: 156,
          public: true,
          created: '2025-03-26T00:00:00Z',
          lastUpdate: '2025-03-26T00:00:00Z'
        }
      ];
      (raindropService.getCollections as ReturnType<typeof vi.fn>).mockResolvedValue(mockCollections);

      const handler = toolHandlers.get('getCollections');
      if (!handler) {
        throw new Error('Handler getCollections not registered');
      }

      const result = await handler();
      expect(raindropService.getCollections).toHaveBeenCalled();
      expect(result).toEqual({
        content: mockCollections.map(collection => ({
          type: "text",
          text: collection.title,
          metadata: {
            id: collection._id,
            count: collection.count,
            public: collection.public,
            created: collection.created,
            lastUpdate: collection.lastUpdate
          }
        }))
      });
    });

    it('should set up createCollection handler', async () => {
        const newCollectionTitle = 'New Test Collection';
        const mockNewCollection = {
            _id: NEW_COLLECTION_ID,
            title: newCollectionTitle,
            count: 0,
            public: false,
            created: '2025-03-26T01:00:00Z',
            lastUpdate: '2025-03-26T01:00:00Z'
        };
        (raindropService.createCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockNewCollection);

        const handler = toolHandlers.get('createCollection');
        if (!handler) {
          throw new Error('Handler createCollection not registered');
        }

        const result = await handler({ title: newCollectionTitle });
        expect(raindropService.createCollection).toHaveBeenCalledWith(newCollectionTitle);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Created collection: ${mockNewCollection.title}`,
                metadata: {
                    id: mockNewCollection._id,
                    title: mockNewCollection.title,
                    count: mockNewCollection.count,
                    public: mockNewCollection.public,
                    created: mockNewCollection.created,
                    lastUpdate: mockNewCollection.lastUpdate
                }
            }]
        });
    });

    it('should set up updateCollection handler', async () => {
        const updatedTitle = 'Updated Collection';
        const mockUpdatedCollection = {
            _id: OTHER_COLLECTION_ID, // Use a generic ID for update tests
            title: updatedTitle,
            count: 156,
            public: true,
            created: '2025-03-26T00:00:00Z',
            lastUpdate: '2025-03-26T02:00:00Z'
        };
        (raindropService.updateCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdatedCollection);

        const handler = toolHandlers.get('updateCollection');
        if (!handler) {
          throw new Error('Handler updateCollection not registered');
        }

        const updates = { title: updatedTitle, public: true };
        const result = await handler({ id: OTHER_COLLECTION_ID, ...updates });
        expect(raindropService.updateCollection).toHaveBeenCalledWith(OTHER_COLLECTION_ID, updates);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Updated collection: ${mockUpdatedCollection.title}`,
                metadata: {
                    id: mockUpdatedCollection._id,
                    title: mockUpdatedCollection.title,
                    count: mockUpdatedCollection.count,
                    public: mockUpdatedCollection.public,
                    created: mockUpdatedCollection.created,
                    lastUpdate: mockUpdatedCollection.lastUpdate
                }
            }]
        });
    });

    it('should set up deleteCollection handler', async () => {
        (raindropService.deleteCollection as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const handler = toolHandlers.get('deleteCollection');
        if (!handler) {
          throw new Error('Handler deleteCollection not registered');
        }

        const result = await handler({ id: OTHER_COLLECTION_ID }); // Use a generic ID for delete tests
        expect(raindropService.deleteCollection).toHaveBeenCalledWith(OTHER_COLLECTION_ID);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Deleted collection with ID: ${OTHER_COLLECTION_ID}`
            }]
        });
    });

    it('should set up reorderCollections handler', async () => {
        (raindropService.reorderCollections as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const handler = toolHandlers.get('reorderCollections');
        if (!handler) {
          throw new Error('Handler reorderCollections not registered');
        }

        const ids = [OTHER_COLLECTION_ID, KNOWN_COLLECTION_ID];
        const result = await handler({ ids });
        expect(raindropService.reorderCollections).toHaveBeenCalledWith(ids);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Reordered collections.`
            }]
        });
    });


    it('should set up getBookmarks handler', async () => {
      const mockBookmarks = {
        items: [
          {
            _id: BOOKMARK_ID_1,
            title: 'Test Bookmark',
            link: 'https://example.com',
            excerpt: 'Test excerpt',
            tags: [TAG_TEST, TAG_EXAMPLE],
            collection: { $id: KNOWN_COLLECTION_ID },
            created: '2025-03-26T00:00:00Z',
            lastUpdate: '2025-03-26T00:00:00Z',
            type: 'link'
          }
        ]
      };
      (raindropService.getBookmarks as ReturnType<typeof vi.fn>).mockResolvedValue(mockBookmarks);

      const handler = toolHandlers.get('getBookmarks');
      if (!handler) {
        throw new Error('Handler getBookmarks not registered');
      }

      const args = { collectionId: KNOWN_COLLECTION_ID, page: 0, perPage: 20, sort: '-created', search: TAG_TEST };
      const result = await handler(args);
      expect(raindropService.getBookmarks).toHaveBeenCalledWith(args.collectionId, args.page, args.perPage, args.sort, args.search);
      expect(result).toEqual({
        content: mockBookmarks.items.map(bookmark => ({
          type: "resource",
          resource: {
            text: bookmark.title || "Untitled Bookmark",
            uri: bookmark.link,
            metadata: {
              id: bookmark._id,
              excerpt: bookmark.excerpt,
              tags: bookmark.tags,
              collectionId: bookmark.collection.$id,
              created: bookmark.created,
              lastUpdate: bookmark.lastUpdate,
              type: bookmark.type
            }
          }
        }))
      });
    });

    it('should set up createBookmark handler', async () => {
        const newBookmarkTitle = 'New Test Bookmark';
        const newBookmarkLink = 'https://newexample.com';
        const newBookmarkExcerpt = 'New excerpt';
        const newBookmarkTags = [TAG_NEW, TAG_TEST];
        const mockNewBookmark = {
            item: {
                _id: BOOKMARK_ID_2,
                title: newBookmarkTitle,
                link: newBookmarkLink,
                excerpt: newBookmarkExcerpt,
                tags: newBookmarkTags,
                collection: { $id: KNOWN_COLLECTION_ID },
                created: '2025-03-26T01:00:00Z',
                lastUpdate: '2025-03-26T01:00:00Z',
                type: 'link'
            }
        };
        (raindropService.createBookmark as ReturnType<typeof vi.fn>).mockResolvedValue(mockNewBookmark);

        const handler = toolHandlers.get('createBookmark');
        if (!handler) {
          throw new Error('Handler createBookmark not registered');
        }

        const bookmarkData = {
            link: newBookmarkLink,
            title: newBookmarkTitle,
            excerpt: newBookmarkExcerpt,
            tags: newBookmarkTags,
            collectionId: KNOWN_COLLECTION_ID
        };
        const result = await handler(bookmarkData);
        expect(raindropService.createBookmark).toHaveBeenCalledWith(bookmarkData);
        expect(result).toEqual({
            content: [{
                type: "resource",
                resource: {
                    text: mockNewBookmark.item.title || "Untitled Bookmark",
                    uri: mockNewBookmark.item.link,
                    metadata: {
                        id: mockNewBookmark.item._id,
                        excerpt: mockNewBookmark.item.excerpt,
                        tags: mockNewBookmark.item.tags,
                        collectionId: mockNewBookmark.item.collection.$id,
                        created: mockNewBookmark.item.created,
                        lastUpdate: mockNewBookmark.item.lastUpdate,
                        type: mockNewBookmark.item.type
                    }
                }
            }]
        });
    });

    it('should set up updateBookmark handler', async () => {
        const updatedBookmarkTitle = 'Updated Test Bookmark';
        const updatedBookmarkExcerpt = 'Updated excerpt';
        const updatedBookmarkTags = [TAG_TEST, TAG_UPDATED];
        const mockUpdatedBookmark = {
            item: {
                _id: BOOKMARK_ID_1,
                title: updatedBookmarkTitle,
                link: 'https://example.com',
                excerpt: updatedBookmarkExcerpt,
                tags: updatedBookmarkTags,
                collection: { $id: KNOWN_COLLECTION_ID },
                created: '2025-03-26T00:00:00Z',
                lastUpdate: '2025-03-26T02:00:00Z',
                type: 'link'
            }
        };
        (raindropService.updateBookmark as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdatedBookmark);

        const handler = toolHandlers.get('updateBookmark');
        if (!handler) {
          throw new Error('Handler updateBookmark not registered');
        }

        const updates = { title: updatedBookmarkTitle, excerpt: updatedBookmarkExcerpt, tags: updatedBookmarkTags };
        const result = await handler({ id: BOOKMARK_ID_1, ...updates });
        expect(raindropService.updateBookmark).toHaveBeenCalledWith(BOOKMARK_ID_1, updates);
        expect(result).toEqual({
            content: [{
                type: "resource",
                resource: {
                    text: mockUpdatedBookmark.item.title || "Untitled Bookmark",
                    uri: mockUpdatedBookmark.item.link,
                    metadata: {
                        id: mockUpdatedBookmark.item._id,
                        excerpt: mockUpdatedBookmark.item.excerpt,
                        tags: mockUpdatedBookmark.item.tags,
                        collectionId: mockUpdatedBookmark.item.collection.$id,
                        created: mockUpdatedBookmark.item.created,
                        lastUpdate: mockUpdatedBookmark.item.lastUpdate,
                        type: mockUpdatedBookmark.item.type
                    }
                }
            }]
        });
    });

    it('should set up deleteBookmark handler', async () => {
        (raindropService.deleteBookmark as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const handler = toolHandlers.get('deleteBookmark');
        if (!handler) {
          throw new Error('Handler deleteBookmark not registered');
        }

        const result = await handler({ id: BOOKMARK_ID_1 });
        expect(raindropService.deleteBookmark).toHaveBeenCalledWith(BOOKMARK_ID_1);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Deleted bookmark with ID: ${BOOKMARK_ID_1}`
            }]
        });
    });


    it('should set up getTags handler', async () => {
      const mockTags = [
        { _id: TAG_JS, count: 42 },
        { _id: TAG_TS, count: 35 },
        { _id: TAG_API, count: 28 }
      ];
      (raindropService.getTags as ReturnType<typeof vi.fn>).mockResolvedValue(mockTags);

      const handler = toolHandlers.get('getTags');
      if (!handler) {
        throw new Error('Handler getTags not registered');
      }

      const result = await handler({ collectionId: KNOWN_COLLECTION_ID });
      expect(raindropService.getTags).toHaveBeenCalledWith(KNOWN_COLLECTION_ID);
      expect(result).toEqual({
        content: mockTags.map(tag => ({
          type: "text",
          text: tag._id,
          metadata: {
            count: tag.count
          }
        }))
      });
    });

    it('should set up renameTag handler', async () => {
        (raindropService.renameTag as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const handler = toolHandlers.get('renameTag');
        if (!handler) {
          throw new Error('Handler renameTag not registered');
        }

        const args = { oldName: TAG_JS, newName: TAG_JS_RENAMED };
        const result = await handler(args);
        expect(raindropService.renameTag).toHaveBeenCalledWith(args.oldName, args.newName);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Renamed tag "${args.oldName}" to "${args.newName}".`
            }]
        });
    });

    it('should set up mergeTags handler', async () => {
        (raindropService.mergeTags as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const handler = toolHandlers.get('mergeTags');
        if (!handler) {
          throw new Error('Handler mergeTags not registered');
        }

        const args = { sourceTags: [TAG_JS_RENAMED, TAG_ECMASCRIPT], destinationTag: TAG_JS };
        const result = await handler(args);
        expect(raindropService.mergeTags).toHaveBeenCalledWith(args.sourceTags, args.destinationTag);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Merged tags [${args.sourceTags.join(', ')}] into "${args.destinationTag}".`
            }]
        });
    });

    it('should set up deleteTags handler', async () => {
        (raindropService.deleteTags as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const handler = toolHandlers.get('deleteTags');
        if (!handler) {
          throw new Error('Handler deleteTags not registered');
        }

        const args = { tags: [TAG_OBSOLETE, TAG_TEMP] };
        const result = await handler(args);
        expect(raindropService.deleteTags).toHaveBeenCalledWith(args.tags);
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `Deleted tags: [${args.tags.join(', ')}].`
            }]
        });
    });

    it('should set up getUserInfo handler', async () => {
        const mockUserInfo = {
            user: {
                _id: USER_ID,
                fullName: 'Test User',
                email: 'test@example.com',
            },
            result: true
        };
        (raindropService.getUserInfo as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserInfo);

        const handler = toolHandlers.get('getUserInfo');
        if (!handler) {
          throw new Error('Handler getUserInfo not registered');
        }

        const result = await handler();
        expect(raindropService.getUserInfo).toHaveBeenCalled();
        expect(result).toEqual({
            content: [{
                type: "text",
                text: `User: ${mockUserInfo.user.fullName} (${mockUserInfo.user.email})`,
                metadata: {
                    id: mockUserInfo.user._id,
                    fullName: mockUserInfo.user.fullName,
                    email: mockUserInfo.user.email
                }
            }]
        });
    });

    it('should set up getAllHighlights handler', async () => {
        const mockHighlights = {
            items: [
                {
                    _id: HIGHLIGHT_ID_1,
                    text: 'This is a highlight',
                    note: 'A note about the highlight',
                    color: 'yellow',
                    created: '2025-03-26T00:00:00Z',
                    raindropRef: BOOKMARK_ID_1 // Bookmark ID
                }
            ],
            result: true
        };
        (raindropService.getAllHighlights as ReturnType<typeof vi.fn>).mockResolvedValue(mockHighlights);

        const handler = toolHandlers.get('getAllHighlights');
        if (!handler) {
          throw new Error('Handler getAllHighlights not registered');
        }

        const result = await handler();
        expect(raindropService.getAllHighlights).toHaveBeenCalled();
        expect(result).toEqual({
            content: mockHighlights.items.map(hl => ({
                type: "text",
                text: hl.text,
                metadata: {
                    id: hl._id,
                    note: hl.note,
                    color: hl.color,
                    created: hl.created,
                    bookmarkId: hl.raindropRef
                }
            }))
        });
    });


    it('should handle collection not found error', async () => {
      const nonExistentId = 999999;
      (raindropService.getCollection as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Collection not found'));

      const handler = toolHandlers.get('getCollection');
      if (!handler) {
        throw new Error('Handler getCollection not registered');
      }

      await expect(handler({ id: nonExistentId })).rejects.toThrow('Collection not found');
      expect(raindropService.getCollection).toHaveBeenCalledWith(nonExistentId);
    });

    it('should handle bookmark creation error', async () => {
        const error = new Error('Failed to create bookmark');
        (raindropService.createBookmark as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        const handler = toolHandlers.get('createBookmark');
        if (!handler) {
          throw new Error('Handler createBookmark not registered');
        }

        const bookmarkData = { link: 'https://badlink.com' };
        await expect(handler(bookmarkData)).rejects.toThrow('Failed to create bookmark');
        expect(raindropService.createBookmark).toHaveBeenCalledWith(bookmarkData);
    });

  });

  describe('start', () => {
    it('should connect the server with stdio transport', async () => {
      await service.start();
      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
    });
  });
});
