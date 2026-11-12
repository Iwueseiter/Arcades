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
  title: 'Xurri: pop treats, win G$',
  description: 'A bright, sweet tap game. Pop treats, build streaks and win G$.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Xurri',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fff4e4',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
