import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BookmarkService } from '../service/bookmarks.service.ts';
import { normaliseTags } from '../service/tags.ts';

const Tag = z.string().min(1).max(30).regex(/^[A-Za-z0-9-]+$/);

const CreateBookmarkBody = z.object({
  url: z.url({ protocol: /^https?$/ }),
  title: z.string().trim().min(1).max(200),
  tags: z.array(Tag).transform(normaliseTags).pipe(z.array(z.string()).max(10)).optional(),
});

const ListBookmarksQuery = z.object({ tag: Tag.optional() });

const BookmarkParams = z.object({
  id: z.uuid(),
});

export function bookmarkRoutes(service: BookmarkService) {
  return async function (app: FastifyInstance) {
    app.get('/bookmarks', async (request, reply) => {
      const query = ListBookmarksQuery.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'invalid_query', issues: z.flattenError(query.error).fieldErrors });
      }
      return service.list({ tag: query.data.tag });
    });

    app.post('/bookmarks', async (request, reply) => {
      const body = CreateBookmarkBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: 'invalid_body', issues: z.flattenError(body.error).fieldErrors });
      }
      return reply.code(201).send(service.create(body.data));
    });

    app.delete('/bookmarks/:id', async (request, reply) => {
      const params = BookmarkParams.safeParse(request.params);
      if (!params.success || !service.delete(params.data.id)) {
        return reply.code(404).send({ error: 'not_found' });
      }
      return reply.code(204).send();
    });
  };
}
