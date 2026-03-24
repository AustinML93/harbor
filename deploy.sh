#!/bin/bash
# Harbor deploy/update script
# Pulls latest code and rebuilds containers. Safe to run repeatedly.
#
# Usage: ./deploy.sh
#        ./deploy.sh --cache   # skip --no-cache for faster rebuilds

set -e

cd "$(dirname "$0")"

echo "==> Stashing local changes..."
git stash --include-untracked 2>/dev/null || true

echo "==> Pulling latest code..."
git pull

echo "==> Restoring local changes..."
git stash pop 2>/dev/null || true

echo "==> Stopping containers..."
docker compose down

BUILD_FLAGS=""
if [ "$1" != "--cache" ]; then
  BUILD_FLAGS="--no-cache"
fi

echo "==> Building images${BUILD_FLAGS:+ (no cache)}..."
docker compose build $BUILD_FLAGS

echo "==> Starting containers..."
docker compose up -d

echo "==> Done. Harbor is starting on port 3113."
echo "    Check status: docker compose ps"
echo "    View logs:    docker compose logs -f"
