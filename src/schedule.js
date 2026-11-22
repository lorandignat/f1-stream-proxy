const DEFAULT_API = 'https://api.jolpi.ca/ergast/f1/current.json';

export async function fetchSchedule(fetchImpl = fetch, apiUrl = DEFAULT_API) {
  const res = await fetchImpl(apiUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`schedule fetch failed: ${res.status}`);
  const data = await res.json();
  const races = (data && data.MRData && data.MRData.RaceTable && data.MRData.RaceTable.Races) || [];
  return races.map((r) => ({
    round: r.round,
    name: r.raceName,
    circuit: r.Circuit && r.Circuit.circuitName,
    location: r.Circuit && r.Circuit.Location && `${r.Circuit.Location.locality}, ${r.Circuit.Location.country}`,
    date: r.date,
    time: r.time || '00:00:00Z',
    datetime: r.date && r.time ? `${r.date}T${r.time}` : r.date,
    url: r.url,
  }));
}

export function upcomingRaces(races, now = new Date()) {
  return races.filter((r) => {
    const d = new Date(r.datetime);
    return !isNaN(d.getTime()) && d >= new Date(now.getTime() - 6 * 60 * 60 * 1000); // include races in last 6h
  });
}
