import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    // A stray package-lock.json in the home directory otherwise confuses root detection.
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
};

export default nextConfig;
