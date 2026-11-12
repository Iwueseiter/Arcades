# Deploying Xurri

About an hour, most of it waiting for Safe signatures. You need: Foundry (`curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`), a Vercel account, a Postgres provider (Neon is free to start), a little CELO and the G$ you'll put in the pots.

## 1. Accounts and keys

```bash
cast wallet new   # DEPLOYER: sends the deploy transactions. Needs ~2 CELO. Not used after deploying.
cast wallet new   # SIGNER: signs prize tickets on the server. Holds nothing, ever.
cast wallet new   # PAUSER: a team member's key that can only pause. Keep ~0.5 CELO on it for gas.
```

Write the three private keys into a password manager. Never paste them into chat, issues or code.

**Create the Safe.** At https://app.safe.global, switch to Celo and create a Safe with 2-of-3 owners (for example two founders and one hardware wallet). It will be the contracts' admin. Send it ~1 CELO for gas.

## 2. Rehearse on Celo Sepolia (testnet)

Get test CELO from https://faucet.celo.org for the DEPLOYER, then:

```bash
cd contracts
cp .env.example .env
```

In `contracts/.env`, set:
- `PRIVATE_KEY`: the DEPLOYER key;
- `VOUCHER_SIGNER`: the SIGNER **address**;
- `ADMIN`: your own address (any address is allowed on testnets);
- `PAUSER`: the PAUSER address;
- `GD_IDENTITY=0x0000000000000000000000000000000000000000` (GoodDollar isn't on the testnet, so the face check is off).

```bash
npm run contracts:install          # first time only
npm run contracts:test-token       # deploys a test G$, then put its address in GD_TOKEN
npm run contracts:deploy:testnet   # prints the three contract addresses
```

Run the app against it locally:
1. Add these to `.env`:
   - `NEXT_PUBLIC_CHAIN_ID=11142220`
   - `NEXT_PUBLIC_RPC_URL=https://forno.celo-sepolia.celo-testnet.org`
   - `NEXT_PUBLIC_GD_TOKEN_ADDRESS` (the test G$ address)
   - the three `NEXT_PUBLIC_*_ADDRESS` values
   - `XURRI_SIGNER_PRIVATE_KEY` (the SIGNER key)
2. Send test G$ to the gift and tournaments contracts.
3. Play: claim a gift, start a tournament game, boost the pot, buy an item.

## 3. Deploy to Celo mainnet

In `contracts/.env`, set:
- `GD_TOKEN=0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A` (real G$);
- `GD_IDENTITY=0xC361A6E67822a0EDc17D899227dd9FC50BD62F42` (GoodDollar Identity);
- `ADMIN`: the **Safe** address;
- `CELOSCAN_API_KEY`: from etherscan.io (one key covers Celo);
- leave `UBI_RECIPIENT` empty, which uses GoodDollar's UBIScheme (`0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1`);
- `UBI_SHARE_BPS=1000` (10%).

```bash
npm run contracts:simulate   # dry run against mainnet, sends nothing
npm run contracts:deploy     # deploys the three contracts and publishes their source on Celoscan
```

The script refuses to run on mainnet unless `ADMIN` is a contract (your Safe) and `GD_IDENTITY` is set. Save the three printed addresses.

Then check on Celoscan that each contract shows **verified source**, and that `defaultAdmin()` returns your Safe.

## 4. Fund the pots

From the Safe or any wallet, send G$ to:

| Contract | How much to start |
| --- | --- |
| `XurriDailyGift` | ~2 weeks of gifts: `expected daily players × 1.5 G$ × 14` |
| `XurriTournaments` | at least 2 weeks of prizes: 290 G$ with the default 145 G$/week |

The shop holds nothing, so it needs no funding.

## 5. Database

Create a Postgres database (Neon, Supabase or Railway), turn on daily backups, and copy its connection string. Then, from your machine:

```bash
DATABASE_URL="postgres://..." npm run db:migrate
```

## 6. Host the app on Vercel

1. Import the GitHub repo in Vercel.
2. Add these environment variables (Production):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the hosted Postgres |
| `NEXT_PUBLIC_CHAIN_ID` | `42220` |
| `NEXT_PUBLIC_RPC_URL` | `https://forno.celo.org` (or a paid RPC for more traffic) |
| `NEXT_PUBLIC_GIFT_ADDRESS` | from step 3 |
| `NEXT_PUBLIC_TOURNAMENTS_ADDRESS` | from step 3 |
| `NEXT_PUBLIC_SHOP_ADDRESS` | from step 3 |
| `XURRI_SIGNER_PRIVATE_KEY` | the SIGNER key. Mark it **Sensitive**. |
| `XURRI_SESSION_SECRET` | `openssl rand -hex 32` |
| `XURRI_ADMIN_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | your support address |

3. Deploy. `vercel.json` sets up the hourly prize job automatically.
4. In Vercel → Firewall, add a rate-limit rule for `/api/*` (e.g. 300 requests a minute per IP).

## 7. Check it's live

1. `https://YOUR_APP/api/health` should say `"ok": true`, with every check green, including `signer: matches the contract`.
2. `https://YOUR_APP/stats` should show the three contract links.
3. With a GoodDollar-verified wallet, on a phone:
   - connect;
   - claim the GoodDollar daily G$ and the Xurri gift;
   - play a tournament game;
   - add 5 G$ to the pot;
   - buy the cheapest item.
4. Point an uptime monitor (UptimeRobot, Better Stack) at `/api/health` every 5 minutes, alerting you by email or Telegram.

## 8. Hand over and lock down

- Move the leftover CELO off the DEPLOYER key. It has no role in the contracts.
- Give the PAUSER key to the team member who'll watch alerts.
- Read [RUNBOOK.md](RUNBOOK.md): weekly review, banning cheaters, and what to do if a key leaks.

## For the GoodBuilders application

- **Contract addresses:** the three from step 3, all source-verified on Celoscan.
- **Activity tracking:** `https://YOUR_APP/stats` (and `/api/stats` for raw JSON), plus the contracts' events on Celoscan:
  - `GiftClaimed`, `GameStarted`, `PotBoosted`, `PrizesClaimed`, `ItemBought`, `UbiFunded`.
- **Open source:** the public GitHub repo.
