import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Baloo_2, Manrope } from 'next/font/google';
import './globals.css';

const display = Baloo_2({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const body = Manrope({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'GoodTap',
  description: 'A bright Web3 arcade tap game powered by GoodDollar rewards.',
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
  themeColor: '#3c63ff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${body.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
