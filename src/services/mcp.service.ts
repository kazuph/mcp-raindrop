import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import raindropService from './raindrop.service';
import config from "../config/config";
import type { Collection, Bookmark, SearchParams } from "../types/raindrop.js";

export class RaindropMCPService {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'raindrop-mcp',
      version: '1.0.0',
      description: 'MCP Server for Raindrop.io bookmarking service',
      capabilities: {
        logging: true
      }
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tool for listing collections
    this.server.tool(
      "getCollections",
      "Retrieve all collections (folders) from Raindrop.io. Collections are containers for bookmarks and can be nested. Returns collection titles, IDs, and bookmark counts.",
      async () => {
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
            }
          }))
        };
      }
    );

    // Tool for creating a collection
    this.server.tool(
      "createCollection",
      "Create a new collection (folder) in your Raindrop.io account. Collections are used to organize bookmarks by topic, project, or any custom categorization.",
      {
        title: z.string().describe("Title of the new collection/folder to create in Raindrop.io"),
        isPublic: z.boolean().optional().describe("Whether the collection is public (true) or private (false). Default is private.")
      },
      async ({ title, isPublic }) => {
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
    );

    // Tool for retrieving bookmarks
    this.server.tool(
      "getBookmarks",
      "Retrieve bookmarks from Raindrop.io with powerful filtering options. Search across all bookmarks or within specific collections, filter by tags, and perform full-text searches of bookmark content.",
      {
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
      async (params) => {
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
    );

    // Tool for retrieving tags
    this.server.tool(
      "getTags",
      "Retrieve all tags used within a specific collection or across all collections. Returns tag names and their usage counts.",
      {
        collectionId: z.number().optional().describe("ID of the collection to filter tags by. Use 0 for unsorted bookmarks' tags. Omit to get tags across all collections.")
      },
      async ({ collectionId }) => {
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
    );

    // Tool for renaming a tag
    this.server.tool(
      "renameTag",
      "Rename a tag across all bookmarks in a specific collection or globally. The old tag will be replaced with the new tag name.",
      {
        collectionId: z.number().optional().describe("ID of the collection to restrict renaming. Omit to rename tags across all collections."),
        oldName: z.string().describe("Current name of the tag to be renamed"),
        newName: z.string().describe("New name for the tag. Must be a unique tag name.")
      },
      async ({ collectionId, oldName, newName }) => {
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
    this.server.tool(
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
    this.server.tool(
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

    // Tool for retrieving all tags across all collections
    this.server.tool(
      "getAllTags",
      "Retrieve all tags across all collections in your Raindrop.io account. Returns tag names and usage counts for organizing and filtering bookmarks.",
      async () => {
        const tags = await raindropService.getTags();
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
    );

    // Tool for retrieving all highlights across all raindrops
    this.server.tool(
      "getAllHighlights",
      "Retrieve all text highlights you've created across all your bookmarks in Raindrop.io. Returns highlighted text, color, notes, and timestamps.",
      async () => {
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
    );

    // Tool for retrieving highlights
    this.server.tool(
      "getHighlights",
      "Retrieve all text highlights for a specific bookmark. Returns highlighted text, color coding, notes, and timestamps.",
      {
        raindropId: z.number().describe("ID of the specific bookmark to retrieve text highlights from")
      },
      async ({ raindropId }) => {
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
    );

    // Tool for reordering collections
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
  }

  public async start() {
    const transport = new StdioServerTransport(process.stdin, process.stdout);
    await this.server.connect(transport);
    
    // this.server.server.sendLoggingMessage({
    //   level: "info",
    //   data: "Starting Raindrop MCP server"
    // });
    // this.server.server.sendLoggingMessage({
    //   level: "info",
    //   data: "Setting up MCP handlers for Raindrop.io integration"
    // });
    // this.server.server.sendLoggingMessage({
    //   level: "info",
    //   data: "Raindrop MCP server started successfully"
    // });
  }

  public async stop() {
    // this.server.server.sendLoggingMessage({
    //   level: "info",
    //   data: "Stopping Raindrop MCP server"
    // });
  }
}

export default new RaindropMCPService();