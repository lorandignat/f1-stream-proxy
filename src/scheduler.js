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
    try {
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
        }
      }

      const seen = new Set();
      const unique = candidates.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));

      const channels = [];
      for (const link of unique) {
        let stream = null;
        let error = null;
        try {
          stream = await extractStreamUrl(link.url, { userAgent: config.userAgent, logger: log });
        } catch (e) {
          error = e.message;
        }
        if (!stream || !stream.url) {
          log.info('skipping (no working stream):', link.id);
          continue;
        }
        channels.push({
          id: link.id,
          title: link.title,
          url: link.url,
          streamUrl: stream.url,
          type: stream.type,
          referer: stream.referer || link.referer || link.url,
          logo: link.logo || '',
          group: link.group || 'Formula 1',
          description: link.description || link.title,
          extractedAt: new Date().toISOString(),
          error,
        });
        log.info('extracted', link.id, stream.url);
      }
      setChannels(channels);
      state.lastScrape = new Date().toISOString();
      log.info('total working channels:', channels.length);
    } catch (e) {
      log.error('scrape failed', e.message);
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
