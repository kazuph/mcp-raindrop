import axios, { Axios, AxiosError } from 'axios';
import config from '../config/config.js';

// Import shared types
import type { Collection, Bookmark, Highlight, SearchParams } from '../types/raindrop.js';

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

  async getChildCollections(parentId: number): Promise<Collection[]> {
    const { data } = await this.api.get(`/collections/${parentId}/childrens`);
    return data.items;
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

  async shareCollection(
    id: number, 
    level: 'view' | 'edit' | 'remove', 
    emails?: string[]
  ): Promise<{ link: string; access: any[] }> {
    const { data } = await this.api.put(`/collection/${id}/sharing`, {
      level,
      emails
    });
    return {
      link: data.link,
      access: data.access || []
    };
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
  
  async permanentDeleteBookmark(id: number): Promise<void> {
    await this.api.delete(`/raindrop/${id}/permanent`);
  }

  async batchUpdateBookmarks(
    ids: number[], 
    updates: { tags?: string[]; collection?: number; important?: boolean; broken?: boolean; }
  ): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/raindrops', {
      ids,
      ...updates
    });
    return { result: data.result };
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

  async getTagsByCollection(collectionId: number): Promise<{ _id: string; count: number }[]> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<{ result: boolean }> {
    const endpoint = collectionId ? `/tags/${collectionId}` : '/tags/0';
    const { data } = await this.api.delete(endpoint, {
      data: { tags }
    });
    return { result: data.result };
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<{ result: boolean }> {
    const endpoint = collectionId ? `/tags/${collectionId}` : '/tags/0';
    const { data } = await this.api.put(endpoint, {
      old: oldName,
      new: newName
    });
    return { result: data.result };
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<{ result: boolean }> {
    const promises = tags.map(tag => this.renameTag(collectionId, tag, newName));
    await Promise.all(promises);
    return { result: true };
  }

  // User
  async getUserInfo() {
    const { data } = await this.api.get('/user');
    return data.user;
  }

  async getUserStats() {
    const { data } = await this.api.get('/user/stats');
    return data;
  }

  async getCollectionStats(collectionId: number) {
    const { data } = await this.api.get(`/collection/${collectionId}/stats`);
    return data;
  }

  // Collections management
  async reorderCollections(sort: string): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collections/sort', { sort });
    return { result: data.result || false };
  }

  async toggleCollectionsExpansion(expand: boolean): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collections/collapsed', { collapsed: !expand });
    return { result: data.result || false };
  }

  async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<{ result: boolean }> {
    const { data } = await this.api.put(`/collection/${targetCollectionId}/merge`, {
      with: collectionIds
    });
    return { result: data.result || false };
  }

  async removeEmptyCollections(): Promise<{ count: number }> {
    const { data } = await this.api.put('/collections/clean');
    return { count: data.count || 0 };
  }

  async emptyTrash(): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collection/-99/clear');
    return { result: data.result || false };
  }

  // Highlights
  async getHighlights(raindropId: number): Promise<Highlight[]> {
    try {
      const { data } = await this.api.get(`/highlights/${raindropId}`);
      if (!data || !data.items) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      return data.items.map((item: any) => ({
        _id: item._id,
        text: item.text,
        note: item.note,
        color: item.color,
        created: item.created,
        lastUpdate: item.lastUpdate,
        raindrop: {
          _id: item.raindrop?._id || raindropId // Ensure raindropId is always included
        }
      }));
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return []; // Return empty array if no highlights found
      }
      throw new Error(`Failed to get highlights for raindrop ${raindropId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHighlightsByCollection(collectionId: number): Promise<Highlight[]> {
    try {
      // Verify collection exists first
      const collection = await this.getCollection(collectionId);
      if (!collection) {
        throw new Error(`Collection ${collectionId} not found`);
      }

      // Get all bookmark IDs from the collection
      const { items: raindrops } = await this.getBookmarks({ 
        collection: collectionId,
        perPage: 50 // Maximum allowed per page
      });

      if (!raindrops?.length) {
        return [];
      }

      // Get all raindrop IDs
      const raindropIds = raindrops.map(raindrop => raindrop._id);

      // Use the /raindrops/multiple endpoint to get highlights
      const { data } = await this.api.post('/raindrops/multiple', {
        ids: raindropIds
      });

      if (!data?.items) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }

      // Extract and format highlights from the response
      const allHighlights: Highlight[] = [];
      for (const raindrop of data.items) {
        if (raindrop.highlights?.length) {
          const highlights = raindrop.highlights.map((highlight: any) => ({
            _id: highlight._id,
            text: highlight.text,
            note: highlight.note,
            color: highlight.color,
            created: highlight.created,
            lastUpdate: highlight.lastUpdate,
            raindrop: {
              _id: raindrop._id
            }
          }));
          allHighlights.push(...highlights);
        }
      }

      return allHighlights;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new Error(`Collection ${collectionId} not found`);
      }
      throw new Error(`Failed to get highlights for collection ${collectionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<Highlight> {
    const { data } = await this.api.post('/highlights', {
      ...highlightData,
      raindrop: { $id: raindropId }
    });
    return data.item;
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<Highlight> {
    const { data } = await this.api.put(`/highlights/${id}`, updates);
    return data.item;
  }

  async deleteHighlight(id: number): Promise<void> {
    await this.api.delete(`/highlights/${id}`);
  }

  async getAllHighlights(): Promise<Highlight[]> {
    try {
      const { data } = await this.api.get('/highlights');
      if (!data || !data.items) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      // Ensure each highlight has the required fields
      return data.items.map((item: any) => {
        if (!item || !item.raindrop?._id) {
          throw new Error('Invalid highlight structure: missing raindrop ID');
        }
        return {
          _id: item._id,
          text: item.text || '',
          note: item.note,
          color: item.color,
          created: item.created,
          lastUpdate: item.lastUpdate,
          raindrop: {
            _id: item.raindrop._id
          }
        };
      });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return []; // Return empty array if no highlights found
      }
      throw error;
    }
  }

  // Search
  async search(params: SearchParams): Promise<{ items: Bookmark[]; count: number }> {
    return this.getBookmarks(params);
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

  // Upload file
  async uploadFile(collectionId: number, file: any): Promise<Bookmark> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collectionId', collectionId.toString());

    const { data } = await this.api.put('/raindrop/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.item;
  }

  // Reminder management
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<Bookmark> {
    const { data } = await this.api.put(`/raindrop/${raindropId}/reminder`, reminder);
    return data.item;
  }

  async deleteReminder(raindropId: number): Promise<Bookmark> {
    const { data } = await this.api.delete(`/raindrop/${raindropId}/reminder`);
    return data.item;
  }

  // Import functionality
  async importBookmarks(collectionId: number, file: any, options: {
    format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
    mode?: 'add' | 'replace';
  } = {}): Promise<{ imported: number; duplicates: number }> {
    const formData = new FormData();
    formData.append('collection', collectionId.toString());
    formData.append('file', file);
    
    if (options.format) {
      formData.append('format', options.format);
    }
    
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
