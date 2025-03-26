// Define types for Raindrop.io API

// https://developer.raindrop.io/v1/collections
export interface Collection {
  _id: number;
  title: string;
  access?: {
    level?: number;
    draggable?: boolean;
    collaborators?: string[];
  };
  sort?: number;
  expanded?: boolean;
  color?: string;
  cover?: string;
  count?: number;
  view?: 'list' | 'simple' | 'grid' | 'masonry' | 'magazine';
  public?: boolean;
  user?: { $id: number };
  created: string;  // Changed to non-optional as it's always present in API responses
  lastUpdate?: string;  // Matches Raindrop.io API field name
}

// https://developer.raindrop.io/v1/raindrops/single
export interface Bookmark {
  _id: number;
  title: string;
  excerpt?: string;
  description?: string;
  link: string;
  created: string;
  lastUpdate: string;
  tags?: string[];
  type?: 'link' | 'article' | 'image' | 'video' | 'document' | 'audio';
  cover?: string;
  collection?: { $id: number };
  user?: { $id: number };
  domain?: string;
  important?: boolean;
  media?: 'image' | 'video' | 'audio' | 'document' | 'pdf';
  pleaseParse?: boolean;
  creator?: {
    name?: string;
    url?: string;
  };
  broken?: boolean;
  cache?: {
    status?: string;
    size?: number;
  };
  html?: string;
  highlights?: Highlight[];
}
// https://developer.raindrop.io/v1/highlights
export interface Highlight {
  _id: number;
  text: string;
  color?: string;
  note?: string;
  created: string;
  lastUpdate: string;
  raindrop: {
    $id: number;
    title?: string;
    link?: string;
  };
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