import type { PlayerSnapshot } from '@/lib/types';

/** Enough CELO to cover a typical Celo network fee. */
export const MIN_CELO_GAS = 0.0001;

/** Telegram group where players can drop their wallet address to request CELO for gas. */
export const telegramGasUrl = 'https://t.me/+3Pd_PX0S6541Njlk';

/** Signed in with a wallet or an email magic link — guests cannot pay. */
export const isSignedIn = (player: PlayerSnapshot | null | undefined) =>
  Boolean(player?.address || player?.signedInEmail);

export const hasCeloForGas = (celoBalance: number | null | undefined) => (celoBalance ?? 0) >= MIN_CELO_GAS;
