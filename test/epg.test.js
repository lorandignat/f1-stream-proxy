import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEpg } from '../src/epg.js';

test('buildEpg emits xmltv with channels and programmes', () => {
  const chs = [{ id: 'a', title: 'Race A', scheduleStart: '2026-11-22T06:00:00.000Z', scheduleEnd: '2026-11-22T09:00:00.000Z' }];
  const out = buildEpg(chs, 'http://localhost:9080');
  assert.match(out, /<tv /);
  assert.match(out, /<channel id="a">/);
  assert.match(out, /<programme/);
  assert.match(out, /Race A/);
});
