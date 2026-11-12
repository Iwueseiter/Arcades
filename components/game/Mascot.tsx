'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MascotMood } from '@/lib/game-store';

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'happy') {
    return (
      <g stroke="#4a1a24" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M30 50q7-9 14 0" />
        <path d="M56 50q7-9 14 0" />
      </g>
    );
  }
  if (mood === 'excited') {
    const star = (cx: number) =>
      `M${cx} 38l3.2 7 7.6.8-5.7 5.1 1.6 7.5-6.7-3.9-6.7 3.9 1.6-7.5-5.7-5.1 7.6-.8z`;
    return (
      <g fill="#ffc94a" stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round">
        <path d={star(37)} />
        <path d={star(63)} />
      </g>
    );
  }
  const pupilY = mood === 'sad' ? 53 : 49;
  const pupilR = mood === 'wow' ? 6.5 : 5.2;
  return (
    <g className={mood === 'idle' ? 'mascot-blink' : undefined}>
      <ellipse cx="37" cy="48" rx="9" ry={mood === 'wow' ? 11 : 10} fill="#ffffff" />
      <ellipse cx="63" cy="48" rx="9" ry={mood === 'wow' ? 11 : 10} fill="#ffffff" />
      <circle cx="38" cy={pupilY} r={pupilR} fill="#3b1218" />
      <circle cx="64" cy={pupilY} r={pupilR} fill="#3b1218" />
      <circle cx="40" cy={pupilY - 2.5} r="1.8" fill="#ffffff" />
      <circle cx="66" cy={pupilY - 2.5} r="1.8" fill="#ffffff" />
      {mood === 'sad' && (
        <>
          <path d="M28 41l13-5M72 41l-13-5" stroke="#4a1a24" strokeWidth="3" strokeLinecap="round" />
          <path d="M70 58c3 5 3 8 0 9-3-1-3-4 0-9z" fill="#7dd3fc" />
        </>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'happy':
      return (
        <g>
          <path d="M40 62q10 14 20 0z" fill="#6b1430" />
          <path d="M45 67q5 4 10 0" fill="#ff7a9c" />
        </g>
      );
    case 'excited':
      return (
        <g>
          <path d="M37 60q13 20 26 0z" fill="#6b1430" />
          <path d="M43 68q7 6 14 0" fill="#ff7a9c" />
        </g>
      );
    case 'sad':
      return <path d="M42 70q8-8 16 0" stroke="#4a1a24" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    case 'wow':
      return <ellipse cx="50" cy="66" rx="5.5" ry="7" fill="#6b1430" />;
    default:
      return <path d="M43 63q7 7 14 0" stroke="#4a1a24" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
  }
}

/** Bloop, Xurri's jelly mascot. */
export function MascotArt({ mood }: { mood: MascotMood }) {
  return (
    <svg viewBox="0 0 100 100" className={`mascot-svg mascot-${mood}`} aria-hidden>
      <defs>
        <radialGradient id="bloop-body" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffe6ee" />
          <stop offset="45%" stopColor="#ff8fb3" />
          <stop offset="100%" stopColor="#f0507f" />
        </radialGradient>
        <radialGradient id="bloop-coin" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="60%" stopColor="#ffc94a" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
      </defs>
      {/* antenna with a little G$ coin */}
      <path d="M50 22c0-6 4-10 8-12" stroke="#e8507c" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="59" cy="9" r="7" fill="url(#bloop-coin)" className="mascot-coin" />
      {/* body: a wobbly jelly dome with a drippy base */}
      <path
        d="M50 20C74 20 88 40 88 62c0 14-6 22-14 24-4 1-6-3-10-3s-6 5-14 5-10-5-14-5-6 4-10 3C18 84 12 76 12 62 12 40 26 20 50 20z"
        fill="url(#bloop-body)"
      />
      <ellipse cx="32" cy="36" rx="8" ry="12" transform="rotate(30 32 36)" fill="#ffffff" opacity="0.5" />
      <ellipse cx="26" cy="60" rx="6" ry="3.5" fill="#ff5c8a" opacity="0.55" />
      <ellipse cx="74" cy="60" rx="6" ry="3.5" fill="#ff5c8a" opacity="0.55" />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
    </svg>
  );
}

/** The mascot with a speech bubble that pops up whenever `at` changes. */
export function Mascot({ mood, line, at, size = 72, side = 'right' }: { mood: MascotMood; line: string | null; at: number; size?: number; side?: 'left' | 'right' }) {
  const [shown, setShown] = useState<{ line: string; at: number } | null>(null);

  useEffect(() => {
    if (!line) return;
    setShown({ line, at });
    const timer = setTimeout(() => setShown((current) => (current?.at === at ? null : current)), 1700);
    return () => clearTimeout(timer);
  }, [line, at]);

  return (
    <div className="mascot" style={{ width: size, height: size }}>
      <motion.div key={at} initial={{ scale: 0.85, y: 6 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
        <MascotArt mood={mood} />
      </motion.div>
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.at}
            className={`mascot-bubble ${side}`}
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            {shown.line}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
