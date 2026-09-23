# Backups and restore

**A backup you have never restored is not a backup.** Run a restore verification monthly.

## What is backed up

| Data                                                                                    | How                                                     | Where                                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| PostgreSQL (routes, days, stops, places, media records, SEO, admin users, lead intents) | `pg_dump --format=custom`                               | `/var/backups/spiti-darshan/{daily,weekly,monthly,pre-deploy}/db-*.dump` + `.sha256` |
| Admin-uploaded images (`UPLOAD_DIR`)                                                    | `tar.gz`                                                | same folder, `uploads-*.tar.gz`                                                      |
| Code, migrations, seed, source images                                                   | Git                                                     | GitHub                                                                               |
| Secrets (`/etc/spiti-darshan/env`)                                                      | **Manual**: keep a copy in the owner's password manager | —                                                                                    |

## Schedule and retention

`spiti-darshan-backup.timer` runs `scripts/backup-db.sh daily` at 02:30 every day (`Persistent=true`, so a
missed run happens at boot).

- **Daily**: last 14
- **Weekly**: Sunday's dump, last 8
- **Monthly**: the dump from the 1st, last 12
- **Pre-deploy**: taken by `deploy.sh` before each migration, last 10
- Upload archives: 14 days

Every dump is checked (`pg_restore --list`) and checksummed right after it's written; the script exits non-zero
on any failure, which systemd records (`systemctl status spiti-darshan-backup`).

## Off-server copy

Backups on the same disk don't survive losing the server. Configure an rclone remote once, as the `spiti`
user (`rclone config`), for example Backblaze B2, S3 or Google Drive, then set `BACKUP_REMOTE=<remote>:<bucket>`
in `/etc/spiti-darshan/env`. Each run copies daily, weekly and monthly dumps plus uploads to the remote.

Recommended bucket settings: private, versioning or object lock on, and a lifecycle rule deleting objects
older than 400 days. The server's credentials should be able to write but not delete, where the provider
supports it.

## Restore procedures

### A. Verify a backup (monthly, and after changing the backup setup)

```bash
VERIFY_ADMIN_URL=postgres://postgres@/postgres \
  /srv/spiti-darshan/current/scripts/restore-db.sh --verify /var/backups/spiti-darshan/daily/db-<stamp>.dump
# → "verify ok: 1 published routes, 9 days"
```

This restores into a temporary database, checks there is published content, and drops it again.

### B. Restore production after data loss or a bad change

```bash
systemctl stop spiti-darshan
sudo -u spiti /srv/spiti-darshan/current/scripts/backup-db.sh pre-deploy     # snapshot the current state first
sudo -u spiti /srv/spiti-darshan/current/scripts/restore-db.sh \
  /var/backups/spiti-darshan/daily/db-<stamp>.dump "$DATABASE_URL"            # asks you to type "restore"
cd /srv/spiti-darshan/current && sudo -u spiti bash -lc 'set -a; . /etc/spiti-darshan/env; set +a; pnpm db:migrate && pnpm build'
systemctl start spiti-darshan
```

The restore runs in a single transaction (`--single-transaction --clean --if-exists`), so a failure leaves the
database unchanged. Rebuild afterwards because the homepage is prerendered from the database.

### C. Restore uploads

```bash
tar -C /srv/spiti-darshan/shared -xzf /var/backups/spiti-darshan/daily/uploads-<stamp>.tar.gz
```

### D. Full server loss

1. Provision a new server (docs/DEPLOYMENT.md §1) and restore `/etc/spiti-darshan/env` from the password manager.
2. `rclone copy <remote>:<bucket> /var/backups/spiti-darshan`
3. Create the empty database, then follow **B** and **C** with the newest dump and uploads archive.
4. First release (DEPLOYMENT.md §2) **without** `db:seed`, point DNS at the new server, and let Caddy obtain
   certificates.

Target recovery: **RPO ≤ 24 h** (daily dumps, plus pre-deploy snapshots), **RTO about 1 h**.
