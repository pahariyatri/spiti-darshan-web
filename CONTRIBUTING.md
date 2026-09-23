# Contributing

1. `main` is always deployable. Small, focused commits using
   [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `perf:`).
2. Before pushing: `pnpm format && pnpm lint && pnpm check && pnpm test` (and `pnpm test:e2e` for UI changes).
3. The approved design lives in `reference/original.html`. Public UI changes need before/after screenshots
   (`pnpm visual:capture` + `pnpm visual:compare`).
4. Route content lives in `src/content/`; `pnpm build` validates it and fails on broken references.
5. Don't add business facts (phone, prices, reviews, fleet size, addresses) that the business hasn't verified.
