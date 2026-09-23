import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const alias = {
  'astro:actions': fileURLToPath(new URL('./tests/stubs/astro-actions.ts', import.meta.url)),
};
const TEST_DB =
  process.env.TEST_DATABASE_URL ?? 'postgres://spiti:spitipass@localhost:5434/spiti_test';

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          env: { SESSION_SECRET: 'unit-test-secret-unit-test-secret-0000', NODE_ENV: 'test' },
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          globalSetup: ['tests/integration/global-setup.ts'],
          env: {
            DATABASE_URL: TEST_DB,
            SESSION_SECRET: 'integration-test-secret-0000000000000',
            NODE_ENV: 'test',
            BUSINESS_WHATSAPP_NUMBER: '',
          },
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
