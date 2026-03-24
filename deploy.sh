#!/bin/bash
# Harbor deploy/update script for OMV and Linux servers.
# Pulls latest code and rebuilds containers. Safe to run repeatedly.
#
# Usage: ./deploy.sh

set -e

cd "$(dirname "$0")"

echo ""
echo "========================================="
echo "  Harbor — Deploy / Update"
echo "========================================="
echo ""

echo "[1/6] Stashing local changes..."
git stash --include-untracked 2>/dev/null && echo "      Local changes stashed." || echo "      No local changes to stash."

echo ""
echo "[2/6] Pulling latest code..."
git pull
echo ""

echo "[3/6] Latest commits:"
echo "      ---"
git log --oneline -3 | sed 's/^/      /'
echo "      ---"
echo ""

echo "[4/6] Stopping containers..."
docker compose down
echo ""

echo "[5/6] Building images (no cache)..."
docker compose build --no-cache
echo ""

echo "[6/6] Starting containers..."
docker compose up -d
echo ""

echo "========================================="
echo "  Harbor is running on port 3113"
echo "========================================="
echo ""
echo "  Check status:  docker compose ps"
echo "  View logs:     docker compose logs -f"
echo "  Restore stash: git stash pop"
echo ""
