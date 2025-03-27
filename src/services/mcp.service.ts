import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import raindropService from './raindrop.service.js';
import config from "../config/config.js";
import type { Collection, Bookmark, SearchParams } from "../types/raindrop.js";

export const createRaindropServer = () => {
  // Initialize intervals and subscriptions containers
  let updateIntervals: NodeJS.Timeout[] = [];
  let subscriptions: Set<string> = new Set();
  
  // Create the server instance
  const server = new McpServer({
    name: 'raindrop-mcp',
    version: '1.0.0',
    description: 'MCP Server for Raindrop.io bookmarking service',
    capabilities: {
      logging: true,
      streaming: true // Enable streaming capability
    }
  });

  // Setup all handlers
  setupHandlers(server);
  
  // Cleanup function to be returned from factory
  const cleanup = async () => {
    // Clear all intervals
    updateIntervals.forEach(interval => clearInterval(interval));
    
    // Clear any subscriptions or other resources
    subscriptions.clear();
    
    
  };

  // Return both server and cleanup function
  return { server, cleanup };
};

// Setup all handlers for MCP server
function setupHandlers(server: McpServer) {
  // Register collection resources
  setupCollectionResources(server);
  
  // Register bookmark resources
  setupBookmarkResources(server);
  
  // Register tag resources
  setupTagResources(server);
  
  // Register highlight resources
  setupHighlightResources(server);
  
  // Register operational tools
  setupOperationalTools(server);
}

function setupCollectionResources(server: McpServer) {
  // Resource for accessing collections
  server.resource(
    {
      name: "collections",
      description: "Access and manage Raindrop.io collections (folders). Collections are containers for bookmarks and can be nested.",
      operations: {
        // List collections
        list: {
          description: "Retrieve all collections (folders) from Raindrop.io. Returns collection titles, IDs, and bookmark counts.",
          handler: async () => {
            const collections: Collection[] = await raindropService.getCollections();
            return {
              content: collections.map((collection: Collection) => ({
                type: "text",
                text: collection.title || "Unnamed Collection",
                metadata: {
                  id: collection._id,
                  count: collection.count,
                  public: collection.public,
                  created: collection.created,
                  ...(collection.lastUpdate && { lastUpdate: collection.lastUpdate })
                },
                // Add annotations for better client rendering
                annotations: {
                  priority: 0.7, // Medium priority
                  audience: ["user", "assistant"]
                }
              }))
            };
          }
        },
        
        // Get a single collection
        get: {
          description: "Retrieve a single collection by its ID. Returns collection details including title, ID, bookmark count, and metadata.",
          parameters: {
            id: z.number().describe("ID of the collection to retrieve")
          },
          handler: async ({ id }: { id: number }) => {
            try {
              const collection: Collection = await raindropService.getCollection(id);
              return {
                content: [{
                  type: "text",
                  text: collection.title || "Unnamed Collection",
                  metadata: {
                    id: collection._id,
                    count: collection.count,
                    public: collection.public,
                    created: collection.created,
                    ...(collection.lastUpdate && { lastUpdate: collection.lastUpdate })
                  }
                }]
              };
            } catch (error) {
              // Enhanced error handling
             server.server.sendLoggingMessage({
                level: "error",
                data: `Error retrieving collection: ${error}`
              });
              throw error;
            }
          }
        },
        
        // Create a collection
        create: {
          description: "Create a new collection (folder) in your Raindrop.io account.",
          parameters: {
            title: z.string().describe("Title of the new collection/folder to create in Raindrop.io"),
            isPublic: z.boolean().optional().describe("Whether the collection is public (true) or private (false). Default is private.")
          },
          handler: async ({ title, isPublic }: { title: string, isPublic?: boolean }) => {
            const collection: Collection = await raindropService.createCollection(title, isPublic);
            return {
              content: [{
                type: "text",
                text: collection.title || "Unnamed Collection",
                metadata: {
                  id: collection._id,
                  public: collection.public,
                  created: collection.created,
                  ...(collection.lastUpdate && { lastUpdate: collection.lastUpdate })
                }
              }]
            };
          }
        },
        
        // Update a collection
        update: {
          description: "Update an existing collection in your Raindrop.io account.",
          parameters: {
            id: z.number().describe("ID of the collection to update"),
            title: z.string().optional().describe("New title for the collection"),
            public: z.boolean().optional().describe("Whether the collection should be public"),
            view: z.enum(['list', 'simple', 'grid', 'masonry', 'magazine']).optional().describe("View mode for the collection"),
            cover: z.string().optional().describe("Cover image URL for the collection")
          },
          handler: async (params: { 
            id: number; 
            title?: string; 
            public?: boolean;
            view?: 'list' | 'simple' | 'grid' | 'masonry' | 'magazine';
            cover?: string;
          }) => {
            const { id, ...updates } = params;
            const collection = await raindropService.updateCollection(id, updates);
            
            return {
              content: [{
                type: "text",
                text: `Updated collection: ${collection.title}`,
                metadata: {
                  id: collection._id,
                  title: collection.title,
                  count: collection.count,
                  public: collection.public,
                  created: collection.created,
                  lastUpdate: collection.lastUpdate
                }
              }]
            };
          }
        },
        
        // Delete a collection
        remove: {
          description: "Delete a collection from your Raindrop.io account. Bookmarks within this collection will be moved to Trash.",
          parameters: {
            id: z.number().describe("ID of the collection to delete")
          },
          handler: async ({ id }: { id: number }) => {
            await raindropService.deleteCollection(id);
            
            return {
              content: [{
                type: "text",
                text: `Deleted collection ID: ${id}`
              }]
            };
          }
        }
      }
    }
  );
}

function setupBookmarkResources(server: McpServer) {
  // Resource for accessing bookmarks
  server.resource({
    name: "bookmarks",
    description: "Access and manage bookmarks in Raindrop.io.",
    operations: {
      // List bookmarks with filtering options
      list: {
        description: "Retrieve bookmarks from Raindrop.io with powerful filtering options.",
        parameters: {
          collectionId: z.number().optional().describe("ID of the specific collection to retrieve bookmarks from. Use 0 for unsorted bookmarks. Omit to search across all collections."),
          search: z.string().optional().describe("Full-text search query for filtering bookmarks by title, description, or content. Supports advanced search operators like '-' for exclusion."),
          tags: z.array(z.string()).optional().describe("Array of tags to filter bookmarks. Only bookmarks with ALL specified tags will be returned."),
          page: z.number().optional().describe("Page number for pagination. Starts from 0."),
          perPage: z.number().optional().describe("Number of bookmarks per page. Default is 50, max is 100."),
          sort: z.enum(['title', '-title', 'domain', '-domain', 'created', '-created', 'lastUpdate', '-lastUpdate']).optional()
            .describe("Sort order for results: prefix with '-' for descending order"),
          important: z.boolean().optional().describe("Filter by important/favorited status"),
          media: z.enum(['image', 'video', 'document', 'audio']).optional().describe("Filter by media type"),
          annotated: z.boolean().optional().describe("Filter bookmarks with text highlights"),
          type: z.enum(['link', 'article', 'image', 'video', 'document', 'audio']).optional().describe("Filter by bookmark type"),
          createdStart: z.string().optional().describe("Filter by creation date, start (ISO format)"),
          createdEnd: z.string().optional().describe("Filter by creation date, end (ISO format)"),
          domain: z.string().optional().describe("Filter by specific domain name"),
          broken: z.boolean().optional().describe("Filter for broken links only"),
          duplicates: z.boolean().optional().describe("Filter for duplicated links only"),
          notag: z.boolean().optional().describe("Filter for bookmarks without tags")
        },
        handler: async (params: {
          collectionId?: number;
          search?: string;
          tags?: string[];
          page?: number;
          perPage?: number;
          sort?: 'title' | '-title' | 'domain' | '-domain' | 'created' | '-created' | 'lastUpdate' | '-lastUpdate';
          important?: boolean;
          media?: 'image' | 'video' | 'document' | 'audio';
          annotated?: boolean;
          type?: 'link' | 'article' | 'image' | 'video' | 'document' | 'audio';
          createdStart?: string;
          createdEnd?: string;
          domain?: string;
          broken?: boolean;
          duplicates?: boolean;
          notag?: boolean;
        }) => {
          const filters: Record<string, any> = {};
          if (params.collectionId) filters.collection = params.collectionId;
          if (params.search) filters.search = params.search;
          if (params.tags) filters.tag = params.tags;
          if (params.page !== undefined) filters.page = params.page;
          if (params.perPage !== undefined) filters.perPage = params.perPage;
          if (params.sort) filters.sort = params.sort;
          if (params.important !== undefined) filters.important = params.important;
          if (params.media) filters.media = params.media;
          if (params.annotated !== undefined) filters.annotated = params.annotated;
          if (params.type) filters.type = params.type;
          if (params.createdStart) filters.createdStart = params.createdStart;
          if (params.createdEnd) filters.createdEnd = params.createdEnd;
          if (params.domain) filters.domain = params.domain;
          if (params.broken !== undefined) filters.broken = params.broken;
          if (params.duplicates !== undefined) filters.duplicates = params.duplicates;
          if (params.notag !== undefined) filters.notag = params.notag;

          const bookmarks = await raindropService.getBookmarks(filters);
          return {
            content: bookmarks.items.map(bookmark => ({
              type: "resource",
              resource: {
                text: bookmark.title || "Untitled Bookmark",
                uri: bookmark.link,
                metadata: {
                  id: bookmark._id,
                  excerpt: bookmark.excerpt,
                  tags: bookmark.tags,
                  collectionId: bookmark.collection?.$id,
                  created: bookmark.created,
                  lastUpdate: bookmark.lastUpdate,
                  type: bookmark.type
                }
              }
            }))
          };
        }
      },
      
      // Create a bookmark
      create: {
        description: "Create a new bookmark in your Raindrop.io account.",
        parameters: {
          collectionId: z.number().describe("ID of the collection to add the bookmark to. Use 0 for unsorted."),
          link: z.string().describe("The URL of the webpage to bookmark"),
          title: z.string().optional().describe("Custom title for the bookmark. If omitted, will be extracted from the webpage"),
          excerpt: z.string().optional().describe("Custom description/excerpt for the bookmark"),
          tags: z.array(z.string()).optional().describe("Tags to apply to the bookmark"),
          important: z.boolean().optional().describe("Whether to mark the bookmark as important/favorite")
        },
        handler: async (params: {
          collectionId: number;
          link: string;
          title?: string;
          excerpt?: string;
          tags?: string[];
          important?: boolean;
        }) => {
          const bookmark = await raindropService.createBookmark(params.collectionId, {
            link: params.link,
            title: params.title,
            excerpt: params.excerpt,
            tags: params.tags,
            important: params.important
          });
          
          return {
            content: [{
              type: "resource",
              resource: {
                text: bookmark.title || "Untitled Bookmark",
                uri: bookmark.link,
                metadata: {
                  id: bookmark._id,
                  excerpt: bookmark.excerpt,
                  tags: bookmark.tags,
                  collectionId: params.collectionId,
                  created: bookmark.created,
                  lastUpdate: bookmark.lastUpdate,
                  type: bookmark.type
                }
              }
            }]
          };
        }
      },
      
      // Update a bookmark
      update: {
        description: "Update an existing bookmark in your Raindrop.io account.",
        parameters: {
          id: z.number().describe("ID of the bookmark to update"),
          collectionId: z.number().optional().describe("Move bookmark to this collection ID"),
          link: z.string().optional().describe("New URL for the bookmark"),
          title: z.string().optional().describe("New title for the bookmark"),
          excerpt: z.string().optional().describe("New description/excerpt for the bookmark"),
          tags: z.array(z.string()).optional().describe("New tags for the bookmark (replaces existing tags)"),
          important: z.boolean().optional().describe("Whether to mark the bookmark as important/favorite")
        },
        handler: async (params: {
          id: number;
          collectionId?: number;
          link?: string;
          title?: string;
          excerpt?: string;
          tags?: string[];
          important?: boolean;
        }) => {
          const updates: Record<string, any> = {};
          
          if (params.collectionId !== undefined) {
            updates.collection = { $id: params.collectionId };
          }
          if (params.link !== undefined) updates.link = params.link;
          if (params.title !== undefined) updates.title = params.title;
          if (params.excerpt !== undefined) updates.excerpt = params.excerpt;
          if (params.tags !== undefined) updates.tags = params.tags;
          if (params.important !== undefined) updates.important = params.important;
          
          const bookmark = await raindropService.updateBookmark(params.id, updates);
          
          return {
            content: [{
              type: "resource",
              resource: {
                text: bookmark.title || "Untitled Bookmark",
                uri: bookmark.link,
                metadata: {
                  id: bookmark._id,
                  excerpt: bookmark.excerpt,
                  tags: bookmark.tags,
                  collectionId: bookmark.collection?.$id,
                  created: bookmark.created,
                  lastUpdate: bookmark.lastUpdate,
                  type: bookmark.type
                }
              }
            }]
          };
        }
      },
      
      // Delete a bookmark
      remove: {
        description: "Delete a bookmark or move it to trash.",
        parameters: {
          id: z.number().describe("ID of the bookmark to delete"),
          permanent: z.boolean().optional().describe("If true, permanently deletes the bookmark. If false or omitted, moves it to trash.")
        },
        handler: async (params: { id: number; permanent?: boolean }) => {
          await raindropService.deleteBookmark(params.id, params.permanent);
          
          return {
            content: [{
              type: "text",
              text: params.permanent 
                ? `Bookmark ${params.id} was permanently deleted` 
                : `Bookmark ${params.id} was moved to trash`
            }]
          };
        }
      }
    }
  });
}

function setupTagResources(server: McpServer) {
  // Resource for accessing tags
  server.resource({
    name: "tags",
    description: "Access and manage tags in Raindrop.io.",
    operations: {
      // List all tags
      list: {
        description: "Retrieve all tags used within a specific collection or across all collections.",
        parameters: {
          collectionId: z.number().optional().describe("ID of the collection to filter tags by. Use 0 for unsorted bookmarks' tags. Omit to get tags across all collections.")
        },
        handler: async ({ collectionId }: { collectionId?: number }) => {
          const tags = await raindropService.getTags(collectionId);
          return {
            content: tags.map(tag => ({
              type: "text",
              text: tag._id,
              metadata: {
                count: tag.count
              }
            }))
          };
        }
      }
    }
  });
}

function setupHighlightResources(server: McpServer) {
  // Resource for accessing highlights
  server.resource({
    name: "highlights",
    description: "Access and manage text highlights in Raindrop.io.",
    operations: {
      // List all highlights
      list: {
        description: "Retrieve all text highlights you've created across all your bookmarks in Raindrop.io.",
        handler: async () => {
          const highlights = await raindropService.getAllHighlights();
          return {
            content: highlights.map(highlight => ({
              type: "text",
              text: highlight.text,
              metadata: {
                color: highlight.color,
                note: highlight.note,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate
              }
            }))
          };
        }
      },
      
      // Get highlights for a bookmark
      get: {
        description: "Retrieve all text highlights for a specific bookmark.",
        parameters: {
          raindropId: z.number().describe("ID of the specific bookmark to retrieve text highlights from")
        },
        handler: async ({ raindropId }: { raindropId: number }) => {
          const highlights = await raindropService.getHighlights(raindropId);
          return {
            content: highlights.map(highlight => ({
              type: "text",
              text: highlight.text,
              metadata: {
                color: highlight.color,
                note: highlight.note,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate
              }
            }))
          };
        }
      },
      
      // Get highlights for a collection
      getByCollection: {
        description: "Retrieve all text highlights from bookmarks in a specific collection.",
        parameters: {
          collectionId: z.number().describe("ID of the collection to retrieve highlights from")
        },
        handler: async ({ collectionId }: { collectionId: number }) => {
          const highlights = await raindropService.getHighlightsByCollection(collectionId);
          return {
            content: highlights.map(highlight => ({
              type: "text",
              text: highlight.text,
              metadata: {
                color: highlight.color,
                note: highlight.note,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate
              }
            }))
          };
        }
      }
    }
  });
}

function setupOperationalTools(server: McpServer) {
  // Tool for renaming a tag (remains as a tool since it's an operation)
  server.tool(
    "renameTag",
    "Rename a tag across all bookmarks in a specific collection or globally. The old tag will be replaced with the new tag name.",
    {
      collectionId: z.number().optional().describe("ID of the collection to restrict renaming. Omit to rename tags across all collections."),
      oldName: z.string().describe("Current name of the tag to be renamed"),
      newName: z.string().describe("New name for the tag. Must be a unique tag name.")
    },
    async ({ collectionId, oldName, newName }: { collectionId?: number; oldName: string; newName: string }) => {
      await raindropService.renameTag(collectionId, oldName, newName);
      return {
        content: [{
          type: "text",
          text: `Tag renamed from '${oldName}' to '${newName}'`
        }]
      };
    }
  );

  // Tool for merging tags
  server.tool(
    "mergeTags",
    "Merge multiple source tags into a single target tag. All bookmarks with any of the source tags will be updated to use the target tag instead.",
    {
      collectionId: z.number().optional().describe("ID of the collection to restrict merging. Omit to merge tags across all collections."),
      tags: z.array(z.string()).describe("List of source tags to merge into the new tag. These tags will be removed."),
      newName: z.string().describe("Target tag name. All bookmarks with source tags will now have this tag.")
    },
    async ({ collectionId, tags, newName }) => {
      await raindropService.mergeTags(collectionId, tags, newName);
      return {
        content: [{
          type: "text",
          text: `Tags [${tags.join(", ")}] merged into '${newName}'`
        }]
      };
    }
  );

  // Tool for deleting tags
  server.tool(
    "deleteTags",
    "Remove specified tags from all bookmarks in a collection or globally. This permanently removes the tags without deleting the bookmarks.",
    {
      collectionId: z.number().optional().describe("ID of the collection to restrict deletion. Omit to delete tags across all collections."),
      tags: z.array(z.string()).describe("List of tags to completely remove from bookmarks")
    },
    async ({ collectionId, tags }) => {
      await raindropService.deleteTags(collectionId, tags);
      return {
        content: [{
          type: "text",
          text: `Tags [${tags.join(", ")}] deleted`
        }]
      };
    }
  );

  // Tool for reordering collections
  server.tool(
    "reorderCollections",
    "Change how collections are sorted in the Raindrop.io interface. Sort by name alphabetically or by the number of bookmarks they contain.",
    {
      sort: z.enum(["title", "-title", "-count"]).describe("Sort order: 'title' for alphabetical, '-title' for reverse alphabetical, or '-count' to sort by number of bookmarks (highest first)")
    },
    async ({ sort }) => {
      await raindropService.reorderCollections(sort);
      return {
        content: [{
          type: "text",
          text: `Collections reordered by '${sort}'`
        }]
      };
    }
  );

  // Tool for expanding/collapsing all collections
  server.tool(
    "toggleCollectionsExpansion",
    "Expand or collapse all collections in the Raindrop.io interface. Useful for getting an overview or focusing on specific collections.",
    {
      expand: z.boolean().describe("True to expand all collections in the UI, false to collapse them all. Affects the user's display preferences.")
    },
    async ({ expand }) => {
      await raindropService.toggleCollectionsExpansion(expand);
      return {
        content: [{
          type: "text",
          text: `Collections ${expand ? "expanded" : "collapsed"}`
        }]
      };
    }
  );

  // Tool for merging collections
  server.tool(
    "mergeCollections",
    "Combine multiple collections into a single target collection. All bookmarks from source collections will be moved to the target collection.",
    {
      targetCollectionId: z.number().describe("ID of the destination collection that will receive all bookmarks"),
      collectionIds: z.array(z.number()).describe("List of source collection IDs to merge. These collections will be deleted after merging.")
    },
    async ({ targetCollectionId, collectionIds }) => {
      await raindropService.mergeCollections(targetCollectionId, collectionIds);
      return {
        content: [{
          type: "text",
          text: `Collections [${collectionIds.join(", ")}] merged into collection ID ${targetCollectionId}`
        }]
      };
    }
  );

  // Tool for removing empty collections
  server.tool(
    "removeEmptyCollections",
    "Remove all collections that contain zero bookmarks. Helps clean up and organize your Raindrop.io account.",
    async () => {
      const result = await raindropService.removeEmptyCollections();
      return {
        content: [{
          type: "text",
          text: `${result.count} empty collections removed`
        }]
      };
    }
  );

  // Tool for emptying the trash
  server.tool(
    "emptyTrash",
    "Permanently delete all bookmarks currently in the trash. This action cannot be undone.",
    async () => {
      await raindropService.emptyTrash();
      return {
        content: [{
          type: "text",
          text: "Trash emptied successfully"
        }]
      };
    }
  );

  // Tool for uploading a file and creating a bookmark
  server.tool(
    "uploadFile",
    "Upload a file to Raindrop.io and create a bookmark for it in a specified collection. Supports files up to 10MB.",
    {
      collectionId: z.string().describe("ID of the collection where the file bookmark should be saved"),
      file: z.any().describe("File to upload and bookmark in Raindrop.io. Maximum size: 10MB.")
    },
    async ({ collectionId, file }) => {
      const uploadedBookmark = await raindropService.uploadFile(collectionId, file);
      return {
        content: [{
          type: "resource",
          resource: {
            text: uploadedBookmark.title || "Untitled File",
            uri: uploadedBookmark.link,
            metadata: {
              id: uploadedBookmark._id,
              collectionId: uploadedBookmark.collection?.$id,
              created: uploadedBookmark.created,
              type: uploadedBookmark.type
            }
          }
        }]
      };
    }
  );

  // Tool for setting a reminder on a bookmark
  server.tool(
    "setReminder",
    "Add a reminder to a bookmark that will notify you at a specified date and time. Optionally include a note with the reminder.",
    {
      raindropId: z.number().describe("ID of the bookmark to set a reminder for"),
      reminder: z.object({
        date: z.string().describe("Reminder date and time in ISO format (e.g. '2023-12-31T23:59:59Z')"),
        note: z.string().optional().describe("Optional note to attach to the reminder")
      }).describe("Reminder details including when to remind and optional note")
    },
    async ({ raindropId, reminder }) => {
      const updatedBookmark = await raindropService.setReminder(raindropId, reminder);
      return {
        content: [{
          type: "text",
          text: `Reminder set for "${updatedBookmark.title}" on ${reminder.date}${reminder.note ? ` with note: ${reminder.note}` : ''}`
        }]
      };
    }
  );

  // Tool for importing bookmarks
  server.tool(
    "importBookmarks",
    "Import bookmarks from external sources into Raindrop.io. Supports importing from browser exports, Pocket, Instapaper, HTML files, and more.",
    {
      collectionId: z.number().optional().describe("Target collection ID where the imported bookmarks will be saved. Omit to import to the default collection."),
      format: z.enum(['html', 'csv', 'pocket', 'instapaper', 'netscape', 'readwise']).describe("Format of the import file"),
      file: z.any().describe("The file containing bookmarks to import"),
      mode: z.enum(['add', 'replace']).optional().describe("Import mode: 'add' (keep existing bookmarks) or 'replace' (delete all existing before import). Default is 'add'.")
    },
    async ({ collectionId, format, file, mode }) => {
      const importResult = await raindropService.importBookmarks({ 
        collection: collectionId, 
        format, 
        file,
        mode: mode || 'add'
      });
      
      return {
        content: [{
          type: "text",
          text: `Import completed: ${importResult.imported} bookmarks imported, ${importResult.duplicates} duplicates found`
        }]
      };
    }
  );

  // Tool for checking import status
  server.tool(
    "getImportStatus",
    "Check the status of a recently initiated bookmark import process. Returns progress, counts, and any errors.",
    async () => {
      const importStatus = await raindropService.getImportStatus();
      let statusText = `Import status: ${importStatus.status}`;
      if (importStatus.status === 'in-progress') {
        statusText += `, Progress: ${importStatus.progress}%`;
      }
      if (importStatus.imported) {
        statusText += `, Imported: ${importStatus.imported} bookmarks`;
      }
      if (importStatus.duplicates) {
        statusText += `, Duplicates: ${importStatus.duplicates}`;
      }
      
      return {
        content: [{
          type: "text",
          text: statusText
        }]
      };
    }
  );

  // Tool for exporting bookmarks
  server.tool(
    "exportBookmarks",
    "Export bookmarks from Raindrop.io in various formats for backup or migration to other services.",
    {
      collectionId: z.number().optional().describe("ID of the collection to export. Omit to export all bookmarks from all collections."),
      format: z.enum(['csv', 'html', 'pdf']).describe("Format to export bookmarks in: CSV, HTML, or PDF"),
      broken: z.boolean().optional().describe("Include broken links in the export"),
      duplicates: z.boolean().optional().describe("Include duplicate bookmarks in the export")
    },
    async ({ collectionId, format, broken, duplicates }) => {
      const exportOptions = {
        collection: collectionId,
        format,
        broken,
        duplicates
      };
      
      const exportResult = await raindropService.exportBookmarks(exportOptions);
      return {
        content: [{
          type: "text",
          text: `Export created successfully in ${format.toUpperCase()} format`,
          metadata: {
            url: exportResult.url
          }
        }]
      };
    }
  );

  // Tool for checking export status
  server.tool(
    "getExportStatus",
    "Check the status of a recently initiated bookmark export process. Returns progress and download URL when complete.",
    async () => {
      const exportStatus = await raindropService.getExportStatus();
      let statusText = `Export status: ${exportStatus.status}`;
      if (exportStatus.status === 'in-progress') {
        statusText += `, Progress: ${exportStatus.progress}%`;
      }
      
      return {
        content: [{
          type: "text",
          text: statusText,
          metadata: exportStatus.status === 'ready' ? {
            url: exportStatus.url
          } : undefined
        }]
      };
    }
  );

  // Add new tool that demonstrates progress notifications
  server.tool(
    "importBookmarksWithProgress",
    "Import bookmarks from external sources into Raindrop.io with detailed progress updates.",
    {
      collectionId: z.number().optional().describe("Target collection ID where the imported bookmarks will be saved. Omit to import to the default collection."),
      format: z.enum(['html', 'csv', 'pocket', 'instapaper', 'netscape', 'readwise']).describe("Format of the import file"),
      file: z.any().describe("The file containing bookmarks to import"),
      mode: z.enum(['add', 'replace']).optional().describe("Import mode: 'add' (keep existing bookmarks) or 'replace' (delete all existing before import). Default is 'add'.")
    },
    async ({ collectionId, format, file, mode }, extra) => {
      const progressToken = (extra as { progressToken?: string }).progressToken;
      let progress = 0;
      
      try {
        // Simulate progress steps
        if (progressToken !== undefined) {
          // Initial progress notification
          await server.server.notification({
            method: "notifications/progress",
            params: {
              progress: 0,
              total: 100,
              progressToken,
            },
          });
        }
        
        // Start the import process
        const importResult = await raindropService.importBookmarks({ 
          collection: collectionId, 
          format, 
          file,
          mode: mode || 'add'
        });
        
        // Final progress notification
        if (progressToken !== undefined) {
          await server.server.notification({
            method: "notifications/progress",
            params: {
              progress: 100,
              total: 100,
              progressToken,
            },
          });
        }
        
        return {
          content: [{
            type: "text",
            text: `Import completed: ${importResult.imported} bookmarks imported, ${importResult.duplicates} duplicates found`,
            annotations: {
              priority: 0.8,
              audience: ["user"]
            }
          }]
        };
      } catch (error) {
        server.server.sendLoggingMessage({
          level: "error",
          data: `Import failed: ${error}`
        });
        throw error;
      }
    }
  );
}

// Create a singleton instance for backward compatibility
const raindropMCPService = {
  server: null as McpServer | null,
  cleanup: null as (() => Promise<void>) | null,
  
  async start() {
    const { server, cleanup } = createRaindropServer();
    this.server = server;
    this.cleanup = cleanup;
    
    const transport = new StdioServerTransport(process.stdin, process.stdout);
    await server.connect(transport);
  },
  
  async stop() {
    if (this.cleanup) {
      await this.cleanup();
    }
    
    if (this.server) {
      await this.server.close();
    }
  }
};

export default raindropMCPService;
