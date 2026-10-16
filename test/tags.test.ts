import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseTags } from '../src/service/tags.ts';

test('lower-cases tags', () => {
  assert.deepEqual(normaliseTags(['Node', 'TypeScript']), ['node', 'typescript']);
});

test('collapses case-insensitive duplicates to one', () => {
  assert.deepEqual(normaliseTags(['Node', 'node', 'NODE']), ['node']);
});

test('keeps first-occurrence order', () => {
  assert.deepEqual(normaliseTags(['b', 'A', 'a', 'c', 'B']), ['b', 'a', 'c']);
});

test('returns [] for []', () => {
  assert.deepEqual(normaliseTags([]), []);
});

test('does not mutate its input', () => {
  const input = ['B', 'b', 'A'];
  normaliseTags(input);
  assert.deepEqual(input, ['B', 'b', 'A']);
});
