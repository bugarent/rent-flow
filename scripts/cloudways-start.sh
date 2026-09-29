#!/usr/bin/env bash
# Cloudways start command: bash scripts/cloudways-start.sh
#
# Saved JSON and uploads live OUTSIDE the app folder, so a new deploy
# does not delete them. Set RAC_PERSIST_DIR if the default home path is wrong.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

PERSIST="${RAC_PERSIST_DIR:-${HOME}/rentairportcars-persist}"
mkdir -p "$PERSIST/data" "$PERSIST/uploads"

export DATA_DIR="${DATA_DIR:-$PERSIST/data}"
export UPLOAD_DIR="${UPLOAD_DIR:-$PERSIST/uploads}"

# Bring existing in-app files across once. Do not overwrite or delete.
if [ -d "$APP_DIR/.data" ]; then
  cp -an "$APP_DIR/.data/." "$DATA_DIR/" 2>/dev/null || true
fi
# Move the in-app upload folder aside (kept, not deleted) and serve the persistent copy.
if [ -d "$APP_DIR/public/uploads" ] && [ ! -L "$APP_DIR/public/uploads" ]; then
  cp -an "$APP_DIR/public/uploads/." "$UPLOAD_DIR/" 2>/dev/null || true
  if [ -e "$APP_DIR/public/uploads.kept" ]; then
    mv "$APP_DIR/public/uploads" "$APP_DIR/public/uploads.kept.$(date +%s)"
  else
    mv "$APP_DIR/public/uploads" "$APP_DIR/public/uploads.kept"
  fi
fi
ln -sfn "$UPLOAD_DIR" "$APP_DIR/public/uploads"

if [ -n "${DATABASE_URL:-}" ]; then
  npx prisma migrate deploy || echo "WARN: prisma migrate deploy failed; file data is still kept in $DATA_DIR"
else
  echo "WARN: DATABASE_URL is empty; using file stores in $DATA_DIR"
fi

exec npx next start --hostname 0.0.0.0 --port "${PORT:-3000}"
