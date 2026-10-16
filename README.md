# bookmarks-api

A small bookmarks HTTP API: Fastify 5, Zod 4, TypeScript on Node 24 (run without a build step via
type stripping), in-memory storage.

## Endpoints

| Method | Path | Body / params | Response |
|---|---|---|---|
| `GET` | `/bookmarks` | optional `?tag=<tag>` (exact, case-insensitive) | `200` list of bookmarks, newest first · `400` `invalid_query` |
| `POST` | `/bookmarks` | `{ "url": "https://…", "title": "…", "tags": ["…"] }` (`tags` optional: up to 10 distinct, 1–30 chars of letters, digits or hyphens; lower-cased, de-duplicated) | `201` created bookmark (always has `tags`) · `400` `invalid_body` |
| `DELETE` | `/bookmarks/:id` | `id` | `204` · `404` unknown id |

## Run

```bash
npm ci
npm start            # http://localhost:3000
npm test             # node:test + fastify.inject
npm run typecheck    # tsc --noEmit
```

## Layout

```text
src/routes/   HTTP + Zod validation
src/service/  business rules
src/store/    in-memory storage
test/         node:test suites
```
