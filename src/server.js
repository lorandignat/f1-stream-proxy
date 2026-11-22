import express from 'express';
import { buildPlaylist } from './playlist.js';
import { buildEpg } from './epg.js';
import { fetchSchedule, upcomingRaces } from './schedule.js';
import { findChannel, getChannels, state } from './store.js';

export function createServer({ config, proxy, logger }) {
  const app = express();

  function origin(req) {
    if (config.publicUrl) return config.publicUrl.replace(/\/$/, '');
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`;
  }

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', channels: getChannels().length, lastScrape: state.lastScrape, sources: state.sources, errors: state.errors });
  });

  app.get('/channels', (req, res) => {
    res.json(getChannels().map((c) => ({
      id: c.id, title: c.title, type: c.type, streamUrl: c.streamUrl, error: c.error,
      logo: c.logo, group: c.group, description: c.description,
    })));
  });

  app.get('/playlist.m3u', (req, res) => {
    const o = origin(req);
    const body = buildPlaylist(getChannels().filter((c) => c.streamUrl), o);
    res.type('application/vnd.apple.mpegurl').send(body);
  });

  app.get('/epg.xml', (req, res) => {
    const o = origin(req);
    const body = buildEpg(getChannels().filter((c) => c.streamUrl), o);
    res.type('application/xml').send(body);
  });

  app.get('/schedule', async (req, res) => {
    try {
      const races = await fetchSchedule(fetch, config.scheduleApi);
      const now = req.query.all === '1' ? null : new Date();
      const list = now ? upcomingRaces(races, now) : races;
      res.json({ count: list.length, races: list });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  app.get('/schedule.html', async (req, res) => {
    try {
      const races = await fetchSchedule(fetch, config.scheduleApi);
      const list = upcomingRaces(races, new Date());
      const rows = list.map((r) => `<tr><td>${r.round}</td><td>${r.name}</td><td>${r.circuit}</td><td>${r.location}</td><td>${r.datetime}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>F1 Schedule</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#eee}</style></head><body><h1>Upcoming F1 Races</h1><table><tr><th>Round</th><th>Race</th><th>Circuit</th><th>Location</th><th>Date/Time (UTC)</th></tr>${rows}</table></body></html>`;
      res.type('text/html').send(html);
    } catch (e) {
      res.status(502).send(e.message);
    }
  });

  app.get('/stream/:id/playlist.m3u8', async (req, res) => {
    const ch = findChannel(req.params.id);
    if (!ch || !ch.streamUrl) return res.status(404).send('not found');
    const o = origin(req);
    try {
      const r = await proxy.fetchPlaylist(ch.streamUrl, ch.referer || ch.url, ch.id, o);
      res.type(r.contentType).send(r.text);
    } catch (e) {
      logger.error('playlist proxy error', e.message);
      res.status(502).send('upstream error');
    }
  });

  app.get('/stream/:id/fetch', async (req, res) => {
    const ch = findChannel(req.params.id);
    const u = req.query.u;
    if (!ch || !u) return res.status(400).send('missing u');
    const o = origin(req);
    try {
      const r = await proxy.fetchResource(u, ch.referer || ch.url, ch.id, o);
      res.type(r.contentType);
      if (r.kind === 'm3u8') res.send(r.body);
      else res.send(r.body);
    } catch (e) {
      logger.error('fetch proxy error', e.message);
      res.status(502).send('upstream error');
    }
  });

  app.get('/stream/:id/direct', async (req, res) => {
    const ch = findChannel(req.params.id);
    if (!ch || !ch.streamUrl) return res.status(404).send('not found');
    // redirect to stream url (best effort)
    res.redirect(ch.streamUrl);
  });

  return app;
}
