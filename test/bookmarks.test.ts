import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';

const create = (app: ReturnType<typeof buildApp>, payload: unknown) =>
  app.inject({ method: 'POST', url: '/bookmarks', payload: payload as Record<string, unknown> });

test('creates a bookmark and lists it', async () => {
  const app = buildApp();
  const res = await create(app, { url: 'https://fastify.dev', title: '  Fastify  ' });
  assert.equal(res.statusCode, 201);
  const created = res.json();
  assert.equal(created.title, 'Fastify');
  assert.match(created.id, /^[0-9a-f-]{36}$/);

  const list = await app.inject({ method: 'GET', url: '/bookmarks' });
  assert.equal(list.statusCode, 200);
  assert.deepEqual(list.json(), [created]);
});

test('rejects an invalid body with 400 and field errors', async () => {
  const app = buildApp();
  const res = await create(app, { url: 'not a url', title: '' });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(Object.keys(res.json().issues).sort(), ['title', 'url']);
});

test('deletes a bookmark, then 404 for the same id', async () => {
  const app = buildApp();
  const { id } = (await create(app, { url: 'https://zod.dev', title: 'Zod' })).json();
  assert.equal((await app.inject({ method: 'DELETE', url: `/bookmarks/${id}` })).statusCode, 204);
  assert.equal((await app.inject({ method: 'DELETE', url: `/bookmarks/${id}` })).statusCode, 404);
  assert.deepEqual((await app.inject({ method: 'GET', url: '/bookmarks' })).json(), []);
});
