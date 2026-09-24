#!/bin/bash
# Step 2 of the MLINO API setup (D-75..D-78): Core writes through Prisma, notifications, auto-reply facts.
# Idempotent. Prints no secret.
set -euo pipefail
ADMIN_USER=$(grep -E '^POSTGRES_USER=' /etc/mlino/core-db.env | cut -d= -f2)
psql_admin() { docker exec -i mlino-core-db psql -v ON_ERROR_STOP=1 -U "$ADMIN_USER" -d "$1" -tA; }
ENV=/etc/mlino/api.env
DBPASS=$(grep -E '^CORE_DATABASE_URL=' "$ENV" | sed -E 's#.*mlino_api:([^@]+)@.*#\1#')
add() { grep -q "^$1=" "$ENV" || { umask 077; echo "$1=$2" >> "$ENV"; echo "added $1"; }; }

# 1. environment: Prisma URL (same least-privilege role), notification DB, published catalog, VAPID keys
add DATABASE_URL "postgresql://mlino_api:${DBPASS}@127.0.0.1:5440/mlino_demo"
add NOTIFY_DATABASE_URL "postgresql://mlino_api:${DBPASS}@127.0.0.1:5440/mlino_notify"
add CATALOG_PATH /var/www/mlino-public-export/public-catalog.v1.json
add VAPID_SUBJECT https://explore.mlino.site
if ! grep -q '^VAPID_PRIVATE_KEY=' "$ENV"; then
  KEYS=$(cd /opt/mlino/core && node -e "const k=require('web-push').generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey)")
  umask 077
  echo "VAPID_PUBLIC_KEY=${KEYS%% *}" >> "$ENV"
  echo "VAPID_PRIVATE_KEY=${KEYS##* }" >> "$ENV"
  echo "added VAPID keys"
fi
chmod 600 "$ENV"

# 2. notification database, owned by the API role
if [ -z "$(psql_admin postgres <<<"SELECT 1 FROM pg_database WHERE datname = 'mlino_notify'")" ]; then
  psql_admin postgres <<<"CREATE DATABASE mlino_notify OWNER mlino_api" >/dev/null
  echo "mlino_notify created"
fi
psql_admin mlino_notify <<<"GRANT ALL ON SCHEMA public TO mlino_api" >/dev/null

# 3. Core privileges for the panel's writes (offers, publication, plans). Projection triggers run as the
#    invoker, so the tables they update need UPDATE; FOR UPDATE on organizations needs UPDATE too.
psql_admin mlino_demo <<'SQL' >/dev/null
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mlino_api;
GRANT INSERT, UPDATE ON offers, offer_versions, publications, organization_plans TO mlino_api;
GRANT UPDATE ON organizations, business_profiles, capabilities, catalog_items TO mlino_api;
SQL
echo "grants ok"

# 4. the service now runs from the Core build (Prisma + Core services)
sed -i 's#^ExecStart=.*#ExecStart=/usr/bin/node /opt/mlino/core/dist/http/api/main.js#' /etc/systemd/system/mlino-api.service
grep -q '^WorkingDirectory=' /etc/systemd/system/mlino-api.service || sed -i 's#^\[Service\]#[Service]\nWorkingDirectory=/opt/mlino/core#' /etc/systemd/system/mlino-api.service
systemctl daemon-reload
echo "setup-2 ok"
