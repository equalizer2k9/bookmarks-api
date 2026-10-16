import { randomUUID } from 'node:crypto';
import type { Bookmark, BookmarkStore } from '../store/bookmarks.store.ts';

export interface NewBookmark {
  url: string;
  title: string;
}

export interface BookmarkService {
  list(): Bookmark[];
  create(input: NewBookmark): Bookmark;
  delete(id: string): boolean;
}

export function createBookmarkService(store: BookmarkStore, now: () => Date = () => new Date()): BookmarkService {
  return {
    list: () => store.list().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    create: ({ url, title }) =>
      store.insert({ id: randomUUID(), url, title: title.trim(), createdAt: now().toISOString() }),
    delete: (id) => store.remove(id),
  };
}
