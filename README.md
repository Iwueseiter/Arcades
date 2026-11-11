# GoodTap

A neon arcade tap game on Celo. Catch coins, build combos, climb the weekly leaderboard and earn GoodDollar (G$).

- **Next.js 16** app (mobile-first, works great inside MiniPay)
- **GoodTapArcade** smart contract (Foundry) that pays G$ for daily check-ins, game rewards and referrals, and runs the shop
- Server-validated rounds: the server replays every round's tap log, so a client can't just report a score

## How it fits together

```
Player ──plays──▶ Next.js app ──/api/game/*──▶ server replays the tap log, credits G$ earnings (DB)
   │                                     └──/api/rewards/voucher──▶ signs an EIP-712 voucher for cumulative earnings
   └──wallet tx──▶ GoodTapArcade (Celo) ── claimDaily / claimRewards(voucher) / buyItem / setReferrer
```

Without `NEXT_PUBLIC_ARCADE_ADDRESS` the app runs in **demo mode**: everything works with an off-chain balance, no wallet needed.

## Quick start (demo mode)

Requires Node 22.12+.

```bash
npm install
npm run db:push        # creates prisma/goodtap.db
npm run dev            # http://localhost:3000
```

## Smart contract

`contracts/src/GoodTapArcade.sol` (Solidity 0.8.30, OpenZeppelin 5.4):

| Feature | How it works |
| --- | --- |
| Daily check-in | `claimDaily()` once per UTC day. 1 G$ + 0.2 G$ per streak day (bonus caps after 7 days). |
| Game rewards | Backend signs `RewardVoucher(player, cumulativeAmount, deadline)`. `claimRewards` pays the difference since last claim, so replays pay nothing. |
| Daily budget | Total voucher payouts per day are capped (500 G$ by default), limiting damage if the signer key leaks. |
| Referrals | `setReferrer(addr)` before your first claim; the referrer gets 3 G$ on that first claim. |
| Shop | `buyItem(id)` pulls the G$ price (needs approval). Revenue goes to the treasury, which defaults to the contract itself, so purchases refill the reward pool. |
| Sybil resistance | Optional GoodDollar Identity check (`isWhitelisted`) on claims. Set `GD_IDENTITY` at deploy or later via `setIdentity`. |
| Safety | Ownable2Step, Pausable, ReentrancyGuard, SafeERC20, owner `withdraw` for pool migration. |

```bash
npm run contracts:install   # first time only: OpenZeppelin + forge-std
npm run contracts:test      # 16 tests incl. fuzzing
```

## Deploying to Celo mainnet

1. **Create two keys**: a deployer (holds ~3 CELO for gas) and a voucher signer (holds nothing; it only signs).
   `cast wallet new` works for both.
2. **Configure** `contracts/.env` from `contracts/.env.example`: `PRIVATE_KEY`, `VOUCHER_SIGNER` (signer *address*), optionally `OWNER` (e.g. a Safe), `TREASURY` and `GD_IDENTITY`.
   Confirm the GoodDollar Identity address for Celo in the [GoodDollar docs](https://docs.gooddollar.org/for-developers/core-contracts) before setting it.
3. **Dry run, then deploy & verify**:
   ```bash
   cd contracts && source .env
   forge script script/Deploy.s.sol --rpc-url celo                      # simulation only
   forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify # needs CELOSCAN_API_KEY
   ```
   If you set `OWNER`, that address must call `acceptOwnership()`.
4. **Fund the pool** by sending G$ to the deployed address. Budget roughly `players × (daily reward + game rewards)` per day.
5. **Point the app at it** (in your host's env settings):
   `NEXT_PUBLIC_ARCADE_ADDRESS`, `GOODTAP_SIGNER_PRIVATE_KEY`, `GOODTAP_SESSION_SECRET`, then rebuild.
6. **Production database**: SQLite is fine on a single long-running server. On serverless hosts (Vercel etc.) switch `provider` in `prisma/schema.prisma` to `postgresql` and set `DATABASE_URL`.

Tip: deploy to Celo Sepolia first (`--rpc-url celo_sepolia`, `NEXT_PUBLIC_CHAIN_ID=11142220`) with a test token.

## Scripts

- `npm run dev` / `build` / `start`: the app
- `npm run lint`, `npm run typecheck`
- `npm run db:push`: sync the Prisma schema
- `npm run contracts:test`: Foundry tests
