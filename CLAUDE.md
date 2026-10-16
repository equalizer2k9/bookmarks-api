# bookmarks-api

- Layers: `src/routes` → `src/service` → `src/store`. Routes call services only; routes never import from `src/store`.
- Zod schemas live only in `src/routes` (request/response validation); services and the store take plain typed values.
- Specs and plans live in `specs/<feature>/` as `spec.md` and `plan.md`.
- Checks: `npm test` (node:test + `fastify.inject`) and `npm run typecheck` (`tsc --noEmit`); both must pass.
- Node 24 runs the TypeScript sources directly (type stripping): only erasable syntax, imports end in `.ts`.
- Exact dependency versions; change them only with npm.
