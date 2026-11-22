import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSchedule, upcomingRaces } from '../src/schedule.js';

test('fetchSchedule parses races', async () => {
  const payload = { MRData: { RaceTable: { Races: [{ round: '1', raceName: 'Test GP', Circuit: { circuitName: 'C', Location: { locality: 'L', country: 'C' } }, date: '2026-05-01', time: '10:00:00Z' }] } } };
  const fetchImpl = async () => ({ ok: true, json: async () => payload });
  const races = await fetchSchedule(fetchImpl);
  assert.equal(races.length, 1);
  assert.equal(races[0].name, 'Test GP');
  assert.equal(races[0].datetime, '2026-05-01T10:00:00Z');
});

test('upcomingRaces filters past races', () => {
  const races = [
    { datetime: '2020-01-01T00:00:00Z' },
    { datetime: '2099-01-01T00:00:00Z' },
  ];
  const out = upcomingRaces(races, new Date('2026-01-01T00:00:00Z'));
  assert.equal(out.length, 1);
  assert.equal(out[0].datetime, '2099-01-01T00:00:00Z');
});
