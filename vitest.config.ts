import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    // Database tests share one Postgres, so run files one at a time.
    fileParallelism: false,
    // Always test in demo mode, whatever contract addresses a local .env holds.
    env: { NEXT_PUBLIC_GIFT_ADDRESS: '', NEXT_PUBLIC_TOURNAMENTS_ADDRESS: '', NEXT_PUBLIC_SHOP_ADDRESS: '' },
  },
});
