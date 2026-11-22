const API_URL = 'https://api.reedstreams.link/api/matches/all';

export async function scrapeGkstreams(fetchImpl = fetch, ua, apiUrl = API_URL) {
  const res = await fetchImpl(apiUrl, { headers: { 'User-Agent': ua, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`gkstreams api failed: ${res.status}`);
  const data = await res.json();
  const out = [];
  for (const m of (data || [])) {
    const title = m.title || m.id;
    const cat = (m.category || '').toLowerCase();
    const league = (m.league && m.league.name) || '';
    const isF1 = cat === 'motor-sports' || /formula|f1|grand prix|motor/i.test(title + ' ' + league + ' ' + cat);
    if (!isF1) continue;
    for (const s of (m.sources || [])) {
      if (!s.embedUrl) continue;
      out.push({
        id: s.id || `${m.id}-${s.streamNo}`,
        title: `${title} — ${s.name}`,
        url: s.embedUrl,
        referer: s.embedUrl,
      });
    }
  }
  return out;
}
