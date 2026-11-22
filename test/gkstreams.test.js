import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scrapeGkstreams } from '../src/gkstreams.js';

const json = readFileSync(new URL('./fixtures/gkstreams.json', import.meta.url), 'utf8');

test('scrapeGkstreams returns only F1 sources, gkstreams format', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => JSON.parse(json) });
  const items = await scrapeGkstreams(fetchImpl, 'ua');
  assert.equal(items.length, 2);
  assert.ok(items.every((i) => /Las Vegas/.test(i.title)));
  assert.equal(items[0].id, 'src1');
});
