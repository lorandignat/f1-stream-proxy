function xmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toXmltvDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())} +0000`;
}

export function buildEpg(channels, origin) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<tv generator-info-name="f1-stream-proxy">'];
  for (const ch of channels) {
    lines.push(`  <channel id="${xmlEscape(ch.id)}">`);
    lines.push(`    <display-name>${xmlEscape(ch.title)}</display-name>`);
    if (ch.logo) lines.push(`    <icon src="${xmlEscape(ch.logo)}" />`);
    lines.push('  </channel>');
  }
  for (const ch of channels) {
    let start = toXmltvDate(ch.scheduleStart);
    let stop = toXmltvDate(ch.scheduleEnd);
    if (!start) {
      const now = new Date();
      start = toXmltvDate(now.toISOString());
      const end = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      stop = toXmltvDate(end.toISOString());
    }
    if (!stop) {
      const s = new Date(ch.scheduleStart);
      const end = new Date(s.getTime() + 3 * 60 * 60 * 1000);
      stop = toXmltvDate(end.toISOString());
    }
    lines.push(`  <programme start="${start}" stop="${stop}" channel="${xmlEscape(ch.id)}">`);
    lines.push(`    <title>${xmlEscape(ch.title)}</title>`);
    if (ch.description) lines.push(`    <desc>${xmlEscape(ch.description)}</desc>`);
    if (ch.logo) lines.push(`    <icon src="${xmlEscape(ch.logo)}" />`);
    lines.push('  </programme>');
  }
  lines.push('</tv>');
  return lines.join('\n') + '\n';
}
