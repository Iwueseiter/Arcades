'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { MascotArt } from '@/components/game/Mascot';

function BubbleShell({ children }: { children?: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="sad-bubble-svg" aria-hidden>
      <defs>
        <radialGradient id="sb-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9f1ff" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#a8d8ff" stopOpacity="0.4" />
          <stop offset="92%" stopColor="#e3b8ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="sb-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fe3ff" />
          <stop offset="40%" stopColor="#e39bff" />
          <stop offset="70%" stopColor="#ffd36e" />
          <stop offset="100%" stopColor="#7ff0b5" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#sb-fill)" />
      <circle cx="50" cy="50" r="45.5" fill="none" stroke="url(#sb-rim)" strokeWidth="3" />
      {children}
      <path d="M20 38a32 32 0 0 1 22-22" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.9" />
      <circle cx="22" cy="52" r="3.5" fill="#ffffff" />
    </svg>
  );
}

/** A small bubble with a sad face that floats up where a treat was missed. */
export function SadBubble() {
  return (
    <BubbleShell>
      <g>
        <ellipse cx="38" cy="50" rx="4" ry="5" fill="#3b2a4a" />
        <ellipse cx="62" cy="50" rx="4" ry="5" fill="#3b2a4a" />
        <path d="M30 43l11-4M70 43l-11-4" stroke="#3b2a4a" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 70q10-9 20 0" stroke="#3b2a4a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M66 56c3 5 3 8 0 9-3-1-3-4 0-9z" fill="#5cc8ff" />
      </g>
    </BubbleShell>
  );
}

/** The game-over moment: sad Bloop trapped in a big wobbly bubble, rising up the screen. */
export function FailBubble({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div
      className="fail-bubble"
      initial={{ y: 260, scale: 0.6, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      role="status"
    >
      <motion.div
        className="fail-bubble-orb"
        animate={{ scaleX: [1, 1.05, 0.97, 1], scaleY: [1, 0.95, 1.04, 1], y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <BubbleShell />
        <div className="fail-bubble-mascot">
          <MascotArt mood="sad" />
        </div>
      </motion.div>
      <p className="fail-title">{title}</p>
      <p className="fail-sub">{subtitle}</p>
    </motion.div>
  );
}
