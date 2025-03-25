import type { Request, Response } from 'express';
import raindropService from '../services/raindrop.service';

export const raindropController = {
  // Collections
  async getCollections(req: Request, res: Response) {
    try {
      const collections = await raindropService.getCollections();
      res.json({ collections });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  },

  async createCollection(req: Request, res: Response) {
    try {
      const { name, isPublic } = req.body;
      const collection = await raindropService.createCollection(name, isPublic);
      res.status(201).json({ collection });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create collection' });
    }
  },

  async updateCollection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const collection = await raindropService.updateCollection(Number(id), req.body);
      res.json({ collection });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update collection' });
    }
  },

  async deleteCollection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await raindropService.deleteCollection(Number(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  },

  // Bookmarks
  async getBookmarks(req: Request, res: Response) {
    try {
      const bookmarks = await raindropService.getBookmarks(req.query);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  },

  async getBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const bookmark = await raindropService.getBookmark(Number(id));
      res.json({ bookmark });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookmark' });
    }
  },

  async createBookmark(req: Request, res: Response) {
    try {
      const { collectionId, ...bookmarkData } = req.body;
      const bookmark = await raindropService.createBookmark(collectionId, bookmarkData);
      res.status(201).json({ bookmark });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  },

  async updateBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const bookmark = await raindropService.updateBookmark(Number(id), req.body);
      res.json({ bookmark });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update bookmark' });
    }
  },

  async deleteBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await raindropService.deleteBookmark(Number(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete bookmark' });
    }
  },

  // Tags
  async getTags(req: Request, res: Response) {
    try {
      const tags = await raindropService.getTags();
      res.json({ tags });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  },

  // User
  async getUserInfo(req: Request, res: Response) {
    try {
      const user = await raindropService.getUserInfo();
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user info' });
    }
  },
};