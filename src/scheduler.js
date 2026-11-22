import { scrapeListing } from './scraper.js';
import { scrapeGkstreams } from './gkstreams.js';
import { extractStreamUrl } from './extractor.js';
import { setChannels, state } from './store.js';
import { createLogger } from './logger.js';

export function createScheduler({ config, logger }) {
  const log = logger || createLogger(config.logLevel);

  async function runOnce() {
    if (state.scraping) return;
    state.scraping = true;
    const errors = [];
    try {
      state.sources = (config.sources || []).map((s) => `${s.type}:${s.url}`);
      const candidates = [];
      for (const src of (config.sources || [])) {
        try {
          if (src.type === 'vipbox') {
            const vb = await scrapeListing(src.url, fetch, config.userAgent);
            log.info('vipbox: found', vb.length, 'F1 links');
            candidates.push(...vb);
          } else if (src.type === 'gkstreams') {
            const gk = await scrapeGkstreams(fetch, config.userAgent, src.url);
            log.info('gkstreams: found', gk.length, 'F1 source links');
            candidates.push(...gk);
          } else {
            log.warn('unknown source type', src.type);
          }
        } catch (e) {
          log.warn(`${src.type} scrape failed`, e.message);
          errors.push(`${src.type}: ${e.message}`);
        }
      }

      const seen = new Set();
      const unique = candidates.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));

      const channels = [];
      const CONC = 2;
      for (let i = 0; i < unique.length; i += CONC) {
        const batch = unique.slice(i, i + CONC);
        const results = await Promise.all(batch.map(async (link) => {
          let stream = null;
          let error = null;
          try {
            stream = await extractStreamUrl(link.url, { userAgent: config.userAgent, referer: link.referer || link.url, logger: log });
          } catch (e) {
            error = e.message;
          }
          return { link, stream, error };
        }));
        for (const { link, stream, error } of results) {
          if (!stream || !stream.url) {
            log.info('no working stream:', link.id, error || '');
          }
          channels.push({
            id: link.id,
            title: link.title,
            url: link.url,
            streamUrl: stream ? stream.url : null,
            type: stream ? stream.type : null,
            referer: (stream && stream.referer) || link.referer || link.url,
            logo: link.logo || '',
            group: link.group || 'Formula 1',
            description: link.description || link.title,
            resolution: link.resolution || '',
            extractedAt: new Date().toISOString(),
            error,
          });
          if (stream && stream.url) log.info('extracted', link.id, stream.url);
          else log.info('no working stream:', link.id, error || '');
        }
        setChannels(channels.filter((c) => c.streamUrl));
        state.lastScrape = new Date().toISOString();
      }
      state.errors = errors;
      log.info('total working channels:', channels.filter((c) => c.streamUrl).length);
    } catch (e) {
      log.error('scrape failed', e.message);
      errors.push(`fatal: ${e.message}`);
      state.errors = errors;
    } finally {
      state.scraping = false;
    }
  }

  function start() {
    runOnce();
    const ms = config.scrapeIntervalMin * 60 * 1000;
    setInterval(runOnce, ms);
  }

  return { runOnce, start };
}
