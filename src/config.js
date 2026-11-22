import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 8080),
  scrapeIntervalMin: Number(process.env.SCRAPE_INTERVAL_MIN || 15),
  vipboxUrl: process.env.VIPBOX_URL || 'https://vipbox1.com/moto_gp',
  cacheTtlSec: Number(process.env.CACHE_TTL_SEC || 300),
  segmentCacheMax: Number(process.env.SEGMENT_CACHE_MAX || 64),
  logLevel: process.env.LOG_LEVEL || 'info',
  userAgent:
    process.env.USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  publicUrl: process.env.PUBLIC_URL || null,
};
