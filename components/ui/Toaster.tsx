'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useToastStore } from '@/lib/toast-store';

const icons = {
  success: <CheckCircle2 size={20} color="var(--mint)" />,
  error: <XCircle size={20} color="var(--coral)" />,
  info: <Info size={20} color="var(--cobalt)" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className="toast"
            role={t.tone === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            onClick={() => dismiss(t.id)}
          >
            {icons[t.tone]}
            <div>
              <strong>{t.title}</strong>
              {t.body && <p>{t.body}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
