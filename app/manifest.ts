import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Xurri',
    short_name: 'Xurri',
    description: 'Pop treats, build streaks and claim free G$ every day on Celo.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f3ee',
    theme_color: '#f6f3ee',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Play', url: '/?source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Daily gift', url: '/?tab=rewards&source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Leaderboard', url: '/?tab=ranks&source=pwa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
