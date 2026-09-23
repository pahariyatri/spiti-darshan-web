# Deployment (VPS)

A deliberately simple production setup: **one Ubuntu server** running Node, PostgreSQL 16 and Caddy,
managed by systemd. Nothing in the app is tied to this: any host that runs Node 22 and reaches PostgreSQL works
(for managed hosting, set the same environment variables and run the same build and migrate commands).

Sizing: 1–2 vCPU and 2 GB RAM is plenty. Builds use about 1 GB for a few seconds.

## 1. One-time server setup

```bash
# as root
apt update && apt install -y postgresql-16 git curl rclone
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
corepack enable && corepack prepare pnpm@11.2.2 --activate
apt install -y debian-keyring debian-archive-keyring apt-transport-https   # then install Caddy per caddyserver.com/docs/install

adduser --system --group --home /srv/spiti-darshan spiti
mkdir -p /srv/spiti-darshan/{releases,shared/uploads} /etc/spiti-darshan /var/backups/spiti-darshan
chown -R spiti:spiti /srv/spiti-darshan /var/backups/spiti-darshan

# database (local socket; no public port)
sudo -u postgres createuser spiti
sudo -u postgres createdb -O spiti spiti_darshan
sudo -u postgres psql -c "ALTER USER spiti PASSWORD '$(openssl rand -hex 24)';"   # note it for DATABASE_URL
```

`/etc/spiti-darshan/env` (owner `root:spiti`, mode `0640`):

```ini
NODE_ENV=production
DATABASE_URL=postgres://spiti:<password>@127.0.0.1:5432/spiti_darshan
PUBLIC_SITE_URL=https://your-domain.example
BUSINESS_WHATSAPP_NUMBER=            # verified number, digits only
SESSION_SECRET=<openssl rand -base64 48>
UPLOAD_DIR=/srv/spiti-darshan/shared/uploads
TRUST_PROXY=true
BACKUP_REMOTE=                       # e.g. b2:spiti-darshan-backups (see BACKUP_RESTORE.md)
```

The `spiti` user needs a deploy key with read access to the GitHub repo
(`ssh-keygen -t ed25519`, then add it under Repo → Settings → Deploy keys).

Allow the deploy user to restart only this service, with `visudo -f /etc/sudoers.d/spiti`:

```
spiti ALL=(root) NOPASSWD: /bin/systemctl restart spiti-darshan
```

Install units and proxy:

```bash
cp deploy/spiti-darshan.service deploy/spiti-darshan-backup.{service,timer} /etc/systemd/system/
cp deploy/Caddyfile /etc/caddy/Caddyfile          # edit the domain first
systemctl daemon-reload
systemctl enable --now spiti-darshan-backup.timer
systemctl reload caddy                              # obtains the HTTPS certificate automatically
```

HTTPS: Caddy gets and renews Let's Encrypt certificates on its own, as long as DNS A/AAAA records point to the
server and ports 80 and 443 are open. (nginx alternative: `deploy/nginx.conf` + certbot.) Only 22, 80 and 443
should be open (`ufw allow OpenSSH; ufw allow 80,443/tcp; ufw enable`). PostgreSQL listens on localhost only.

## 2. First release

```bash
sudo -u spiti bash -lc '
  git clone git@github.com:pahariyatri/spiti-darshan-web.git /srv/spiti-darshan/releases/initial
  ln -sfn /srv/spiti-darshan/releases/initial /srv/spiti-darshan/current
  cd /srv/spiti-darshan/current
  set -a; . /etc/spiti-darshan/env; set +a
  pnpm install --frozen-lockfile
  pnpm db:migrate
  pnpm db:seed               # only on an empty database
  pnpm build
  pnpm admin:create owner@your-domain.example
'
systemctl enable --now spiti-darshan
curl -I https://your-domain.example/
```

## 3. Every release after that

```bash
git tag v1.1.0 && git push --tags            # from your machine, after CI is green
ssh server 'sudo -u spiti /srv/spiti-darshan/current/deploy/deploy.sh v1.1.0'
```

`deploy.sh` clones the tag into a new release directory, links the shared uploads, installs, takes a
**pre-deploy database backup**, runs `pnpm db:migrate`, builds (prerendering the homepage from the database),
switches the `current` symlink atomically, restarts the service, runs a health check, and keeps the last
five releases.

- **Build command**: `pnpm build` (requires `DATABASE_URL`; it runs `pnpm images` first)
- **Start command**: `node ./dist/server/entry.mjs` with `HOST=127.0.0.1 PORT=4321` (systemd unit)
- **Rollback (code)**: `ln -sfn /srv/spiti-darshan/releases/<previous> /srv/spiti-darshan/current && systemctl restart spiti-darshan`
- **Rollback (data)**: restore the `pre-deploy` dump (docs/BACKUP_RESTORE.md). Migrations are forward-only,
  so prefer backwards-compatible migrations to keep code rollbacks safe.

## 4. Database migration procedure

1. Change `src/lib/db/schema.ts`.
2. `pnpm db:generate --name <what-changed>`, then **read the SQL** in `drizzle/`. Renames can come out as
   drop + add, so hand-edit them into `ALTER … RENAME` if needed.
3. Make it backwards-compatible where you can: add nullable columns, backfill, then tighten in a later release.
4. Commit schema + SQL together. CI fails if they drift.
5. Deploy. `deploy.sh` backs up, then runs `pnpm db:migrate` (each file in a transaction; already-applied files
   are skipped).

Never run `drizzle-kit push` against production.

## 5. Operations

| Task                       | Command                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Logs                       | `journalctl -u spiti-darshan -f` · `/var/log/caddy/spiti-darshan.access.log`                                              |
| Restart                    | `systemctl restart spiti-darshan`                                                                                         |
| Status                     | `systemctl status spiti-darshan`                                                                                          |
| New admin / reset password | `sudo -u spiti bash -lc 'cd /srv/spiti-darshan/current && set -a && . /etc/spiti-darshan/env && pnpm admin:create you@x'` |
| Purge expired sessions     | handled on login; or `psql … -c "delete from admin_sessions where expires_at < now()"`                                    |

Note: if port 4321 is already taken, the Node adapter exits without an error message, and systemd's restart
loop will show in `journalctl`. Check with `ss -ltnp 'sport = :4321'`.

Logging: the app logs errors to stdout/stderr (collected by journald). It logs no request bodies, cookies or
IP addresses. Caddy's access log holds IPs for its rotation window (20 MiB × 10); shorten it if your privacy
policy requires.
