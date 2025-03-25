import axios, { Axios } from 'axios';
import config from '../config/config';

export interface Collection {
  _id: number;
  name: string;
  count: number;
  public: boolean;
  view: string;
  creatorRef: {
    _id: number;
    name: string;
  };
}

export interface Bookmark {
  _id: number;
  title: string;
  excerpt: string;
  link: string;
  created: string;
  lastUpdate: string;
  tags: string[];
  type: string;
  cover: string;
  collection: {
    $id: number;
  };
}

export interface SearchParams {
  search?: string;
  collection?: number;
  page?: number;
  perPage?: number;
  sort?: '-created' | 'created' | '-title' | 'title';
  tags?: string[];
}

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

  async createCollection(name: string, isPublic = false): Promise<Collection> {
    const { data } = await this.api.post('/collection', {
      name,
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
    const { data } = await this.api.get('/raindrops', { params });
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

  // User
  async getUserInfo() {
    const { data } = await this.api.get('/user');
    return data.user;
  }

  // Highlights
  async getHighlights(raindropId: number): Promise<any[]> {
    const { data } = await this.api.get(`/raindrop/${raindropId}/highlights`);
    return data.items;
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<any> {
    const { data } = await this.api.post(`/raindrop/${raindropId}/highlight`, highlightData);
    return data.item;
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<any> {
    const { data } = await this.api.put(`/highlight/${id}`, updates);
    return data.item;
  }

  async deleteHighlight(id: number): Promise<void> {
    await this.api.delete(`/highlight/${id}`);
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
}

export default new RaindropService();