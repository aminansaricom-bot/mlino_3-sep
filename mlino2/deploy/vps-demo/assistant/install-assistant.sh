#!/usr/bin/env bash
# Installs the V2 assistant gateway on the demo VPS. Run as root ON THE VPS, only after the owner has:
#   1. approved sending search text and the entry-page conversation to CodeCraft for the demo (U-G1), and
#   2. put the CodeCraft key(s) in /etc/mlino/assistant-keys.txt (root:root, mode 600; lines starting with cc_).
# The gateway files (server.mjs, assistantCore.mjs) must already be in /tmp/mlino-assistant/.
# The key is never printed: this script only checks that the file exists and has the right mode.
set -euo pipefail

KEYS=/etc/mlino/assistant-keys.txt
SRC=/tmp/mlino-assistant
DEST=/opt/mlino/assistant
CADDY=/etc/caddy/Caddyfile

[ -f "$KEYS" ] || { echo "missing $KEYS (the owner places the key there)"; exit 1; }
[ "$(stat -c %a "$KEYS")" = "600" ] || { echo "$KEYS must be mode 600"; exit 1; }
grep -q '^cc_' "$KEYS" || { echo "$KEYS has no cc_ key line"; exit 1; }
[ -f "$SRC/server.mjs" ] && [ -f "$SRC/assistantCore.mjs" ] || { echo "copy the gateway files to $SRC first"; exit 1; }

install -d -m 755 "$DEST"
install -m 644 "$SRC/server.mjs" "$SRC/assistantCore.mjs" "$DEST/"
install -m 644 "$(dirname "$0")/mlino-assistant.service" /etc/systemd/system/mlino-assistant.service
systemctl daemon-reload
systemctl enable --now mlino-assistant
sleep 2
curl -fsS http://127.0.0.1:8787/assistant/health >/dev/null && echo "gateway healthy"

# Route explore.mlino.site/assistant/* to the gateway (it answers 404 until now).
cp "$CADDY" "$CADDY.bak.mlino-assistant.$(date +%s)"
python3 - "$CADDY" <<'PY'
import re, sys
p = sys.argv[1]; t = open(p, encoding='utf-8').read()
site = t.index('explore.mlino.site {')
block = re.compile(r'handle /assistant/\* \{\s*respond 404\s*\}')
m = block.search(t, site)
if not m: sys.exit('assistant block not found in explore.mlino.site')
t = t[:m.start()] + 'handle /assistant/* {\n        reverse_proxy 127.0.0.1:8787\n    }' + t[m.end():]
# The entry page (app.mlino.site) talks to the same gateway at /assistant/guide; everything else stays the static page.
app = t.index('app.mlino.site {')
spa = '    try_files {path} /index.html\n    file_server\n'
at = t.find(spa, app)
if at < 0: sys.exit('app.mlino.site static block not found')
if t.find('handle /assistant/guide', app, at + len(spa) + 400) < 0:
    t = (t[:at] + '    handle /assistant/guide {\n        reverse_proxy 127.0.0.1:8787\n    }\n'
         + '    handle {\n        try_files {path} /index.html\n        file_server\n    }\n' + t[at + len(spa):])
open(p, 'w', encoding='utf-8').write(t)
PY
caddy validate --config "$CADDY" --adapter caddyfile >/dev/null
systemctl reload caddy
echo "assistant routed (explore /assistant/*, app /assistant/guide); rebuild V2 with VITE_ASSISTANT_REMOTE=1 to use it in the app"
