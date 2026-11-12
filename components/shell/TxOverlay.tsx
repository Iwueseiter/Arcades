'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useWalletStore } from '@/lib/chain/wallet-store';

export function TxOverlay() {
  const busy = useWalletStore((s) => s.busy);
  const status = useWalletStore((s) => s.status);
  const label = busy ?? (status === 'signing' ? 'Check your wallet' : status === 'connecting' ? 'Connecting wallet' : null);

  return (
    <AnimatePresence>
      {label && (
        <motion.div className="tx-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status">
          <motion.div className="overlay-panel" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
            <div className="spinner" style={{ width: 34, height: 34, margin: '0 auto 14px', color: 'var(--violet)' }} />
            <p className="title-md">{label}</p>
            <p className="copy" style={{ marginTop: 6 }}>
              {busy ? 'Tap confirm in your wallet. This takes a few seconds.' : 'This step is free.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
