# F1 Stream Proxy

Scrape vipbox1.com/moto_gp for F1 links, extract the upstream video stream, and
re-serve it ad-free and buffered to Jellyfin via an M3U playlist.

| | |
| --- | --- |
| **Status** | build |
| **Phase** | build |
| **Platform** | Linux container (Docker Compose) |
| **v1** | in progress |

## What it is

A small Node.js service that runs in Docker. It periodically scrapes the vipbox
motorsports page for Formula 1 links, uses a headless browser to extract the
underlying stream URL (preferring HLS/m3u8), and re-serves the stream through a
caching proxy. It exposes an M3U playlist that Jellyfin can consume as a Live TV
source, plus a health endpoint.

## Running it

```sh
# configure (optional)
cp .env.example .env

# build and run
docker compose up -d --build

# health
curl http://localhost:9080/healthz

# playlist (add this URL in Jellyfin -> Live TV -> Tuner)
curl http://localhost:9080/playlist.m3u
```

## Layout

```
src/        application source
test/       node:test tests
Dockerfile  container image (Playwright base)
docker-compose.yml
```

## Configuration (env)

| Var | Default | Meaning |
| --- | --- | --- |
| PORT | 9080 | HTTP port |
| SCRAPE_INTERVAL_MIN | 15 | minutes between listing scrapes |
| VIPBOX_URL | https://vipbox1.com/moto_gp | listing URL |
| CACHE_TTL_SEC | 300 | stream URL cache TTL |
| SEGMENT_CACHE_MAX | 64 | max cached segments |
| LOG_LEVEL | info | debug/info/warn/error |

## Decisions and questions

- Decisions: docs/DECISIONS.md
- Questions: docs/QUESTIONS.md
- Design: docs/DESIGN.md
