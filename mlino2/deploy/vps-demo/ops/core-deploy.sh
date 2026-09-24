#!/bin/bash
# Deploy the Core build (plans, radius offers, API from Core). Backup first; prints no secret.
set -euo pipefail
TS=$(date +%s)
cd /opt/mlino
systemctl stop mlino-export.timer mlino-api
cp -a core "core.bak-$TS"
echo "backup: /opt/mlino/core.bak-$TS"
rm -rf /tmp/core-new && mkdir /tmp/core-new && tar -C /tmp/core-new -xzf /tmp/core.tgz
rm -rf core/dist core/prisma/migrations
cp -a /tmp/core-new/dist core/dist
cp -a /tmp/core-new/prisma/schema.prisma core/prisma/schema.prisma
cp -a /tmp/core-new/prisma/migrations core/prisma/migrations
cp /tmp/core-new/package.json /tmp/core-new/package-lock.json core/
cd core
npm ci --no-audit --no-fund 2>&1 | tail -2
ADMIN_URL=$(grep -E '^DATABASE_URL=' /etc/mlino/core.env | cut -d= -f2- | tr -d "\"'")
DATABASE_URL="$ADMIN_URL" npx prisma migrate deploy 2>&1 | grep -E "applied|migrations|Error" | tail -3
DATABASE_URL="$ADMIN_URL" npx prisma generate 2>&1 | grep -E "Generated|Error" | tail -1
chmod -R a+rX /opt/mlino/core
echo "core deployed"
