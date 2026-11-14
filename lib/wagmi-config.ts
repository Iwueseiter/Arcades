import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { celo } from 'viem/chains';

// Falls back to a placeholder so the build succeeds.
// Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in env to enable wallet connections.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'placeholder';

export const wagmiConfig = getDefaultConfig({
  appName: 'Xurri',
  projectId,
  chains: [celo],
  ssr: true,
});
