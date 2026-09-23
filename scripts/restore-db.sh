#!/usr/bin/env bash
# Restore a pg_dump custom-format file.
#   restore-db.sh <dump> <target DATABASE_URL>           restore (DESTRUCTIVE for the target)
#   restore-db.sh --verify <dump>                        restore into a throwaway DB and sanity-check
set -euo pipefail
if [[ "${1:-}" == "--verify" ]]; then
  DUMP="${2:?dump file}"
  ADMIN_URL="${VERIFY_ADMIN_URL:?set VERIFY_ADMIN_URL to a role that can CREATE DATABASE}"
  NAME="restore_verify_$(date +%s)"
  psql "$ADMIN_URL" -qc "create database $NAME"
  trap 'psql "$ADMIN_URL" -qc "drop database if exists $NAME"' EXIT
  TARGET="${ADMIN_URL%/*}/$NAME"
  pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET" "$DUMP"
  ROUTES=$(psql "$TARGET" -Atc "select count(*) from routes where status = 'published'")
  DAYS=$(psql "$TARGET" -Atc "select count(*) from route_days")
  echo "verify ok: $ROUTES published routes, $DAYS days"
  [[ "$ROUTES" -gt 0 ]]
  exit 0
fi
DUMP="${1:?usage: restore-db.sh <dump> <target DATABASE_URL>}"
TARGET="${2:?target DATABASE_URL}"
if [[ -f "$DUMP.sha256" ]]; then (cd "$(dirname "$DUMP")" && sha256sum -c "$(basename "$DUMP").sha256"); fi
read -r -p "This REPLACES data in $(sed -E 's#//[^@]*@#//***@#' <<< "$TARGET"). Type 'restore' to continue: " ok
[[ "$ok" == "restore" ]] || exit 1
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --single-transaction --dbname="$TARGET" "$DUMP"
echo "restored. Now: run pnpm db:migrate (if the dump predates the code), rebuild, restart."
