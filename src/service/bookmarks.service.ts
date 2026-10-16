import { randomUUID } from 'node:crypto';
import type { Bookmark, BookmarkStore } from '../store/bookmarks.store.ts';
import { normaliseTags } from './tags.ts';

export interface NewBookmark {
  url: string;
  title: string;
  tags?: string[];
}

export interface BookmarkService {
  list(filter?: { tag?: string }): Bookmark[];
  create(input: NewBookmark): Bookmark;
  delete(id: string): boolean;
}

export function createBookmarkService(store: BookmarkStore, now: () => Date = () => new Date()): BookmarkService {
  return {
    list(filter) {
      const sorted = store.list().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const tag = filter?.tag?.toLowerCase();
      return tag ? sorted.filter((b) => b.tags.includes(tag)) : sorted;
    },
    create: ({ url, title, tags }) =>
      store.insert({
        id: randomUUID(),
        url,
        title: title.trim(),
        createdAt: now().toISOString(),
        tags: normaliseTags(tags ?? []),
      }),
    delete: (id) => store.remove(id),
  };
}
