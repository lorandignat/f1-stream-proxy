import express from 'express';
import { buildPlaylist } from './playlist.js';
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
