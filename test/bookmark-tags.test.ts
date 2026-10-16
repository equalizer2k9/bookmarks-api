import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';

type App = ReturnType<typeof buildApp>;

/** Clock going forward 1 s per call from a fixed epoch. */
const clock = () => {
  let n = 0;
  const start = Date.parse('2026-01-01T00:00:00.000Z');
  return () => new Date(start + 1000 * n++);
};

const create = (app: App, payload: unknown) =>
  app.inject({ method: 'POST', url: '/bookmarks', payload: payload as Record<string, unknown> });

const list = (app: App, qs = '') => app.inject({ method: 'GET', url: `/bookmarks${qs}` });

const bm = (title: string, tags?: unknown) => ({
  url: `https://example.com/${title}`,
  title,
  ...(tags === undefined ? {} : { tags }),
});

test('buildApp uses the injected clock for createdAt', async () => {
  const now = clock();
  const app = buildApp({ now });
  const a = (await create(app, bm('a'))).json();
  const b = (await create(app, bm('b'))).json();
  assert.equal(a.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(b.createdAt, '2026-01-01T00:00:01.000Z');
  assert.ok(a.createdAt < b.createdAt);
});

test('create without tags → 201 and tags is []', async () => {
  const app = buildApp({ now: clock() });
  const res = await create(app, bm('a'));
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json().tags, []);
});

test('every bookmark in create and list responses has a tags array of strings', async () => {
  const app = buildApp({ now: clock() });
  const created = [await create(app, bm('a', ['node'])), await create(app, bm('b'))];
  for (const res of created) {
    const tags = res.json().tags;
    assert.ok(Array.isArray(tags));
    assert.ok(tags.every((t: unknown) => typeof t === 'string'));
  }
  const items = (await list(app)).json();
  assert.equal(items.length, 2);
  for (const b of items) {
    assert.ok(Array.isArray(b.tags));
    assert.ok(b.tags.every((t: unknown) => typeof t === 'string'));
  }
});

const expectRejected = async (app: App, payload: unknown) => {
  const res = await create(app, payload);
  assert.equal(res.statusCode, 400, JSON.stringify(payload));
  assert.deepEqual((await list(app)).json(), []);
  return res;
};

test('valid tags → 201 with normalised tags', async () => {
  const app = buildApp({ now: clock() });
  const res = await create(app, bm('a', ['node', 'api']));
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json().tags, ['node', 'api']);
});

test('tags: [] → 201 with tags []', async () => {
  const app = buildApp({ now: clock() });
  const res = await create(app, bm('a', []));
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json().tags, []);
});

test('upper-case tags are stored lower-case', async () => {
  const app = buildApp({ now: clock() });
  const res = await create(app, bm('a', ['Node']));
  assert.deepEqual(res.json().tags, ['node']);
  assert.deepEqual((await list(app)).json()[0].tags, ['node']);
});

test('mixed-case duplicates kept once', async () => {
  const app = buildApp({ now: clock() });
  const res = await create(app, bm('a', ['Node', 'node', 'NODE']));
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json().tags, ['node']);
});

test('tags returned in first-occurrence order', async () => {
  const app = buildApp({ now: clock() });
  const res = await create(app, bm('a', ['b', 'A', 'a', 'c']));
  assert.deepEqual(res.json().tags, ['b', 'a', 'c']);
});

test('list returns the same tags as the create response', async () => {
  const app = buildApp({ now: clock() });
  const created = (await create(app, bm('a', ['Node', 'api']))).json();
  assert.deepEqual((await list(app)).json()[0], created);
});

test('empty-string tag → 400', async () => {
  await expectRejected(buildApp({ now: clock() }), bm('a', ['']));
});

test('30-char tag accepted, 31-char tag → 400', async () => {
  const app = buildApp({ now: clock() });
  await expectRejected(app, bm('a', ['x'.repeat(31)]));
  const ok = await create(app, bm('b', ['x'.repeat(30)]));
  assert.equal(ok.statusCode, 201);
});

test('tags with disallowed characters → 400', async () => {
  for (const tag of ['a b', ' node ', 'a_b', 'a.b', 'a/b', 'café', 'ñ', '😀']) {
    await expectRejected(buildApp({ now: clock() }), bm('a', [tag]));
  }
});

test('hyphen-only and edge hyphens accepted', async () => {
  const res = await create(buildApp({ now: clock() }), bm('a', ['-', '-node', 'a--b']));
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json().tags, ['-', '-node', 'a--b']);
});

test('10 distinct tags accepted, 11 distinct → 400', async () => {
  const tags = Array.from({ length: 11 }, (_, i) => `t${i}`);
  const app = buildApp({ now: clock() });
  await expectRejected(app, bm('a', tags));
  const ok = await create(app, bm('b', tags.slice(0, 10)));
  assert.equal(ok.statusCode, 201);
});

test('12 entries collapsing to ≤10 distinct → 201', async () => {
  const distinct = Array.from({ length: 10 }, (_, i) => `t${i}`);
  const res = await create(buildApp({ now: clock() }), bm('a', [...distinct, 'T0', 'T1']));
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json().tags, distinct);
});

test('non-array tags → 400', async () => {
  for (const tags of ['node', 42, null, ['ok', 1]]) {
    await expectRejected(buildApp({ now: clock() }), bm('a', tags));
  }
});

test('tag rejection uses invalid_body with a tags issue', async () => {
  const eleven = Array.from({ length: 11 }, (_, i) => `t${i}`);
  for (const tags of [[''], eleven, 'node']) {
    const body = (await expectRejected(buildApp({ now: clock() }), bm('a', tags))).json();
    assert.equal(body.error, 'invalid_body');
    assert.ok('tags' in body.issues);
  }
});

test('invalid tags and url reported together', async () => {
  const res = await create(buildApp({ now: clock() }), { url: 'not a url', title: 'x', tags: [''] });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(Object.keys(res.json().issues).sort(), ['tags', 'url']);
});

/** Fixture created oldest to newest: A [node, api], B [go], C [node], D []. */
const seed = async () => {
  const app = buildApp({ now: clock() });
  const A = (await create(app, bm('A', ['node', 'api']))).json();
  const B = (await create(app, bm('B', ['go']))).json();
  const C = (await create(app, bm('C', ['node']))).json();
  const D = (await create(app, bm('D'))).json();
  return { app, A, B, C, D };
};

const ids = (res: { json(): Array<{ id: string }> }) => res.json().map((b) => b.id);

test('no tag param → all bookmarks newest first', async () => {
  const { app, A, B, C, D } = await seed();
  assert.deepEqual(ids(await list(app)), [D.id, C.id, B.id, A.id]);
});

test('?tag=node returns only bookmarks tagged node', async () => {
  const { app, A, C } = await seed();
  const res = await list(app, '?tag=node');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(new Set(ids(res)), new Set([C.id, A.id]));
});

test('filtered list is newest first', async () => {
  const { app, A, C } = await seed();
  assert.deepEqual(ids(await list(app, '?tag=node')), [C.id, A.id]);
});

test('?tag=NODE and ?tag=Node match node', async () => {
  const { app, A, C } = await seed();
  for (const qs of ['?tag=NODE', '?tag=Node']) {
    assert.deepEqual(ids(await list(app, qs)), [C.id, A.id]);
  }
});

test('valid tag with no matches → 200 []', async () => {
  const { app } = await seed();
  const res = await list(app, '?tag=rust');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), []);
});

test('filtered bookmarks carry all their tags', async () => {
  const { app } = await seed();
  const items = (await list(app, '?tag=api')).json();
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].tags, ['node', 'api']);
});

const badQueries = ['?tag=', `?tag=${'x'.repeat(31)}`, '?tag=a%20b', '?tag=a_b', '?tag=a&tag=b', '?tag=node&tag=node'];

test('?tag= (empty) → 400', async () => {
  const { app } = await seed();
  assert.equal((await list(app, '?tag=')).statusCode, 400);
});

test('invalid tag value → 400', async () => {
  const { app } = await seed();
  for (const qs of [`?tag=${'x'.repeat(31)}`, '?tag=a%20b', '?tag=a_b']) {
    assert.equal((await list(app, qs)).statusCode, 400, qs);
  }
});

test('repeated tag param → 400', async () => {
  const { app } = await seed();
  for (const qs of ['?tag=a&tag=b', '?tag=node&tag=node']) {
    assert.equal((await list(app, qs)).statusCode, 400, qs);
  }
});

test('query rejection body is invalid_query with a tag issue', async () => {
  const { app } = await seed();
  for (const qs of badQueries) {
    const res = await list(app, qs);
    assert.equal(res.statusCode, 400, qs);
    assert.equal(res.json().error, 'invalid_query');
    assert.ok('tag' in res.json().issues, qs);
  }
});

test('other query params are ignored', async () => {
  const { app, B, C, D, A } = await seed();
  assert.deepEqual(ids(await list(app, '?foo=bar')), [D.id, C.id, B.id, A.id]);
  assert.deepEqual(ids(await list(app, '?foo=bar&tag=go')), [B.id]);
});

test('deleting a tagged bookmark → 204, again → 404, malformed id → 404', async () => {
  const app = buildApp({ now: clock() });
  const { id } = (await create(app, bm('a', ['node']))).json();
  assert.equal((await app.inject({ method: 'DELETE', url: `/bookmarks/${id}` })).statusCode, 204);
  assert.equal((await app.inject({ method: 'DELETE', url: `/bookmarks/${id}` })).statusCode, 404);
  assert.equal((await app.inject({ method: 'DELETE', url: '/bookmarks/not-a-uuid' })).statusCode, 404);
});

test('deleted tagged bookmark disappears from filtered and unfiltered lists', async () => {
  const app = buildApp({ now: clock() });
  const { id } = (await create(app, bm('a', ['node']))).json();
  await app.inject({ method: 'DELETE', url: `/bookmarks/${id}` });
  assert.deepEqual((await list(app, '?tag=node')).json(), []);
  assert.deepEqual((await list(app)).json(), []);
});
