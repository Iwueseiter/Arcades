import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Baloo_2, Manrope } from 'next/font/google';
import './globals.css';

const display = Baloo_2({
  variable: '--font-baloo',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

const body = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'GoodTap — tap, streak, earn G$',
  description: 'A neon arcade tap game on Celo. Build combos, climb the weekly board and earn GoodDollar rewards.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GoodTap',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0c0a22',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
