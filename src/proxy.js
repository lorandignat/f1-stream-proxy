import { LruCache } from './cache.js';

export function createProxy({ segmentCacheMax, userAgent, logger }) {
  const segCache = new LruCache(segmentCacheMax);
  const headersFor = (referer) => ({
    'User-Agent': userAgent,
    Referer: referer || '',
    Accept: '*/*',
  });

  async function fetchUpstream(url, referer) {
    const res = await fetch(url, { headers: headersFor(referer) });
    if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`);
    return res;
  }

  function isM3u8(text, contentType) {
    if (contentType && /mpegurl|m3u8/i.test(contentType)) return true;
    return /#EXTM3U|#EXTINF/.test(text.slice(0, 200));
  }

  function resolveUrl(u, base) {
    try { return new URL(u, base).href; } catch { return u; }
  }

  function rewriteM3u8(text, baseUrl, id, origin) {
    const lines = text.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        // rewrite URI="..." attributes inside tags
        out.push(line.replace(/URI="([^"]+)"/g, (_, u) => {
          const abs = resolveUrl(u, baseUrl);
          return `URI="${origin}/stream/${id}/fetch?u=${encodeURIComponent(abs)}"`;
        }));
        continue;
      }
      const abs = resolveUrl(trimmed, baseUrl);
      out.push(`${origin}/stream/${id}/fetch?u=${encodeURIComponent(abs)}`);
    }
    return out.join('\n');
  }

  async function fetchPlaylist(upstreamUrl, referer, id, origin) {
    const res = await fetchUpstream(upstreamUrl, referer);
    const text = await res.text();
    const ct = res.headers.get('content-type') || '';
    if (!isM3u8(text, ct)) {
      // not a playlist; return as-is wrapped
      return { text, contentType: ct || 'application/octet-stream', rewritten: false };
    }
    const rewritten = rewriteM3u8(text, upstreamUrl, id, origin);
    return { text: rewritten, contentType: 'application/vnd.apple.mpegurl', rewritten: true };
  }

  async function fetchSegment(url, referer) {
    const cached = segCache.get(url);
    if (cached) return cached;
    const res = await fetchUpstream(url, referer);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const item = { buf, contentType };
    segCache.set(url, item);
    return item;
  }

  async function fetchResource(url, referer, id, origin) {
    // Decide by fetching; cache segments
    // First try as text to detect m3u8 without consuming? We'll fetch bytes then detect.
    const cached = segCache.get(url);
    let buf, contentType;
    if (cached) {
      buf = cached.buf; contentType = cached.contentType;
    } else {
      const res = await fetchUpstream(url, referer);
      buf = Buffer.from(await res.arrayBuffer());
      contentType = res.headers.get('content-type') || 'application/octet-stream';
      if (!/mpegurl|m3u8/i.test(contentType) && !/#EXTM3U/.test(buf.toString('utf8', 0, 200))) {
        segCache.set(url, { buf, contentType });
      }
    }
    const text = buf.toString('utf8');
    if (isM3u8(text, contentType)) {
      const rewritten = rewriteM3u8(text, url, id, origin);
      return { kind: 'm3u8', body: rewritten, contentType: 'application/vnd.apple.mpegurl' };
    }
    return { kind: 'binary', body: buf, contentType };
  }

  return { fetchPlaylist, fetchSegment, fetchResource, segCache, headersFor };
}
