import type { Collection, Bookmark, SearchParams } from '../types/raindrop.js';
import raindropService from '../services/raindrop.service';
import type { Request, Response } from 'express';

export const raindropController = {
  // Collections
  async getCollections(_req: Request, res: Response) {
    try {
      const collections = await raindropService.getCollections();
      res.json({ collections });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  },

  async createCollection(req: Request, res: Response) {
    try {
      const { name, isPublic } = req.body as { name: string; isPublic?: boolean };
      const collection = await raindropService.createCollection(name, isPublic);
      res.status(201).json({ collection });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create collection' });
    }
  },

  async updateCollection(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const collection = await raindropService.updateCollection(Number(id), req.body as Partial<Collection>);
      res.json({ collection });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update collection' });
    }
  },

  async deleteCollection(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await raindropService.deleteCollection(Number(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  },

  // Bookmarks
  async getBookmarks(req: Request, res: Response) {
    try {
      const bookmarks = await raindropService.getBookmarks(req.query as unknown as SearchParams);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  },

  async getBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const bookmark = await raindropService.getBookmark(Number(id));
      res.json({ bookmark });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookmark' });
    }
  },

  async createBookmark(req: Request, res: Response) {
    try {
      const { collectionId, ...bookmarkData } = req.body as { collectionId: number } & Partial<Bookmark>;
      const bookmark = await raindropService.createBookmark(collectionId, bookmarkData);
      res.status(201).json({ bookmark });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  },

  async updateBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const bookmark = await raindropService.updateBookmark(Number(id), req.body as Partial<Bookmark>);
      res.json({ bookmark });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update bookmark' });
    }
  },

  async deleteBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await raindropService.deleteBookmark(Number(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete bookmark' });
    }
  },

  // Tags
  async getTags(_req: Request, res: Response) {
    try {
      const tags = await raindropService.getTags();
      res.json({ tags });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  },

  // User
  async getUserInfo(_req: Request, res: Response) {
    try {
      const user = await raindropService.getUserInfo();
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user info' });
    }
  },

  // Highlights
  async getHighlights(req: Request, res: Response) {
    try {
      const { raindropId } = req.params as { raindropId: string };
      const highlights = await raindropService.getHighlights(Number(raindropId));
      res.json({ highlights });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch highlights' });
    }
  },

  async createHighlight(req: Request, res: Response) {
    try {
      const { raindropId, text, note, color } = req.body as { 
        raindropId: number; 
        text: string; 
        note?: string; 
        color?: string 
      };
      const highlight = await raindropService.createHighlight(
        raindropId,
        { text, note, color }
      );
      res.status(201).json({ highlight });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create highlight' });
    }
  },

  async updateHighlight(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const highlight = await raindropService.updateHighlight(Number(id), req.body);
      res.json({ highlight });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update highlight' });
    }
  },

  async deleteHighlight(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await raindropService.deleteHighlight(Number(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete highlight' });
    }
  }
};