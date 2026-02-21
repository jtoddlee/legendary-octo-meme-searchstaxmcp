#!/usr/bin/env bash
set -euo pipefail

IMAGE="searchstax-mcp:dev"
CONTAINER="searchstax-mcp-smoke"
PORT="38080"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}

cleanup
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -p "$PORT:3000" \
  -e SEARCHSTAX_BASE_URL="https://example.com" \
  -e SEARCHSTAX_API_TOKEN="dummy-token" \
  "$IMAGE" >/dev/null

for i in {1..20}; do
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null; then
    echo "Smoke check passed"
    exit 0
  fi
  sleep 1
done

echo "Smoke check failed"
exit 1
