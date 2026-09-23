#!/usr/bin/env bash
# PostgreSQL + uploads backup with retention, then optional off-site copy.
#   backup-db.sh [label]      (label defaults to "daily"; "pre-deploy" is used by deploy.sh)
# Env: DATABASE_URL, BACKUP_DIR (default /var/backups/spiti-darshan), UPLOAD_DIR,
#      BACKUP_REMOTE (optional rclone remote, e.g. "b2:spiti-backups")
set -euo pipefail
LABEL="${1:-daily}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/spiti-darshan}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly,pre-deploy}
umask 077

DUMP="$BACKUP_DIR/$LABEL/db-$STAMP.dump"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$DUMP"
pg_restore --list "$DUMP" > /dev/null   # fail loudly on a corrupt dump
(cd "$(dirname "$DUMP")" && sha256sum "$(basename "$DUMP")" > "$(basename "$DUMP").sha256")

if [[ -n "${UPLOAD_DIR:-}" && -d "$UPLOAD_DIR" ]]; then
  tar -C "$(dirname "$UPLOAD_DIR")" -czf "$BACKUP_DIR/$LABEL/uploads-$STAMP.tar.gz" "$(basename "$UPLOAD_DIR")"
fi

if [[ "$LABEL" == "daily" ]]; then
  # (if-blocks, not `[[ ]] && cp`: under `set -e` a false test as the last command aborts the script)
  if [[ "$(date -u +%u)" == 7 ]]; then cp "$DUMP" "$BACKUP_DIR/weekly/"; fi
  if [[ "$(date -u +%d)" == 01 ]]; then cp "$DUMP" "$BACKUP_DIR/monthly/"; fi
fi

# Retention: 14 daily, 8 weekly, 12 monthly, 10 pre-deploy.
prune() {
  find "$BACKUP_DIR/$1" -maxdepth 1 -name 'db-*.dump' -printf '%T@ %p\n' | sort -rn | tail -n +$(( $2 + 1 )) |
    while read -r _ f; do rm -f "$f" "$f.sha256"; done
}
prune daily 14; prune weekly 8; prune monthly 12; prune pre-deploy 10
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +14 -delete

if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  rclone copy --quiet "$BACKUP_DIR" "$BACKUP_REMOTE" --exclude 'pre-deploy/**'
fi
echo "backup ok: $DUMP"
