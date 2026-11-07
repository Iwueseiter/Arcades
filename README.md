# GoodTap

GoodTap is a mobile-first, candy-bright arcade game built with Next.js, TypeScript, Tailwind and a contract-agnostic Web3 layer.

## Quick start

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Install dependencies:
   npm install
3. Start the local app:
   npm run dev
4. Open `http://localhost:3000`.

## Environment variables

The app keeps all wallet and chain configuration in environment variables. Do not hardcode or invent contract addresses.

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — linting check
- `npm run typecheck` — TypeScript validation

## Design goals

- Mobile first, with a premium arcade aesthetic.
- Reward-driven loop built around GoodDollar economics.
- Contract mocked and isolated to make the app work today without breaking future integration.

## Notes

This repository is intentionally front-end-first. Smart contracts are represented through TypeScript interfaces and mocked implementations so a partner can drop in the real ABIs later.
