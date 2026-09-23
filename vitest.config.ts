import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    env: { BUSINESS_WHATSAPP_NUMBER: '' },
  },
});
