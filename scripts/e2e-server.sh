#!/usr/bin/env bash
# Build and serve the production bundle against the seeded test database for Playwright.
set -euo pipefail
export DATABASE_URL="${TEST_DATABASE_URL:-postgres://spiti:spitipass@localhost:5434/spiti_test}"
export PUBLIC_SITE_URL="${E2E_SITE_URL:-http://127.0.0.1:4400}"
export SESSION_SECRET="${SESSION_SECRET:-e2e-only-session-secret-000000000000000}"
export BUSINESS_WHATSAPP_NUMBER="${E2E_WHATSAPP_NUMBER:-}"
pnpm -s db:migrate
pnpm -s db:seed
pnpm -s build > /dev/null
PORT=4400 HOST=127.0.0.1 exec node ./dist/server/entry.mjs
