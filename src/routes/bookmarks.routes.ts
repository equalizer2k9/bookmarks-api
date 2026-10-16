import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BookmarkService } from '../service/bookmarks.service.ts';

const CreateBookmarkBody = z.object({
  url: z.url({ protocol: /^https?$/ }),
  title: z.string().trim().min(1).max(200),
});

const BookmarkParams = z.object({
  id: z.uuid(),
});

export function bookmarkRoutes(service: BookmarkService) {
  return async function (app: FastifyInstance) {
    app.get('/bookmarks', async () => service.list());

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
