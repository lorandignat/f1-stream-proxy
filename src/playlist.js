export function buildPlaylist(channels, origin) {
  const lines = ['#EXTM3U'];
  for (const ch of channels) {
    const name = (ch.title || ch.id).replace(/[\r\n]/g, ' ');
    lines.push(`#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${name}",${name}`);
    lines.push(`${origin}/stream/${encodeURIComponent(ch.id)}/playlist.m3u8`);
  }
  return lines.join('\n') + '\n';
}
