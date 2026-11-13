import type { PlayerSnapshot } from '@/lib/types';

/** Enough CELO to cover a typical Celo network fee. */
export const MIN_CELO_GAS = 0.0001;

/** Telegram group where players can ask for a little CELO for gas. Override with NEXT_PUBLIC_TELEGRAM_GAS_URL. */
export const telegramGasUrl = process.env.NEXT_PUBLIC_TELEGRAM_GAS_URL || 'https://t.me/celoorg';

/** Signed in with a wallet or an email magic link — guests cannot pay. */
export const isSignedIn = (player: PlayerSnapshot | null | undefined) =>
  Boolean(player?.address || player?.signedInEmail);

export const hasCeloForGas = (celoBalance: number | null | undefined) => (celoBalance ?? 0) >= MIN_CELO_GAS;
