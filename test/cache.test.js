import test from 'node:test';
import assert from 'node:assert/strict';
import { LruCache, TtlCache } from '../src/cache.js';

test('LruCache evicts oldest', () => {
  const c = new LruCache(2);
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  assert.equal(c.get('a'), undefined);
  assert.equal(c.get('b'), 2);
  assert.equal(c.get('c'), 3);
});

test('LruCache get refreshes recency', () => {
  const c = new LruCache(2);
  c.set('a', 1); c.set('b', 2);
  c.get('a');
  c.set('c', 3);
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('b'), undefined);
});

test('TtlCache expires', async () => {
  const c = new TtlCache(0.05);
  c.set('k', 'v');
  assert.equal(c.get('k'), 'v');
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(c.get('k'), undefined);
});
