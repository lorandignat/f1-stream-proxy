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
    // Motorsport detection: formula, f1, grand prix, motor, moto, nascar, indycar
    const norm = (text + ' ' + url).toLowerCase().replace(/[\s_\-]+/g, '');
    const isMotor = /formula|f1|grandprix|motor|moto|nascar|indycar/.test(norm);
    if (!isMotor) return;
    // must carry a stream selector (l= param) OR be a notch link
    if (seen.has(url)) return;
    seen.add(url);
    const id = slugId(url);
    const slug = url.split('?')[0].split('/').pop() || '';
    const eventSlug = slug.replace(/^notch-[a-z0-9]+-/i, '');
    const eventName = eventSlug
      ? eventSlug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
      : '';
    const niceTitle = eventName && text ? `${eventName} - ${text}` : (text || eventName || id);
    items.push({ id, title: niceTitle, url, logo: '', group: 'Motorsport', description: niceTitle, referer: url });
  });
  return items;
}

export async function scrapeListing(url, fetchImpl = fetch, ua) {
  const fetchAndParse = async (u) => {
    const res = await fetchImpl(u, { headers: { 'User-Agent': ua, Accept: 'text/html' } });
    if (!res.ok) throw new Error(`listing fetch failed: ${res.status}`);
    const html = await res.text();
    return parseListing(html, u);
  };
  let items = await fetchAndParse(url);
  // If no F1 links found and url doesn't already target moto_gp, try /moto_gp
  if (items.length === 0 && !/\/moto_gp\/?$/i.test(url)) {
    try {
      const fallback = url.replace(/\/+$/, '') + '/moto_gp';
      const more = await fetchAndParse(fallback);
      if (more.length > 0) items = more;
    } catch {}
  }
  return items;
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
