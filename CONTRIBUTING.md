# Contributing

1. `main` is always deployable; Vercel deploys every push. Use small commits with
   [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`).
2. Before pushing: `pnpm format && pnpm lint && pnpm check && pnpm test`, plus `pnpm test:e2e` for UI changes.
3. Routes and places live in `src/content/`. `pnpm build` validates them and fails on broken references.
4. Don't add business facts (prices, reviews, fleet size, addresses) that the business hasn't verified.
