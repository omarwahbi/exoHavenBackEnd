#!/bin/sh
# Rebuilds staging's database from the newest production backup, then checks that
# staging boots and serves the catalogue. Run nightly from cron after the backup:
#   30 3 * * * /root/exohaven-staging/refresh-staging.sh > /root/exohaven-staging/refresh.log 2>&1
# A failure here also means the latest backup could not be restored.
set -eu

STAGING_DIR="${STAGING_DIR:-/root/exohaven-staging}"
BACKUP_DIR="${BACKUP_DIR:-/root/database_backups}"
STAGING_URL="${STAGING_URL:-http://127.0.0.1:1338}"

cd "$STAGING_DIR"
. ./.env

BACKUP=$(ls -t "$BACKUP_DIR"/exohaven_backup_*.sql.gz | head -n 1)
echo "$(date -Is) restoring $BACKUP"
gzip -t "$BACKUP"

docker compose up -d postgres
until docker exec exohaven-staging-postgres pg_isready -U "$POSTGRES_USER" -q; do sleep 1; done

# Strapi must not hold connections while the database is replaced.
docker compose stop strapi
docker exec exohaven-staging-postgres psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\"" \
  -c "CREATE DATABASE \"$POSTGRES_DB\""
# Dumps were taken as production's user; --no-owner style restore keeps ownership simple.
gunzip -c "$BACKUP" | sed -E '/^ALTER .* OWNER TO /d' \
  | docker exec -i exohaven-staging-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q > /dev/null

# Staging stores new uploads locally; the container runs as the "node" user (uid 1000).
mkdir -p uploads && chown 1000:1000 uploads

docker compose pull -q strapi || echo "warning: could not pull the image, using the one already on the server"
docker compose up -d strapi

# Wait for Strapi, then check the restored catalogue is served.
i=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' "$STAGING_URL/_health")" = "204" ]; do
  i=$((i + 1)); [ "$i" -gt 90 ] && { echo "staging did not become healthy"; docker compose logs --tail 50 strapi; exit 1; }
  sleep 2
done
ITEMS=$(curl -sfg "$STAGING_URL/api/items?pagination[pageSize]=1" | sed -E 's/.*"total":([0-9]+).*/\1/')
[ "${ITEMS:-0}" -gt 0 ] || { echo "staging serves no items"; exit 1; }
echo "$(date -Is) staging OK: $ITEMS published items from $(basename "$BACKUP")"
