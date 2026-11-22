import { chromium } from 'playwright';

export async function extractStreamUrl(streamPageUrl, opts = {}) {
  const ua = opts.userAgent || 'Mozilla/5.0';
  const logger = opts.logger;
  let browser;
  const found = { m3u8: [], mp4: [], other: [] };
  const allUrls = [];
  const add = (u) => {
    if (!u) return;
    if (/\.m3u8(\?|$)/i.test(u)) found.m3u8.push(u);
    else if (/\.mp4(\?|$)/i.test(u)) found.mp4.push(u);
    else if (/stream|playlist|\.ts(\?|$)/i.test(u)) found.other.push(u);
  };
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({ userAgent: ua });
    // Block ad domains so the player can load without overlays
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (/aclib|adcash|adexchangeclear|velocecdn|popads|popcash|propellerads|doubleclick|googlesyndication|adservice|adnxs|advertising/i.test(url)) {
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('request', (r) => { allUrls.push(r.url()); add(r.url()); });
    page.on('response', (r) => { allUrls.push(r.url()); add(r.url()); });
    page.on('popup', async (p) => { try { await p.close(); } catch {} });
    page.on('requestfailed', (r) => {});

    await page.goto(streamPageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => {
      logger?.warn?.('goto failed', e.message);
    });
    await page.waitForTimeout(2000);

    // Loop for ~30s: dismiss ads, click play, collect
    const start = Date.now();
    while (Date.now() - start < 15000) {
      await page.evaluate(() => {
        try { window.open = () => null; } catch {}
        const kill = (el) => { try { el.remove(); } catch { el.style.display = 'none'; } };
        document.querySelectorAll('[id*="banner"],[class*="banner"],[class*="overlay"],[class*="popup"],[id*="ad"],[class*="ad-"],[id*="aclib"]').forEach(kill);
        document.querySelectorAll('*').forEach((el) => {
          try {
            const st = getComputedStyle(el);
            const z = parseInt(st.zIndex) || 0;
            if (z > 100 && st.position !== 'static' && el.id !== 'player' && !el.closest('#player')) {
              el.style.display = 'none';
            }
          } catch {}
        });
      }).catch(() => {});
      for (const sel of ['button', 'video', '[class*="play"]', '#player', '.player', '[onclick]']) {
        try { await page.click(sel, { timeout: 300 }); } catch {}
      }
      try {
        const els = await page.$$('text=/play/i');
        for (const el of els.slice(0, 5)) { try { await el.click({ timeout: 300 }); } catch {} }
      } catch {}
      try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch {}
      await page.waitForTimeout(2000);
      // check if we already found an m3u8
      if (found.m3u8.length > 0) break;
    }

    // Try to extract stream URL from player APIs (JW Player / Clappr)
    try {
      const fromApi = await page.evaluate(() => {
        const out = [];
        try {
          if (window.jwplayer) {
            const p = window.jwplayer();
            if (p && typeof p.getPlaylist === 'function') {
              const pl = p.getPlaylist();
              if (Array.isArray(pl)) for (const e of pl) { if (e.file) out.push(e.file); if (e.sources) for (const s of e.sources) if (s.file) out.push(s.file); }
            }
            if (p && typeof p.getConfig === 'function') {
              const c = p.getConfig();
              if (c && c.file) out.push(c.file);
              if (c && Array.isArray(c.sources)) for (const s of c.sources) if (s.file) out.push(s.file);
            }
          }
        } catch {}
        try {
          if (window.clappr && window.clappr.core && window.clappr.core.player) {
            // best effort
          }
        } catch {}
        // Scan global vars for m3u8 strings
        try {
          const txt = JSON.stringify(window);
          const rx = /https?:\/\/[^"'\\\s<>]+?\.m3u8[^"'\\\s<>]*/gi;
          let m; while ((m = rx.exec(txt)) !== null) out.push(m[0]);
        } catch {}
        return out;
      });
      if (Array.isArray(fromApi)) for (const u of fromApi) add(u);
    } catch {}

    // Scan rendered DOM/scripts for any m3u8/mp4 URL strings (all frames)
    for (const frame of page.frames()) {
      try {
        const html = await frame.content();
        const rx = /https?:\/\/[^"'\\\s<>]+?\.m3u8[^"'\\\s<>]*/gi;
        let m;
        while ((m = rx.exec(html)) !== null) add(m[0]);
        const rx2 = /https?:\/\/[^"'\\\s<>]+?\.mp4[^"'\\\s<>]*/gi;
        while ((m = rx2.exec(html)) !== null) add(m[0]);
      } catch {}
    }

    // Recursively inspect iframes: collect their src (requests already captured)
    const iframes = await page.$$eval('iframe', (els) => els.map((e) => e.src)).catch(() => []);
    for (const src of iframes) {
      if (!src || src.startsWith('data:')) continue;
      try {
        const p2 = await context.newPage();
        p2.on('request', (r) => { allUrls.push(r.url()); add(r.url()); });
        p2.on('response', (r) => { allUrls.push(r.url()); add(r.url()); });
        await p2.goto(src, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await p2.waitForTimeout(5000);
        await p2.close();
      } catch {}
    }
  } catch (e) {
    logger?.error?.('extract error', e.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  if (!found.m3u8.length && !found.mp4.length) {
    const domains = [...new Set(allUrls.map((u) => { try { return new URL(u).host; } catch { return u; } }))];
    logger?.warn?.('no stream found. captured domains:', domains.slice(0, 20).join(', '));
    logger?.debug?.('all urls:', allUrls.slice(-30).join(' | '));
  }
  const pick = found.m3u8[0] || found.mp4[0] || found.other[0] || null;
  return {
    url: pick,
    type: pick && /\.m3u8/i.test(pick) ? 'hls' : pick && /\.mp4/i.test(pick) ? 'mp4' : 'unknown',
    candidates: found,
    referer: streamPageUrl,
  };
}
