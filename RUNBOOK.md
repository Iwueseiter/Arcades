# Running Xurri

What to watch, what to do each week, and what to do when something breaks.

## Who holds what

| Thing | Where it lives | Can it lose money? |
| --- | --- | --- |
| Admin of all three contracts | A Safe multisig (2 of 3) | Yes: it can withdraw the gift fund and the prize pot. Never a single key. |
| Pauser key | A team member who watches alerts | No. It can only pause. |
| Prize signer key (`XURRI_SIGNER_PRIVATE_KEY`) | Only in the host's secret settings | Up to the daily payout limit (500 G$) per day until it's swapped. |
| Deployer key | Offline after deploying | No. It has no role. |
| `XURRI_ADMIN_SECRET`, `CRON_SECRET`, `XURRI_SESSION_SECRET` | Host's secret settings | No, but rotate them if they leak. |

Contracts: `XurriDailyGift` (gift fund), `XurriTournaments` (prize pot, games, prizes) and `XurriShop` (holds nothing).

## Monitoring

- **Uptime check:** point a monitor (Better Stack, UptimeRobot, etc.) at `GET /api/health` every 5 minutes. It returns **503** when:
  - the database is down;
  - the prize pot is below two weeks of tournament prizes;
  - the gift fund is below 1,000 G$;
  - a contract is paused;
  - the signer key doesn't match the contract.
- **Logs:** watch the host's logs for `[anti-cheat]`, `[tournament]`, `[admin]` and `voucher signing failed`.
- **Errors:** connect an error tracker (e.g. Sentry) to the host when you have an account.

## Every week

The tournament closes Monday 00:00 UTC. Prizes go out 24 hours later (`XURRI_TOURNAMENT_REVIEW_HOURS`).

On Monday, review the week that just ended:

```bash
curl -H "Authorization: Bearer $XURRI_ADMIN_SECRET" "https://YOUR_APP/api/admin/players?week=2026-W46"
```

Look at `top` and `flagged`. Warning signs:

- a huge jump over everyone else;
- many tournament games with the same score;
- a brand-new wallet at #1.

To ban a cheater before payout:

```bash
curl -X POST -H "Authorization: Bearer $XURRI_ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"playerId":"...","banned":true}' https://YOUR_APP/api/admin/ban
```

Banned players drop out of the standings and can't collect prizes. Once paid, a week can't be re-run, so ban before payout.

On Tuesday, check that `/api/leaderboard` shows `lastWeek`, and top up the gift fund and the pot if needed. `/stats` shows the week's numbers for grant reports.

## Changing the economy

- **Tournament base prizes:** `XURRI_TOURNAMENT_PRIZES`. Affects weeks not yet paid. Boosts add to them automatically.
- **Daily gift** (Safe, as operator): `XurriDailyGift.setGift(base, streakBonus, maxBonusDays)`. It can't go above the cap fixed at deploy (5 G$).
- **Games per day** (Safe, as operator): `XurriTournaments.setMaxPlaysPerDay(n)`, up to 50. Also change `MAX_ROUNDS_PER_DAY` in `lib/game-rules.ts`.
- **Shop prices** (Safe, as operator): `XurriShop.setItem(keccak256(slug), price, active)`. Keep `lib/shop-catalog.ts` in sync.
- **Daily payout limit** (Safe, as admin): `XurriTournaments.setDailyPayoutLimit(amount)`.
- **UBI share** (Safe, as admin): `setUbiConfig(recipient, bps)` on the tournaments and shop contracts. The share can't go above 50%.

## When something goes wrong

**The signer key leaked.**
1. The pauser (or the Safe) calls `XurriTournaments.pause()`.
2. Make a new key (`cast wallet new`).
3. The Safe calls `XurriTournaments.setSigner(newAddress)`.
4. Update `XURRI_SIGNER_PRIVATE_KEY` and redeploy.
5. The Safe calls `unpause()`.

At most one day's payout limit can be lost.

**Payouts look wrong, or there's a contract bug.** The pauser calls `pause()` on the affected contract right away; each contract pauses on its own. Everything that moves G$ there stops; reading still works. Investigate before the Safe calls `unpause()`. To move funds out, the Safe uses `withdraw(token, to, amount)`.

**A Safe owner's key is lost or compromised.** Swap that owner in the Safe app. To move admin to a new Safe, the Safe calls `beginDefaultAdminTransfer(newSafe)` on each contract. After 2 days, the new Safe calls `acceptDefaultAdminTransfer()`.

**The pot is running low.** Send G$ to the tournaments contract (or the gift contract for gifts). If you can't refill it soon, lower the prizes and the daily gift so players don't hit failed claims.

**The database is down.** The game can't start tournament games or save scores, but nothing on-chain is affected. Restore it from your provider's backups; turn on daily backups when you create the database.

**Too many requests.** The app limits each IP per minute (`proxy.ts`). That limit is per server instance, so for real attacks turn on the host's firewall rules (e.g. Vercel WAF rate limiting on `/api/*`).
