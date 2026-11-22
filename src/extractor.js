import { chromium } from 'playwright';

export async function extractStreamUrl(streamPageUrl, opts = {}) {
  const ua = opts.userAgent || 'Mozilla/5.0';
  const logger = opts.logger;
  let browser;
  const found = { m3u8: [], mp4: [], other: [] };
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
    const page = await context.newPage();
    page.on('request', (r) => add(r.url()));
    page.on('response', (r) => add(r.url()));
    page.on('requestfailed', (r) => {});

    await page.goto(streamPageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => {
      logger?.warn?.('goto failed', e.message);
    });
    await page.waitForTimeout(3000);

    // Try to dismiss overlays
    await page.evaluate(() => {
      document.querySelectorAll('[id*="banner"],[class*="banner"],[class*="overlay"],[class*="popup"],[id*="ad"]').forEach((e) => {
        e.style.display = 'none';
      });
    }).catch(() => {});

    // Click play-like elements and center
    const playSelectors = ['button', 'video', '[class*="play"]', '#player', '.player', '[onclick]', 'a'];
    for (const sel of playSelectors) {
      try { await page.click(sel, { timeout: 500 }); } catch {}
    }
    try {
      const vp = page.viewportSize() || { width: 1280, height: 720 };
      await page.mouse.click(vp.width / 2, vp.height / 2);
    } catch {}
    // Click any element whose text mentions play
    try {
      const els = await page.$$('text=/play/i');
      for (const el of els.slice(0, 5)) { try { await el.click({ timeout: 500 }); } catch {} }
    } catch {}

    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
    await page.waitForTimeout(8000);

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
        p2.on('request', (r) => add(r.url()));
        p2.on('response', (r) => add(r.url()));
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

  const pick = found.m3u8[0] || found.mp4[0] || found.other[0] || null;
  return {
    url: pick,
    type: pick && /\.m3u8/i.test(pick) ? 'hls' : pick && /\.mp4/i.test(pick) ? 'mp4' : 'unknown',
    candidates: found,
    referer: streamPageUrl,
  };
}
