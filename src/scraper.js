import * as cheerio from 'cheerio';

/**
 * Parse a vipbox listing page HTML and return F1/motorsport stream-page links.
 * Each item: { id, title, url, logo, group, description, referer, scheduleStart, scheduleEnd }
 */
export function parseListing(html, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();
  let currentEvent = '';
  let currentTime = '';

  // Walk all elements in document order
  const walk = (node) => {
    // Track headings / bold text as current event
    const tag = (node.tagName || '').toLowerCase();
    const text = $(node).text().trim();
    if (/^h[1-6]$/.test(tag) || tag === 'b' || tag === 'strong') {
      const m = text.match(/(\d{1,2}:\d{2})\s+(.+)/);
      if (m) { currentTime = m[1]; currentEvent = m[2].trim(); }
      else if (/formula|moto|nascar|indycar|grand prix|motor/i.test(text)) { currentEvent = text; }
    }
    if (tag === 'a') {
      const href = $(node).attr('href');
      if (href) {
        let url;
        try { url = new URL(href, baseUrl).href; } catch { url = null; }
        if (url && /\/moto_gp\//i.test(url)) {
          const norm = (text + ' ' + url).toLowerCase().replace(/[\s_\-]+/g, '');
          const isMotor = /formula|f1|grandprix|motor|moto|nascar|indycar/.test(norm);
          if (isMotor && !seen.has(url)) {
            seen.add(url);
            const slug = url.split('?')[0].split('/').pop() || '';
            const eventSlug = slug.replace(/^notch-[a-z0-9]+-/i, '');
            const eventName = eventSlug
              ? eventSlug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
              : '';
            const baseEvent = currentEvent || eventName;
            const niceTitle = baseEvent && text ? `${baseEvent} - ${text}` : (text || baseEvent || slug);
            items.push({
              id: slugId(url),
              title: niceTitle,
              url,
              logo: '',
              group: 'Motorsport',
              description: niceTitle,
              referer: url,
              scheduleStart: currentTime || '',
              scheduleEnd: '',
            });
          }
        }
      }
    }
    // recurse
    $(node).children().each((_, c) => walk(c));
  };
  walk($('body')[0] || $.root()[0]);

  // If walk found nothing (cheerio body issue), fall back to simple scan
  if (items.length === 0) {
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (!href) return;
      let url;
      try { url = new URL(href, baseUrl).href; } catch { return; }
      if (!/\/moto_gp\//i.test(url)) return;
      const norm = (text + ' ' + url).toLowerCase().replace(/[\s_\-]+/g, '');
      if (!/formula|f1|grandprix|motor|moto|nascar|indycar/.test(norm)) return;
      if (seen.has(url)) return;
      seen.add(url);
      const slug = url.split('?')[0].split('/').pop() || '';
      const eventSlug = slug.replace(/^notch-[a-z0-9]+-/i, '');
      const eventName = eventSlug ? eventSlug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ') : '';
      items.push({ id: slugId(url), title: text ? `${eventName} - ${text}` : (eventName || slugId(url)), url, logo: '', group: 'Motorsport', description: text || slugId(url), referer: url, scheduleStart: '', scheduleEnd: '' });
    });
  }
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
