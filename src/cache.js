export class TtlCache {
  constructor(ttlSec) {
    this.ttl = ttlSec * 1000;
    this.map = new Map();
  }
  get(key) {
    const v = this.map.get(key);
    if (!v) return undefined;
    if (Date.now() - v.ts > this.ttl) {
      this.map.delete(key);
      return undefined;
    }
    return v.value;
  }
  set(key, value) {
    this.map.set(key, { value, ts: Date.now() });
  }
  delete(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
  size() { return this.map.size; }
}

export class LruCache {
  constructor(max) {
    this.max = max;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key);
    // move to end (most recent)
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
  }
  has(key) { return this.map.has(key); }
  size() { return this.map.size; }
  clear() { this.map.clear(); }
}
