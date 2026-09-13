#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/bin:/bin"

base="${1:?node_modules path is required}"
for item in '.prisma/client' '@prisma/client' 'prisma' '@prisma/engines'; do
  cd "$base/$item"
  count="$(find . -type f -print0 | tr -cd '\0' | wc -c | tr -d ' ')"
  hash="$(find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
  printf '%s|%s|%s\n' "$item" "$count" "$hash"
done
