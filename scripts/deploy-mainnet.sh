#!/usr/bin/env bash
# One-command Celo mainnet deploy: checks the settings and the gas money, deploys the three Xurri
# contracts, then writes their addresses into the app's .env. Run it with: npm run deploy:mainnet
set -euo pipefail
cd "$(dirname "$0")/../contracts"

RPC=${DEPLOY_RPC_URL:-https://forno.celo.org}
set -a
source "${DEPLOY_ENV_FILE:-.env}"
set +a

fail() { echo "✗ $1"; exit 1; }
[[ "${PRIVATE_KEY:-}" == 0x* && ${#PRIVATE_KEY} -eq 66 ]] || fail "PRIVATE_KEY in contracts/.env isn't set"
[[ "${ADMIN:-}" =~ ^0x[0-9a-fA-F]{40}$ ]] || fail "ADMIN in contracts/.env isn't a wallet address"
[[ "${VOUCHER_SIGNER:-}" =~ ^0x[0-9a-fA-F]{40}$ ]] || fail "VOUCHER_SIGNER in contracts/.env isn't set"

DEPLOYER=$(cast wallet address "$PRIVATE_KEY")
NEED_WEI=4000000000000000000 # 4 CELO; about half is actually used, the rest stays in the wallet
BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$RPC")
echo "Deploy wallet: $DEPLOYER ($(cast from-wei "$BALANCE") CELO)"
echo "Admin wallet:  $ADMIN"
if [[ $(echo "$BALANCE < $NEED_WEI" | bc) -eq 1 ]]; then
  fail "Send at least 4 CELO to $DEPLOYER on Celo mainnet, then run this again."
fi

ARGS=(script script/Deploy.s.sol --rpc-url "$RPC" --broadcast)
if [[ -n "${CELOSCAN_API_KEY:-}" ]]; then ARGS+=(--verify); else echo "(No CELOSCAN_API_KEY: deploying without publishing the source; you can verify later.)"; fi

echo "Dry run…"
forge script script/Deploy.s.sol --rpc-url "$RPC" > /dev/null || fail "Dry run failed; nothing was sent."
echo "Deploying to Celo mainnet…"
OUT=$(forge "${ARGS[@]}" 2>&1 | tee /dev/stderr)

GIFT=$(echo "$OUT" | awk '/XurriDailyGift / {print $NF}' | tail -1)
TOURNAMENTS=$(echo "$OUT" | awk '/XurriTournaments / {print $NF}' | tail -1)
SHOP=$(echo "$OUT" | awk '/XurriShop / {print $NF}' | tail -1)
[[ -n "$GIFT" && -n "$TOURNAMENTS" && -n "$SHOP" ]] || fail "Couldn't read the deployed addresses from the output above."
BLOCK=$(jq -r '.receipts[0].blockNumber' broadcast/Deploy.s.sol/42220/run-latest.json | xargs printf '%d')

# Point the app at the new contracts.
APP_ENV=${APP_ENV_FILE:-../.env}
touch "$APP_ENV"
for kv in "NEXT_PUBLIC_CHAIN_ID=42220" "NEXT_PUBLIC_RPC_URL=$RPC" "NEXT_PUBLIC_GIFT_ADDRESS=$GIFT" \
  "NEXT_PUBLIC_TOURNAMENTS_ADDRESS=$TOURNAMENTS" "NEXT_PUBLIC_SHOP_ADDRESS=$SHOP" "XURRI_DEPLOY_BLOCK=$BLOCK"; do
  key=${kv%%=*}
  grep -v "^$key=" "$APP_ENV" > "$APP_ENV.tmp" || true
  mv "$APP_ENV.tmp" "$APP_ENV"
  echo "$kv" >> "$APP_ENV"
done

echo
echo "✓ Deployed to Celo mainnet (block $BLOCK)"
echo "  XurriDailyGift    $GIFT"
echo "  XurriTournaments  $TOURNAMENTS"
echo "  XurriShop         $SHOP"
echo "  Addresses saved to .env for the app."
echo "Next: send G\$ to XurriDailyGift and XurriTournaments from your wallet."
