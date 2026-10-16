import Fastify from 'fastify';
import { createBookmarkStore } from './store/bookmarks.store.ts';
import { createBookmarkService } from './service/bookmarks.service.ts';
import { bookmarkRoutes } from './routes/bookmarks.routes.ts';

/** Composition root: the only module that wires store → service → routes. */
export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  const service = createBookmarkService(createBookmarkStore());
  app.register(bookmarkRoutes(service));
  return app;
}
