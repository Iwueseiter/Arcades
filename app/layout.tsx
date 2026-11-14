import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Outfit } from 'next/font/google';
import './globals.css';
import { ServiceWorker } from '@/components/pwa/ServiceWorker';
import { Web3Provider } from '@/components/providers/Web3Provider';

const display = Outfit({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const body = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '800', '800'],
});

export const metadata: Metadata = {
  title: 'Xurri: pop treats, win G$',
  description: 'A fast, bright tap game on Celo. Claim free G$ every day and climb the weekly board.',
  icons: { apple: '/icons/apple-touch-icon.png' },
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
  themeColor: '#f6f3ee',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
        <ServiceWorker />
      </body>
    </html>
  );
}
