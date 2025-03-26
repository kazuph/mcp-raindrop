// Define types for Raindrop.io API

// https://developer.raindrop.io/v1/collections
export interface Collection {
  _id: number;
  title: string;
  count?: number;
  view?: string;
  public?: boolean;
  user?: { $id: number };
  created?: string;
  lastUpdate?: string;
}

// https://developer.raindrop.io/v1/raindrops/single
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
// https://developer.raindrop.io/v1/highlights
export interface Highlight {
  _id: number;
  raindrop?: { $id: number };
  title: string;
  text: string;
  note?: string;
  color?: string;
  created: string;
  lastUpdate: string;
  link: string;
}

export interface SearchParams {
  collection?: number;
  search?: string;
  tags?: string[];
  sort?: "-created" | "created" | "-title" | "title" | undefined; // Updated to match service expectations
  page?: number;
  perPage?: number;
  since?: Date;
  important?: boolean;
  media?: string;
  createdStart?: string;
  createdEnd?: string;
}

// https://developer.raindrop.io/v1/raindrops/multiple
export interface BookmarkResult {
  items: Bookmark[];
  count: number;
}