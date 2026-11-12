# Xurri

Pop treats, build streaks, win G$. A bright tap game for phones (made with MiniPay in mind), paying GoodDollar (G$) on Celo.

- **App:** Next.js 16 (`app/`, `components/`, `lib/`)
- **Contract:** `XurriArcade` in `contracts/` (Foundry): daily gift, game prizes, invites and the shop, all paid in G$
- **Fair scores:** the server replays every game's taps, so nobody can just send a fake score

```
Player ──plays──▶ Xurri app ──▶ server checks the game, adds up the player's G$ prizes
   │                        └──▶ server signs a "prize ticket" for the total won so far
   └──wallet──▶ XurriArcade (Celo) ── claimDaily · claimRewards(ticket) · buyItem · setReferrer
```

Without a contract address the app runs in **test mode**: everything works with play money, no wallet needed.

## Run it locally

Needs Node 22.12+ (22.10 works too; the scripts add the flag it needs).

```bash
npm install
npm run db:push    # creates the local database (prisma/goodtap.db)
npm run dev        # http://localhost:3000
```

## The contract

`contracts/src/XurriArcade.sol` (Solidity 0.8.30, OpenZeppelin 5.4) holds a pot of G$ and pays from it:

| What | How |
| --- | --- |
| Daily gift | `claimDaily()` once a day. 1 G$ plus 0.2 G$ for each day in a row (up to 7 extra days). |
| Game prizes | The server signs a ticket for everything a player has won so far. `claimRewards` pays only the new part, so a ticket can't be used twice. |
| Daily limit | Game prizes are capped per day (500 G$ by default) to limit damage if the server key ever leaks. |
| Invites | `setReferrer(friend)` before your first gift; the friend gets 3 G$ when you open it. |
| Shop | `buyItem(id)` takes the price in G$ (after an approval). Money spent goes back into the prize pot. |
| Real people only | Optional GoodDollar face check (`GD_IDENTITY`). |
| Safety | Two-step ownership, pause switch, re-entry guard, owner can move funds out. |

```bash
npm run contracts:install   # first time only
npm run contracts:test      # 16 tests
```

## Deploying

### 1. Make two keys

```bash
cast wallet new   # deployer: needs ~2 CELO for gas
cast wallet new   # prize signer: holds nothing, only signs prize tickets
```

### 2. Fill in `contracts/.env`

Copy `contracts/.env.example` to `contracts/.env` and set:

- `PRIVATE_KEY`: the deployer key
- `VOUCHER_SIGNER`: the prize signer's **address**
- `CELOSCAN_API_KEY`: from etherscan.io (one key works for Celo too), used to publish the source code
- optional: `OWNER` (e.g. a Safe), `TREASURY`, `GD_IDENTITY` (check the GoodDollar docs for the Celo Identity address first)

### 3. Rehearse on the testnet (recommended)

Get free test CELO from the Celo faucet, then:

```bash
npm run contracts:test-token      # makes a test G$; put its address in GD_TOKEN
npm run contracts:deploy:testnet  # deploys XurriArcade to Celo Sepolia
```

Point the app at it with `NEXT_PUBLIC_CHAIN_ID=11142220` and play a few games.

### 4. Go live on Celo mainnet

Set `GD_TOKEN=0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A` (real G$), then:

```bash
npm run contracts:simulate   # dry run, sends nothing
npm run contracts:deploy     # deploys and publishes the source on Celoscan
```

If you set `OWNER`, that address must call `acceptOwnership()` afterwards.

### 5. Fill the prize pot

Send G$ to the deployed contract address. Plan for roughly `players × (daily gift + game prizes)` per day.

### 6. Connect the app

Set these where the app is hosted, then rebuild:

| Setting | Value |
| --- | --- |
| `NEXT_PUBLIC_ARCADE_ADDRESS` | the deployed `XurriArcade` address |
| `XURRI_SIGNER_PRIVATE_KEY` | the prize signer's private key |
| `XURRI_SESSION_SECRET` | any random 32+ characters (`openssl rand -hex 32`) |
| `DATABASE_URL` | a hosted Postgres on serverless hosts (change `provider` in `prisma/schema.prisma`) |

## Scripts

- `npm run dev` / `build` / `start`: the app
- `npm run lint`, `npm run typecheck`
- `npm run db:push`: update the database tables
- `npm run contracts:test` / `contracts:simulate` / `contracts:deploy`
