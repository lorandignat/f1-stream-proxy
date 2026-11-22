export function buildPlaylist(channels, origin) {
  const lines = ['#EXTM3U'];
  for (const ch of channels) {
    const name = (ch.title || ch.id).replace(/[\r\n]/g, ' ');
    const attrs = [`tvg-id="${ch.id}"`, `tvg-name="${name}"`];
    if (ch.logo) attrs.push(`tvg-logo="${ch.logo}"`);
    if (ch.group) attrs.push(`group-title="${ch.group}"`);
    if (ch.description) attrs.push(`tvg-description="${String(ch.description).replace(/"/g, "'")}"`);
    lines.push(`#EXTINF:-1 ${attrs.join(' ')},${name}`);
    lines.push(`${origin}/stream/${encodeURIComponent(ch.id)}/playlist.m3u8`);
  }
  return lines.join('\n') + '\n';
}
