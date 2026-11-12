# Xurri

Pop treats, build streaks, climb the weekly board. A bright tap game for phones, on Celo with GoodDollar (G$).

- **App:** Next.js 16 (`app/`, `components/`, `lib/`), Postgres through Prisma
- **Contracts:** three small contracts in `contracts/` (Foundry): the daily gift, the tournament (games, prize pot, prizes) and the shop
- **Fair scores:** the server replays every game's taps, flags play that looks automated, and counts each real person once

## How G$ moves

Players **earn** G$ in only two ways:

1. **Daily claims.** GoodDollar's own daily claim (UBI), right inside the app, plus the Xurri daily gift, which grows with a streak.
2. **The weekly tournament.** Each person's best tournament score of the week (Monday to Sunday, UTC) counts. The top 10 win G$. Prizes go out 24 hours after the week ends, once the top scores are checked.

Players **use** G$ in two ways, and both fund GoodDollar's UBI pool:

1. **Boost the prize pot.** Anyone (players, sponsors, donors) can add G$ to this week's pot. Every prize grows in proportion.
2. **The shop.** Cosmetic items.

From every boost and purchase, 10% goes to GoodDollar's UBIScheme, the pool that pays everyone's daily claim. The rest goes into the prize pot, so spending flows back to players as prizes.

```
                      ┌──────────────────── XurriDailyGift ── claim(): 1 G$/day + streak
Player ── wallet ─────┼──────────────────── GoodDollar UBIScheme ── claim(): free daily G$
                      ├── startGame() ────┐
                      ├── boost(G$) ──────┤ XurriTournaments ── 10% ─▶ GoodDollar UBI pool
                      ├── claimPrizes() ◀─┘   (prize pot)
                      └── buy(item) ───── XurriShop ── 90% ─▶ prize pot, 10% ─▶ UBI pool

Xurri server: replays taps · ranks the week · signs prize tickets · settles hourly
```

Games themselves never pay. Practice games are free and need no wallet. Without contract addresses the app runs in **test mode**, with play money.

Live numbers for players, retention and G$ flows are on **`/stats`** (JSON at `/api/stats`).

## GoodDollar integrations

| GoodBuilders option | In Xurri |
| --- | --- |
| Face verification + UBI claim button | The GoodDollar daily claim is on the home and Rewards screens, with a link to the face check |
| Identity SDK, used meaningfully | Only verified people can enter tournaments or claim gifts. Wallets connected to one GoodDollar identity count as one person (daily gift, game limits, rankings) |
| UBI Pool fees | 10% of all G$ spent in Xurri (pot boosts and shop) goes to GoodDollar's UBIScheme |

## Run it locally

Needs Node 22.13+ (or 24+) and Docker.

```bash
npm install
cp .env.example .env     # then fill in what you need
docker compose up -d     # local Postgres
npm run db:migrate       # create the tables
npm run dev              # http://localhost:3000
```

Checks:

```bash
npm run typecheck && npm run lint
npm test                 # needs the Postgres above (uses DATABASE_URL)
npm run contracts:test   # 21 contract tests, including a fuzz test
```

CI runs all of these, and the build, on every pull request (`.github/workflows/ci.yml`).

## The contracts

Solidity 0.8.30, OpenZeppelin 5.4. Each contract holds only its own money, so a problem in one can't drain another.

| Contract | Does | Holds |
| --- | --- | --- |
| `XurriDailyGift` | `claim()` once a day per person: 1 G$ + 0.2 G$ per day in a row (up to 7). The operator can never raise it past the 5 G$ cap fixed at deploy. | The gift fund |
| `XurriTournaments` | `startGame()` (5 a day per person), `boost(amount)` for the prize pot, `claimPrizes(ticket)` for winners. Tickets are cumulative and payouts are capped per day (500 G$), which limits the damage if the signer key ever leaks. | The prize pot |
| `XurriShop` | `buy(item)`, splitting each purchase between the prize pot and the UBI pool | Nothing |

Shared roles (`contracts/src/base/XurriBase.sol`):

| Role | Who | Can |
| --- | --- | --- |
| Admin | A Safe multisig | Move money, change the signer, the identity contract or the UBI address, raise the payout limit, unpause, manage roles. Handing admin over takes a 2-day wait. |
| Operator | The Safe (or a team key later) | Set shop prices, the daily gift (under its cap) and games per day |
| Pauser | A fast-reacting team key | Pause only. It can't unpause or move money. |

## Dashboards

- **`/stats`**: public numbers for players and grant reviewers: weekly retention, verified people, G$ claimed, paid, spent and sent to UBI, and the contract links.
- **`/analytics`**: the team's traffic dashboard (page views, active players, daily trends, lifetime on-chain totals from the contracts' events). It refreshes every 30 seconds. On-chain totals need `XURRI_DEPLOY_BLOCK`.
- **`/admin`**: protected player and game directory, with tournament games' bot-check flags. Sign in with `XURRI_ADMIN_EMAIL` and `XURRI_ADMIN_PASSWORD` (16+ characters). The tournament review and ban API (`/api/admin/tournament`, `/api/admin/ban`) accepts that login or `XURRI_ADMIN_SECRET` for scripts.

## Deploying

Step by step in **[DEPLOY.md](DEPLOY.md)**. After launch, follow [RUNBOOK.md](RUNBOOK.md).

## Scripts

- `npm run dev` / `build` / `start`: the app
- `npm run lint`, `npm run typecheck`, `npm test`
- `npm run db:migrate`: apply database migrations; `npm run db:push`: quick schema sync for local experiments
- `npm run contracts:test` / `contracts:test-token` / `contracts:deploy:testnet` / `contracts:simulate` / `contracts:deploy`
