#!/usr/bin/env bash
# Zero-surprise release: build into a new directory, migrate, switch symlink, restart.
#   sudo -u spiti /srv/spiti-darshan/current/deploy/deploy.sh v1.2.0
set -euo pipefail
REF="${1:?usage: deploy.sh <git tag or commit>}"
ROOT=/srv/spiti-darshan
REPO="${REPO:-git@github.com:pahariyatri/spiti-darshan-web.git}"
RELEASE="$ROOT/releases/$(date +%Y%m%d%H%M%S)-${REF//\//-}"

# The env file only exists on the server.
set -a
# shellcheck disable=SC1091
source /etc/spiti-darshan/env
set +a
export NODE_ENV=production

git clone --quiet "$REPO" "$RELEASE"
git -C "$RELEASE" checkout --quiet "$REF"
cd "$RELEASE"
ln -sfn "$ROOT/shared/uploads" uploads
pnpm install --frozen-lockfile --prod=false
"$ROOT/current/scripts/backup-db.sh" pre-deploy || echo "WARN: pre-deploy backup failed"
pnpm db:migrate          # forward-only, transactional per migration
pnpm build               # prerenders the homepage from the database
ln -sfn "$RELEASE" "$ROOT/current.new" && mv -T "$ROOT/current.new" "$ROOT/current"
sudo systemctl restart spiti-darshan
sleep 2
curl -fsS -o /dev/null "http://127.0.0.1:4321/robots.txt" && echo "deployed $REF"
# Keep the last 5 releases for rollback.
find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf
