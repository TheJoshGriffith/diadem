#!/bin/sh
# Diadem container entrypoint.
#
# Deals with the thing that makes this app awkward to containerise: setup.sh
# hard-links config/config.toml to src/lib/server/config.toml. A bind mount
# over either path does NOT update the other, because hard links cannot span
# a mount. So we resolve config at START time and copy it into both places.
set -e

CONFIG=/app/config/config.toml
LINKED=/app/src/lib/server/config.toml

# A mounted config wins; otherwise fall back to the baked-in example.
if [ -f /config/config.toml ]; then
  echo "[entrypoint] using mounted /config/config.toml"
  cp /config/config.toml "$CONFIG"
elif [ ! -f "$CONFIG" ]; then
  echo "[entrypoint] no config found, seeding from example"
  cp /app/config/config.example.toml "$CONFIG"
fi

# Overlay DIADEM__* environment variables.
node /app/deploy/apply-env.mjs "$CONFIG"

# Copy (not link) into the location the built app reads.
mkdir -p "$(dirname "$LINKED")"
cp "$CONFIG" "$LINKED"

# Optional per-deployment overrides that also live behind the hard-link trick.
[ -f /config/custom.css ] && cp /config/custom.css /app/src/custom.css || true

if [ "${DIADEM_AUTO_MIGRATE:-true}" = "true" ]; then
  echo "[entrypoint] applying internal database migrations"
  node /app/deploy/migrate.mjs
else
  echo "[entrypoint] DIADEM_AUTO_MIGRATE=false, skipping migrations"
fi

echo "[entrypoint] starting diadem on ${HOST:-0.0.0.0}:${PORT:-3000}"
exec "$@"
