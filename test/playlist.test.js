import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlaylist } from '../src/playlist.js';

test('buildPlaylist emits M3U with channels', () => {
  const chs = [{ id: 'a', title: 'Race A' }, { id: 'b', title: 'Race B' }];
  const out = buildPlaylist(chs, 'http://localhost:8080');
  assert.match(out, /^#EXTM3U/);
  assert.match(out, /Race A/);
  assert.match(out, /http:\/\/localhost:8080\/stream\/a\/playlist\.m3u8/);
  assert.match(out, /http:\/\/localhost:8080\/stream\/b\/playlist\.m3u8/);
});

test('buildPlaylist filters none when given list', () => {
  const out = buildPlaylist([], 'http://x');
  assert.equal(out, '#EXTM3U\n');
});
