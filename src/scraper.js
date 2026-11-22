import * as cheerio from 'cheerio';

/**
 * Parse a vipbox listing page HTML and return F1 stream-page links.
 * Each item: { id, title, url }
 */
export function parseListing(html, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href) return;
    let url;
    try {
      url = new URL(href, baseUrl).href;
    } catch {
      return;
    }
    // Only vipbox stream pages for moto_gp events
    if (!/\/moto_gp\//i.test(url)) return;
    // F1 detection: text or slug contains "formula"
    const isF1 = /formula/i.test(text) || /formula/i.test(url);
    if (!isF1) return;
    // must carry a stream selector (l= param) OR be a notch link
    if (seen.has(url)) return;
    seen.add(url);
    const id = slugId(url);
    items.push({ id, title: text || id, url, logo: '', group: 'Formula 1', description: text || id, referer: url });
  });
  return items;
}

export async function scrapeListing(url, fetchImpl = fetch, ua) {
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': ua, Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`listing fetch failed: ${res.status}`);
  const html = await res.text();
  return parseListing(html, url);
}

function slugId(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'stream';
    const l = u.searchParams.get('l');
    return l ? `${last}-${l}` : last;
  } catch {
    return url;
  }
}
