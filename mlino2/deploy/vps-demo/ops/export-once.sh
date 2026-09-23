#!/bin/bash
# Builds the signed public files (businesses + catalog) from the demo Core DB. Run every minute by mlino-export.timer.
set -euo pipefail
source /etc/mlino/core.env
cd /opt/mlino/core
DATABASE_URL="$DATABASE_URL" MLINO_EXPORT_OUTPUT_DIR=/var/lib/mlino/public-export MLINO_MEDIA_STORE_DIR=/var/lib/mlino/media-store \
  MLINO_EXPORT_KEY_ID=demo-vps-1 MLINO_EXPORT_KEY_PROVIDER_MODULE=/opt/mlino/keyadapter/demo-key.cjs \
  node dist/public-export/cli.js > /dev/null
# Publish a world-readable copy for the web server: media first (content-addressed, never changes), then the two
# JSON files, each via temp file + rename so a reader never sees a half-written file. Catalog last.
PUB=/var/www/mlino-public-export
mkdir -p "$PUB/media"
cp -rn /var/lib/mlino/public-export/media/. "$PUB/media/"
for f in public-business.v1.json public-catalog.v1.json; do
  cp /var/lib/mlino/public-export/$f "$PUB/.$f.tmp" && chmod 644 "$PUB/.$f.tmp" && mv -f "$PUB/.$f.tmp" "$PUB/$f"
done
find "$PUB/media" -type d -exec chmod 755 {} + ; find "$PUB/media" -type f -exec chmod 644 {} +
