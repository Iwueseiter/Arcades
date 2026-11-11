# GoodTap product decisions

This document captures the assumptions made while building the first phase of GoodTap and the implementation choices that keep the app realistic without inventing unsupported blockchain details.

## Core assumptions

1. GoodDollar is treated as a Celo-based G$ ecosystem. The app reads the chain and contract addresses from environment variables so it can be switched immediately to the official documentation values.
2. The app is deliberately contract-agnostic at the UI layer. Any contract interaction is abstracted behind typed interfaces and mock implementations so the product works without live on-chain dependencies.
3. The weekly leaderboard and reward pool are modelled as real-time server-driven data rather than verified on-chain state, with mock data sources for local development.
4. The project uses a mobile-first shell with a fixed-width centered frame so the design reads like a polished app while remaining responsive on larger screens.
5. Audio and haptics are enabled on the first user gesture to satisfy browser autoplay restrictions.

## Implementation choices

- The initial app shell uses a fixed-width app frame at 430px max to prepare for a polished mobile game layout.
- Sound events are centralized through a single `playSound` interface and a `SOUND_EVENTS` table, matching the future requirement for swapping implementations.
- The project uses a mock GoodDollar wallet balance of 25 G$ in development mode and keeps all real wallet configuration behind environment variables.
- The default project uses the App Router, TypeScript and Tailwind, which matches the specification.

## Open follow-up items

- The partner must provide the final GoodDollar contract ABIs and the exact official network metadata for the live deployment environment.
- The server-side scoring and validation flow will be integrated once the database and real-time infrastructure are added in later phases.

## Phase 2: on-chain rewards (Nov 2026)

- Rewards run through one contract, `GoodTapArcade`, holding a G$ pool. Daily check-ins are fully on-chain. Game rewards use backend-signed **cumulative** EIP-712 vouchers, so there are no nonces to track and a replayed voucher pays nothing.
- A per-day voucher budget on-chain bounds the loss if the signer key is ever compromised. The signer can be rotated with `setSigner`.
- Every player now has their own server record (signed httpOnly session cookie). Wallets sign in with a signed message; a guest's progress moves to their wallet on first sign-in.
- Rounds are server-issued. The server replays the tap log to compute the score and rejects logs that are impossible for the spawn rate. A determined bot could still fabricate a plausible log, which is why per-round and per-day caps exist and why the GoodDollar Identity gate is available.
- Without a contract address the app runs in demo mode with an off-chain balance, so it stays playable before launch.
- Five ranked rounds per day; after that, practice rounds that neither rank nor earn.
