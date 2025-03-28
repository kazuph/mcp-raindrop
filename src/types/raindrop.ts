// Raindrop.io types

export type User = {
  _id: number;
  email: string;
  fullName?: string;
  pro: boolean;
  registered: string;
  config?: {
    broken_level: 'basic' | 'default' | 'strict';
    font_color: boolean;
    font_size: number;
    lang: string;
    last_collection: number;
    raindrops_sort: string;
    raindrops_view: string;
  };
};

export type Collection = {
  _id: number;
  title: string;
  description?: string;
  color?: string;
  public?: boolean;
  view: 'list' | 'simple' | 'grid' | 'masonry';
  sort: string;
  cover?: string[];
  count: number;
  expanded?: boolean;
  parent?: {
    $id: number;
    title?: string;
  };
  user: {
    $id: number;
  };
  created: string;
  lastUpdate: string;
  creatorRef?: {
    _id: number;
    name: string;
  };
  collaborators?: {
    _id: number;
    email: string;
    name?: string;
    role: 'owner' | 'viewer' | 'editor';
  }[];
};

export type Media = {
  link: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'doc';
  width?: number;
  height?: number;
};

export type Bookmark = {
  _id: number;
  title: string;
  excerpt?: string;
  note?: string;
  type: 'link' | 'article' | 'image' | 'video' | 'document' | 'audio';
  tags: string[];
  cover?: string;
  link: string;
  domain: string;
  created: string;
  lastUpdate: string;
  removed: boolean;
  media?: Media[];
  user: {
    $id: number;
  };
  collection: {
    $id: number;
  };
  html?: string;
  important: boolean;
  highlights?: Highlight[];
  reminder?: {
    date: string;
    note?: string;
  };
  broken?: boolean;
  duplicate?: boolean;
  sort?: number;
  cache?: {
    status: 'ready' | 'retry' | 'failed' | 'invalid-origin' | 'invalid-timeout';
    size: number;
    created: string;
  };
};

export type Highlight = {
  _id: number;
  text: string;
  note?: string;
  color?: string;
  created: string;
  lastUpdate?: string;
  raindrop?: {
    _id: number;
    title?: string;
    link?: string;
  };
};

export type SearchParams = {
  search?: string;
  collection?: number;
  tags?: string[];
  page?: number;
  perPage?: number;
  sort?: string;
  important?: boolean;
  media?: 'image' | 'video' | 'document' | 'audio';
  word?: string;
  pleaseParse?: boolean;
  noparse?: boolean;
  since?: string; // ISO string date to filter bookmarks created/updated since this time
  created?: {
    $gte?: string;
    $lte?: string;
  };
};

export type UserStats = {
  count: number;
  lastBookmarkCreated: string;
  lastBookmarkUpdated: string;
  today: number;
  tags: number;
  collections: number;
};

export type CollectionStats = {
  count: number;
  lastBookmarkCreated: string;
  lastBookmarkUpdated: string;
  oldest: {
    id: number;
    created: string;
    title: string;
    link: string;
  };
  newest: {
    id: number;
    created: string;
    title: string;
    link: string;
  };
};

export type ImportOptions = {
  format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
  mode?: 'add' | 'replace';
};

export type ImportStatus = {
  status: 'in-progress' | 'ready' | 'error';
  progress?: number;
  imported?: number;
  duplicates?: number;
  error?: string;
};

export type ExportOptions = {
  collection?: number;
  format: 'csv' | 'html' | 'pdf';
  broken?: boolean;
  duplicates?: boolean;
};

export type ExportStatus = {
  status: 'in-progress' | 'ready' | 'error';
  progress?: number;
  url?: string;
  error?: string;
};