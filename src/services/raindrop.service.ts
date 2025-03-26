import axios, { Axios } from 'axios';
import config from '../config/config';

// Import shared types
import type { Collection as BaseCollection, Bookmark as BaseBookmark, SearchParams } from '../types/raindrop.js';

// Extend the base Collection type with service-specific fields
export interface Collection extends BaseCollection {
  creatorRef?: {
    _id: number;
    name: string;
  };
}

export interface Bookmark extends BaseBookmark {}

class RaindropService {
  private api: Axios;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.raindrop.io/rest/v1',
      headers: {
        Authorization: `Bearer ${config.raindropAccessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Collections
  async getCollections(): Promise<Collection[]> {
    const { data } = await this.api.get('/collections');
    return data.items;
  }

  async getCollection(id: number): Promise<Collection> {
    const { data } = await this.api.get(`/collection/${id}`);
    return data.item;
  }

  async createCollection(title: string, isPublic = false): Promise<Collection> {
    const { data } = await this.api.post('/collection', {
      title,
      public: isPublic,
    });
    return data.item;
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection> {
    const { data } = await this.api.put(`/collection/${id}`, updates);
    return data.item;
  }

  async deleteCollection(id: number): Promise<void> {
    await this.api.delete(`/collection/${id}`);
  }

  // Bookmarks
  async getBookmarks(params: SearchParams = {}): Promise<{ items: Bookmark[]; count: number }> {
    // Convert parameters to the format expected by the Raindrop.io API
    const queryParams: Record<string, any> = { ...params };

    // Handle special cases for search parameter
    if (params.search) {
      // Ensure search parameter is properly encoded
      queryParams.search = encodeURIComponent(params.search);
    }

    // Handle collection parameter
    if (params.collection === undefined && !params.search) {
      // Use the default collection endpoint if no specific collection or search
      const { data } = await this.api.get('/raindrops/0', { params: queryParams });
      return data;
    }
    
    // For specific collection or search
    const endpoint = params.collection !== undefined ? `/raindrops/${params.collection}` : '/raindrops/0';
    const { data } = await this.api.get(endpoint, { params: queryParams });
    return data;
  }

  async getBookmark(id: number): Promise<Bookmark> {
    const { data } = await this.api.get(`/raindrop/${id}`);
    return data.item;
  }

  async createBookmark(collectionId: number, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const { data } = await this.api.post(`/raindrop`, {
      ...bookmark,
      collection: { $id: collectionId },
    });
    return data.item;
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<Bookmark> {
    const { data } = await this.api.put(`/raindrop/${id}`, updates);
    return data.item;
  }

  async deleteBookmark(id: number): Promise<void> {
    await this.api.delete(`/raindrop/${id}`);
  }

  // Tags
  async getTags(collectionId?: number): Promise<{ _id: string; count: number }[]> {
    const endpoint = collectionId ? `/tags/${collectionId}` : '/tags/0';
    const { data } = await this.api.get(endpoint);
    if (!data || !data.items) {
      throw new Error('Invalid response structure from Raindrop.io API');
    }
    return data.items;
  }

  public async deleteTags(collectionId: number | undefined, tags: string[]): Promise<void> {
    // console.log(`Deleting tags [${tags.join(", ")}] from collection ID ${collectionId}`);
    // Add actual implementation here
  }

  public async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<void> {
    // console.log(`Renaming tag '${oldName}' to '${newName}' in collection ID ${collectionId}`);
    // Add actual implementation here
  }

  public async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<void> {
    // console.log(`Merging tags [${tags.join(", ")}] into '${newName}' in collection ID ${collectionId}`);
    // Add actual implementation here
  }

  public async reorderCollections(sort: string): Promise<void> {
    // console.log(`Reordering collections by '${sort}'`);
    // Add actual implementation here
  }

  public async toggleCollectionsExpansion(expand: boolean): Promise<void> {
    // console.log(`Collections ${expand ? "expanded" : "collapsed"}`);
    // Add actual implementation here
  }

  public async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<void> {
    // console.log(`Merging collections [${collectionIds.join(", ")}] into collection ID ${targetCollectionId}`);
    // Add actual implementation here
  }

  public async removeEmptyCollections(): Promise<{ count: number }> {
    // console.log("Removing all empty collections");
    // Add actual implementation here
    return { count: 0 };
  }

  public async emptyTrash(): Promise<void> {
    // console.log("Emptying the trash");
    // Add actual implementation here
  }

  // User
  async getUserInfo() {
    const { data } = await this.api.get('/user');
    return data.user;
  }

  // Highlights
  async getHighlights(raindropId: number): Promise<{ text: string; note?: string; color?: string; created: string; lastUpdate: string }[]> {
    const { data } = await this.api.get(`/highlights/${raindropId}`);
    if (!data || !data.items) {
      throw new Error('Invalid response structure from Raindrop.io API');
    }
    return data.items;
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<any> {
    const { data } = await this.api.post('/highlights', {
      ...highlightData,
      raindrop: { $id: raindropId }
    });
    return data.item;
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<any> {
    const { data } = await this.api.put(`/highlights/${id}`, updates);
    return data.item;
  }

  async deleteHighlight(id: number): Promise<void> {
    await this.api.delete(`/highlights/${id}`);
  }

  async getAllHighlights(): Promise<{ text: string; note?: string; color?: string; created: string; lastUpdate: string }[]> {
    const { data } = await this.api.get('/highlights');
    if (!data || !data.items) {
      throw new Error('Invalid response structure from Raindrop.io API');
    }
    return data.items.map((highlight: any) => ({
      text: highlight.text,
      note: highlight.note,
      color: highlight.color,
      created: highlight.created,
      lastUpdate: highlight.lastUpdate
    }));
  }

  // Advanced search with filters
  async searchRaindrops(params: {
    search?: string;
    collection?: number; 
    tags?: string[];
    createdStart?: string;
    createdEnd?: string;
    important?: boolean;
    media?: string;
    page?: number;
    perPage?: number;
    sort?: string;
  }): Promise<{ items: Bookmark[]; count: number }> {
    // Convert date ranges to Raindrop API format if provided
    const queryParams: Record<string, any> = { ...params };
    
    if (params.createdStart || params.createdEnd) {
      queryParams.created = {};
      if (params.createdStart) queryParams.created.$gte = params.createdStart;
      if (params.createdEnd) queryParams.created.$lte = params.createdEnd;
      
      // Remove the original params
      delete queryParams.createdStart;
      delete queryParams.createdEnd;
    }
    
    const { data } = await this.api.get('/raindrops', { 
      params: queryParams 
    });
    
    return data;
  }

  // Add file upload functionality
  async uploadFile(collectionId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collectionId', collectionId);

    const { data } = await this.api.put('/raindrop/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.item;
  }

  // Add reminder management functionality
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<any> {
    const { data } = await this.api.put(`/raindrop/${raindropId}/reminder`, reminder);
    return data.item;
  }

  // Import functionality
  async importBookmarks(options: {
    collection?: number;
    format: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
    file: any;
    mode?: 'add' | 'replace';
  }): Promise<{ imported: number; duplicates: number }> {
    const formData = new FormData();
    
    if (options.collection) {
      formData.append('collection', options.collection.toString());
    }
    
    formData.append('format', options.format);
    formData.append('file', options.file);
    
    if (options.mode) {
      formData.append('mode', options.mode);
    }
    
    const { data } = await this.api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return {
      imported: data.imported || 0,
      duplicates: data.duplicates || 0
    };
  }

  // Check import status
  async getImportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    imported?: number;
    duplicates?: number;
    error?: string;
  }> {
    const { data } = await this.api.get('/import/status');
    return {
      status: data.status,
      progress: data.progress,
      imported: data.imported,
      duplicates: data.duplicates,
      error: data.error
    };
  }

  // Export functionality
  async exportBookmarks(options: {
    collection?: number;
    format: 'csv' | 'html' | 'pdf';
    broken?: boolean;
    duplicates?: boolean;
  }): Promise<{ url: string }> {
    const { data } = await this.api.post('/export', options);
    
    return {
      url: data.url
    };
  }

  // Check export status
  async getExportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    url?: string;
    error?: string;
  }> {
    const { data } = await this.api.get('/export/status');
    
    return {
      status: data.status,
      progress: data.progress,
      url: data.url,
      error: data.error
    };
  }
}

export default new RaindropService();