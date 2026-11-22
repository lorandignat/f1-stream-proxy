#!/usr/bin/env bash
# Copy the OMV compose file to a remote host over SSH.
#
# Usage:
#   ./copy-to-omv.sh root@192.168.1.10
#   ./copy-to-omv.sh root@192.168.1.10 /root/compose/f1-stream-proxy/docker-compose.yml
#
set -euo pipefail

TARGET="${1:?Usage: $0 user@host [remote_path]}"
REMOTE_PATH="${2:-/root/f1-stream-proxy/docker-compose.yml}"

ssh "$TARGET" "mkdir -p \"\$(dirname '$REMOTE_PATH')\""

ssh "$TARGET" "cat > '$REMOTE_PATH'" <<'YAML'
services:
  f1-stream-proxy:
    image: ghcr.io/lorandignat/f1-stream-proxy:latest
    container_name: f1-stream-proxy
    ports:
      - "9080:9080"
    environment:
      - PORT=9080
      - SCRAPE_INTERVAL_MIN=15
      - VIPBOX_URL=https://vipbox1.com/moto_gp
      - CACHE_TTL_SEC=300
      - SEGMENT_CACHE_MAX=64
      - LOG_LEVEL=info
      - PUBLIC_URL=
    restart: unless-stopped
YAML

echo "Written to $TARGET:$REMOTE_PATH"
echo "Then on the host: cd \$(dirname '$REMOTE_PATH') && docker compose up -d"
EOF
chmod +x /tmp/opencode/deploy/copy-to-omv.sh