import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './config/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 16px 48px rgba(99, 102, 241, 0.35)',
        card: '0 14px 30px rgba(25, 35, 86, 0.12)',
      },
      colors: {
        goodtap: {
          cobalt: '#3F6CFF',
          violet: '#7C5CFF',
          gold: '#FFC857',
          mint: '#35D9B9',
          coral: '#FF7E72',
          danger: '#FF5A5F',
          ink: '#1F2542',
          cloud: '#F5F7FF',
          panel: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
