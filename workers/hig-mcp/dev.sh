#!/bin/bash
# helper script for wrangler commands

set -e

case "$1" in
  dev)
    echo "starting local dev server..."
    npx wrangler dev
    ;;
  deploy)
    echo "deploying to cloudflare..."
    npx wrangler deploy
    ;;
  tail)
    echo "tailing worker logs..."
    npx wrangler tail
    ;;
  upload)
    echo "uploading content to kv..."
    npm run upload-content
    ;;
  kv-list)
    echo "listing kv keys..."
    npx wrangler kv key list --binding=CONTENT_KV
    ;;
  test)
    echo "testing health endpoint..."
    curl -s http://localhost:8787/health | jq .
    ;;
  *)
    echo "usage: ./dev.sh <command>"
    echo ""
    echo "commands:"
    echo "  dev      - start local dev server"
    echo "  deploy   - deploy to cloudflare"
    echo "  tail     - tail worker logs"
    echo "  upload   - upload content to kv"
    echo "  kv-list  - list kv keys"
    echo "  test     - test health endpoint (requires dev server running)"
    ;;
esac
