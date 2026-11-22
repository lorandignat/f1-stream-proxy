import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseListing } from '../src/scraper.js';

const html = readFileSync(new URL('./fixtures/listing.html', import.meta.url), 'utf8');

test('parseListing extracts F1 links only', () => {
  const items = parseListing(html, 'https://vipbox1.com/moto_gp');
  assert.equal(items.length, 2);
  assert.ok(items.every((i) => /formula/i.test(i.title) || /formula/i.test(i.url)));
  assert.ok(items[0].url.includes('vipboxi.net'));
});

test('parseListing dedupes identical urls', () => {
  const dup = html + html;
  const items = parseListing(dup, 'https://vipbox1.com/moto_gp');
  assert.equal(items.length, 2);
});
