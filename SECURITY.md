# Security policy

Please report vulnerabilities **privately** via
[GitHub security advisories](https://github.com/pahariyatri/spiti-darshan-web/security/advisories/new),
not in public issues. We aim to acknowledge reports within 3 working days.

In scope: the public site, `/admin`, `/go/whatsapp/`, `/api/event/`, deployment configs in `deploy/`.

Never commit `.env` files, database dumps, uploaded images of customers, or credentials. If a secret is
committed by mistake, rotate it first, then remove it from history.
