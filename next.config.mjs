import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose the build ID to the client so the service worker URL is versioned per deploy.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? Date.now().toString(36),
  },
  // Some RainbowKit/wagmi sub-dependencies reference optional packages that aren't installed.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@x402/core/client': false,
      '@x402/evm': false,
      '@x402/evm/exact/client': false,
      '@x402/evm/upto/client': false,
      '@x402/svm/exact/client': false,
    };
    return config;
  },
  turbopack: {
    // A stray package-lock.json in the home directory otherwise confuses root detection.
    root: fileURLToPath(new URL('.', import.meta.url)),
    resolveAlias: {
      '@x402/core/client': { browser: false },
      '@x402/evm': { browser: false },
      '@x402/evm/exact/client': { browser: false },
      '@x402/evm/upto/client': { browser: false },
      '@x402/svm/exact/client': { browser: false },
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Browsers must always fetch the newest service worker, or app updates get stuck.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
