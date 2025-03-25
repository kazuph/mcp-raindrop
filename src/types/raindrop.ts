// Define types for Raindrop.io API

export interface Collection {
  _id: number;
  name: string;
  count?: number;
  view?: string;
  public?: boolean;
  user?: { $id: number };
  created?: string;
  lastUpdate?: string;
}

export interface Bookmark {
  _id: number;
  title: string;
  excerpt?: string;
  link: string;
  created: string;
  lastUpdate: string;
  tags?: string[];
  type?: string;
  cover?: string;
  collection?: { $id: number };
  user?: { $id: number };
  domain?: string;
  important?: boolean;
  media?: string;
}

export interface Highlight {
  _id: number;
  raindrop?: { $id: number };
  text: string;
  note?: string;
  color?: string;
  created: string;
  lastUpdate: string;
}

export interface SearchParams {
  collection?: string | number;
  search?: string;
  tags?: string[];
  sort?: "-created" | "created" | "-title" | "title" | string;
  page?: number;
  perPage?: number;
  since?: Date;
  important?: boolean;
  media?: string;
  createdStart?: string;
  createdEnd?: string;
}

export interface BookmarkResult {
  items: Bookmark[];
  count: number;
}