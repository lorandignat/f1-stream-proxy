import { scrapeListing } from './scraper.js';
import { extractStreamUrl } from './extractor.js';
import { setChannels, state } from './store.js';
import { createLogger } from './logger.js';

export function createScheduler({ config, logger }) {
  const log = logger || createLogger(config.logLevel);

  async function runOnce() {
    if (state.scraping) return;
    state.scraping = true;
    try {
      log.info('scraping listing', config.vipboxUrl);
      const links = await scrapeListing(config.vipboxUrl, fetch, config.userAgent);
      log.info('found', links.length, 'F1 links');
      const channels = [];
      for (const link of links) {
        let stream = null;
        let error = null;
        try {
          stream = await extractStreamUrl(link.url, { userAgent: config.userAgent, logger: log });
        } catch (e) {
          error = e.message;
        }
        channels.push({
          id: link.id,
          title: link.title,
          url: link.url,
          streamUrl: stream?.url || null,
          type: stream?.type || null,
          referer: stream?.referer || link.url,
          extractedAt: new Date().toISOString(),
          error,
        });
        log.info('extracted', link.id, stream?.url || 'NONE');
      }
      setChannels(channels);
      state.lastScrape = new Date().toISOString();
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
