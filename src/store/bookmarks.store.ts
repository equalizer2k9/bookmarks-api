export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  tags: string[];
}

export interface BookmarkStore {
  list(): Bookmark[];
  insert(bookmark: Bookmark): Bookmark;
  remove(id: string): boolean;
}

/** In-memory store; one instance per app so tests stay isolated. */
export function createBookmarkStore(): BookmarkStore {
  const items = new Map<string, Bookmark>();
  return {
    list: () => [...items.values()],
    insert(bookmark) {
      items.set(bookmark.id, bookmark);
      return bookmark;
    },
    remove: (id) => items.delete(id),
  };
}
