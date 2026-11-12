import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://xurri:xurri@localhost:5432/xurri_test';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    // Database tests share one Postgres, so run files one at a time.
    fileParallelism: false,
    // Always test in demo mode, whatever contract addresses a local .env holds.
    // and always against the throwaway test database: the tests delete every row. Never point this at real data.
    env: {
      NEXT_PUBLIC_GIFT_ADDRESS: '',
      NEXT_PUBLIC_TOURNAMENTS_ADDRESS: '',
      NEXT_PUBLIC_SHOP_ADDRESS: '',
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDatabaseUrl,
    },
  },
});
