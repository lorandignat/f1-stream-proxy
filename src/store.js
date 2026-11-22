// In-memory channel store shared across modules.
export const state = {
  channels: [], // { id, title, url (stream page), streamUrl, type, referer, extractedAt, error }
  lastScrape: null,
  scraping: false,
};

export function setChannels(chs) { state.channels = chs; }
export function getChannels() { return state.channels; }
export function findChannel(id) { return state.channels.find((c) => c.id === id); }
