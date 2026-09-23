#!/bin/bash
# One-time setup of the MLINO API on the demo VPS. Idempotent. Prints no secret.
set -euo pipefail
ADMIN_USER=$(grep -E '^POSTGRES_USER=' /etc/mlino/core-db.env | cut -d= -f2)
psql_admin() { docker exec -i mlino-core-db psql -v ON_ERROR_STOP=1 -U "$ADMIN_USER" -d "$1" -tA; }

# 1. secrets (generated here, never printed)
if [ ! -f /etc/mlino/api.env ]; then
  umask 077
  DBPASS=$(openssl rand -hex 24)
  PEPPER=$(openssl rand -base64 32)
  cat > /etc/mlino/api.env <<EOF
CORE_DATABASE_URL=postgresql://mlino_api:${DBPASS}@127.0.0.1:5440/mlino_demo
CHAT_DATABASE_URL=postgresql://mlino_api:${DBPASS}@127.0.0.1:5440/mlino_chat
IDENTITY_PEPPER=${PEPPER}
OTP_DELIVERY=test
API_HOSTS=explore.mlino.site=v2,business.mlino.site=business
PUBLISHED_PATH=/var/www/mlino-public-export/public-business.v1.json
API_PORT=8741
COOKIE_SECURE=1
EOF
  chmod 600 /etc/mlino/api.env
  echo "api.env written"
fi
DBPASS=$(grep -E '^CORE_DATABASE_URL=' /etc/mlino/api.env | sed -E 's#.*mlino_api:([^@]+)@.*#\1#')

# 2. least-privilege role: own identity schema + own chat database; read-only on Core membership tables
psql_admin mlino_demo <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mlino_api') THEN
    CREATE ROLE mlino_api LOGIN PASSWORD '${DBPASS}';
  END IF;
END \$\$;
GRANT CONNECT ON DATABASE mlino_demo TO mlino_api;
GRANT CREATE ON DATABASE mlino_demo TO mlino_api;
CREATE SCHEMA IF NOT EXISTS core_identity AUTHORIZATION mlino_api;
GRANT USAGE ON SCHEMA public TO mlino_api;
GRANT SELECT ON public.organizations, public.memberships, public.permission_grants TO mlino_api;
SQL
if [ -z "$(psql_admin postgres <<<"SELECT 1 FROM pg_database WHERE datname = 'mlino_chat'")" ]; then
  psql_admin postgres <<<"CREATE DATABASE mlino_chat OWNER mlino_api" >/dev/null
  echo "mlino_chat created"
fi
psql_admin mlino_chat <<<"GRANT ALL ON SCHEMA public TO mlino_api" >/dev/null

# 3. service user, code dir, unit
id mlino-api >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin mlino-api
install -d -o root -g root -m 755 /opt/mlino/api
cat > /etc/systemd/system/mlino-api.service <<'UNIT'
[Unit]
Description=MLINO API (Core identity + chat module)
After=network-online.target docker.service
Wants=network-online.target

[Service]
User=mlino-api
Group=mlino-api
EnvironmentFile=/etc/mlino/api.env
ExecStart=/usr/bin/node /opt/mlino/api/mlino-api.cjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
MemoryMax=256M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
echo "setup ok"
