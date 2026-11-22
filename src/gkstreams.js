const API_URL = 'https://api.reedstreams.link/api/matches/all';

function resolveApiUrl(input) {
  try {
    const u = new URL(input);
    const id = u.searchParams.get('id');
    // specific match page (gkstreams3.click/?id=...) -> filter by id
    if (id) return { apiUrl: API_URL, filterId: id };
    // gkstreams listing page or any gkstreams host -> all formula matches
    if (u.hostname.includes('gkstreams') || u.hostname.includes('reedstreams.link')) {
      return { apiUrl: API_URL, filterId: null };
    }
  } catch {}
  if (input && input.includes('reedstreams.link')) return { apiUrl: input, filterId: null };
  return { apiUrl: API_URL, filterId: null };
}

export async function scrapeGkstreams(fetchImpl = fetch, ua, apiUrl = API_URL) {
  const { apiUrl: url, filterId } = resolveApiUrl(apiUrl);
  const res = await fetchImpl(url, { headers: { 'User-Agent': ua, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`gkstreams api failed: ${res.status}`);
  let data = await res.json();
  if (filterId) data = (data || []).filter((m) => m.id === filterId);
  const out = [];
  for (const m of (data || [])) {
    const title = m.title || m.id;
    const cat = (m.category || '').toLowerCase();
    const league = (m.league && m.league.name) || '';
    const isF1 = cat === 'motor-sports' || /formula|f1|grand prix|motor/i.test(title + ' ' + league + ' ' + cat);
    if (!isF1) continue;
    const logoPath = (m.league && m.league.logo) || m.poster || '';
    const logo = logoPath ? (logoPath.startsWith('http') ? logoPath : `https://api.reedstreams.link${logoPath}`) : '';
    for (const s of (m.sources || [])) {
      if (!s.embedUrl) continue;
      const resMatch = s.name.match(/(HD|SD|4K|FHD)/i) || s.embedUrl.match(/_(\d{3,4})p/i);
      const resolution = resMatch ? (resMatch[1].toUpperCase() === 'HD' ? 'HD' : resMatch[1].toUpperCase() === 'SD' ? 'SD' : resMatch[1]) : '';
      out.push({
        id: s.id || `${m.id}-${s.streamNo}`,
        title: resolution ? `${title} — ${s.name} (${resolution})` : `${title} — ${s.name}`,
        url: s.embedUrl,
        referer: 'https://gkstreams.top/',
        logo,
        group: 'Formula 1',
        description: `${title} (${s.name})`,
        resolution,
      });
    }
  }
  return out;
}
