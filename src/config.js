import 'dotenv/config';

const DEFAULT_SOURCES = 'vipbox:https://vipbox1.com/moto_gp,gkstreams:https://gkstreams.top/Formula/';

function parseSources(str) {
  const out = [];
  for (const part of (str || '').split(',')) {
    const t = part.trim();
    if (!t) continue;
    const idx = t.indexOf(':');
    if (idx < 0) { out.push({ type: 'vipbox', url: t }); continue; }
    const type = t.slice(0, idx).trim().toLowerCase();
    const url = t.slice(idx + 1).trim();
    if (url) out.push({ type, url });
  }
  return out.length ? out : parseSources(DEFAULT_SOURCES);
}

export const config = {
  port: Number(process.env.PORT || 9080),
  scrapeIntervalMin: Number(process.env.SCRAPE_INTERVAL_MIN || 15),
  sources: parseSources(process.env.SOURCES || DEFAULT_SOURCES),
  cacheTtlSec: Number(process.env.CACHE_TTL_SEC || 300),
  segmentCacheMax: Number(process.env.SEGMENT_CACHE_MAX || 64),
  logLevel: process.env.LOG_LEVEL || 'info',
  userAgent:
    process.env.USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  publicUrl: process.env.PUBLIC_URL || null,
  scheduleApi: process.env.SCHEDULE_API || 'https://api.jolpi.ca/ergast/f1/current.json',
};
