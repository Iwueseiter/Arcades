import type { Skin } from '@/lib/game-rules';

/** Main colour of each skin, used for burst particles and splats. */
export const SKIN_COLORS: Record<Skin, string[]> = {
  standard: ['#7cc0ff', '#ffffff'],
  coin: ['#7cc0ff', '#c9e8ff', '#ffffff'],
  'jelly-drop': ['#ff5fae', '#ff9fd0', '#ffd6ec'],
  'jelly-cube': ['#3ee8b5', '#9effdd', '#d4fff0'],
  bubble: ['#a5f3fc', '#f0abfc', '#fde68a', '#ffffff'],
  candy: ['#ff9f43', '#ffd166', '#ffffff'],
  golden: ['#ffc94a', '#fff3c4', '#ffffff'],
  rocket: ['#3ee8b5', '#ffffff', '#ff5fae'],
  bomb: ['#ff6b7a', '#2a1f45', '#ffc94a'],
};

/** Hand-drawn SVG tokens so the arena stays crisp at any size and needs no image assets. */
export function TokenArt({ skin }: { skin: Skin }) {
  switch (skin) {
    case 'jelly-drop':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <radialGradient id="ta-drop" cx="38%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#ffe0f0" />
              <stop offset="40%" stopColor="#ff7ac0" />
              <stop offset="100%" stopColor="#d6267f" />
            </radialGradient>
          </defs>
          <path d="M32 6C40 16 56 30 56 42a24 18 0 0 1-48 0C8 30 24 16 32 6z" fill="url(#ta-drop)" />
          <path d="M8 44a24 16 0 0 0 48 0" fill="none" stroke="#a3125f" strokeOpacity="0.35" strokeWidth="3" />
          <ellipse cx="23" cy="28" rx="6" ry="9" transform="rotate(25 23 28)" fill="#ffffff" opacity="0.65" />
          <circle cx="40" cy="44" r="1.6" fill="#ffffff" opacity="0.8" />
          <circle cx="30" cy="50" r="1.3" fill="#ffffff" opacity="0.7" />
          <circle cx="46" cy="36" r="1.2" fill="#ffffff" opacity="0.7" />
        </svg>
      );

    case 'jelly-cube':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <linearGradient id="ta-cube" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8ffe8" />
              <stop offset="55%" stopColor="#3ee8b5" />
              <stop offset="100%" stopColor="#0ea678" />
            </linearGradient>
          </defs>
          <rect x="6" y="10" width="52" height="48" rx="16" fill="url(#ta-cube)" />
          <rect x="6" y="10" width="52" height="48" rx="16" fill="none" stroke="#08875f" strokeOpacity="0.35" strokeWidth="2.5" />
          <path d="M14 22c2-6 8-8 16-8" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.7" fill="none" />
          <circle cx="24" cy="34" r="3.6" fill="#0b4d3a" />
          <circle cx="40" cy="34" r="3.6" fill="#0b4d3a" />
          <circle cx="25.2" cy="32.8" r="1.2" fill="#ffffff" />
          <circle cx="41.2" cy="32.8" r="1.2" fill="#ffffff" />
          <path d="M27 42c3 3 7 3 10 0" stroke="#0b4d3a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <ellipse cx="18" cy="42" rx="4" ry="2.5" fill="#ff8fc7" opacity="0.55" />
          <ellipse cx="46" cy="42" rx="4" ry="2.5" fill="#ff8fc7" opacity="0.55" />
        </svg>
      );

    case 'bubble':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <radialGradient id="ta-bubble" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="70%" stopColor="#c4f1ff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.45" />
            </radialGradient>
            <linearGradient id="ta-bubble-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="35%" stopColor="#f0abfc" />
              <stop offset="65%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="29" fill="url(#ta-bubble)" />
          <circle cx="32" cy="32" r="28.5" fill="none" stroke="url(#ta-bubble-rim)" strokeWidth="3" opacity="0.9" />
          <path d="M14 26a19 19 0 0 1 14-13" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.85" />
          <circle cx="17" cy="34" r="2.4" fill="#ffffff" opacity="0.8" />
          <path d="M44 50a19 19 0 0 0 8-8" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45" />
        </svg>
      );

    case 'candy':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <clipPath id="ta-candy-clip">
              <circle cx="32" cy="32" r="27" />
            </clipPath>
            <radialGradient id="ta-candy-shine" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M5 32l-4-9v18zM59 32l4-9v18z" fill="#ff9f43" />
          <circle cx="32" cy="32" r="27" fill="#ffffff" />
          <g clipPath="url(#ta-candy-clip)">
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <path key={angle} d="M32 32C40 20 52 18 62 22L62 0 32 0z" fill={angle % 120 ? '#ffd166' : '#ff7a3d'} transform={`rotate(${angle} 32 32)`} />
            ))}
          </g>
          <circle cx="32" cy="32" r="27" fill="url(#ta-candy-shine)" />
          <circle cx="32" cy="32" r="27" fill="none" stroke="#e8590c" strokeOpacity="0.4" strokeWidth="2" />
        </svg>
      );

    case 'golden':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <radialGradient id="ta-gold" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#fffbe6" />
              <stop offset="40%" stopColor="#ffd25e" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="34" r="27" fill="#b45309" />
          <circle cx="32" cy="31" r="27" fill="url(#ta-gold)" />
          <circle cx="32" cy="31" r="21" fill="none" stroke="#fff6d6" strokeOpacity="0.75" strokeWidth="2.5" strokeDasharray="3 4" />
          <path d="M32 14l4.8 10.2 11.2 1.3-8.3 7.6 2.3 11-10-5.6-10 5.6 2.3-11-8.3-7.6 11.2-1.3z" fill="#fff8e1" stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M54 6l1.6 4.4L60 12l-4.4 1.6L54 18l-1.6-4.4L48 12l4.4-1.6z" fill="#ffffff" className="ta-twinkle" />
        </svg>
      );

    case 'rocket':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <radialGradient id="ta-rocket" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#c8fff0" />
              <stop offset="55%" stopColor="#3ee8b5" />
              <stop offset="100%" stopColor="#0f9e7a" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="30" fill="url(#ta-rocket)" />
          <g transform="rotate(45 32 32)">
            <path d="M32 12c6 5 8 12 8 20v8H24v-8c0-8 2-15 8-20z" fill="#ffffff" />
            <circle cx="32" cy="27" r="4" fill="#0f9e7a" />
            <path d="M24 34l-6 8h6zM40 34l6 8h-6z" fill="#ff5fae" />
            <path d="M27 40h10l-5 10z" fill="#ffc94a" />
          </g>
        </svg>
      );

    case 'bomb':
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <radialGradient id="ta-bomb" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#6b5a8e" />
              <stop offset="60%" stopColor="#2a1f45" />
              <stop offset="100%" stopColor="#140e26" />
            </radialGradient>
          </defs>
          <circle cx="30" cy="36" r="24" fill="url(#ta-bomb)" stroke="#ff6b7a" strokeWidth="2.5" />
          <rect x="36" y="8" width="10" height="9" rx="2" transform="rotate(35 41 12)" fill="#4b3d6b" />
          <path d="M45 9c3-4 8-3 9 0" stroke="#ffc94a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="55" cy="8" r="4" fill="#ff6b7a" className="ta-fuse" />
          <circle cx="55" cy="8" r="2" fill="#ffe08a" />
          <path d="M21 32l6 6m0-6l-6 6M33 32l6 6m0-6l-6 6" stroke="#ff6b7a" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 64 64" aria-hidden>
          <defs>
            <radialGradient id="ta-coin" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#e3f3ff" />
              <stop offset="50%" stopColor="#5b9dff" />
              <stop offset="100%" stopColor="#3b4fd8" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="34" r="28" fill="#2c3aa8" />
          <circle cx="32" cy="31" r="28" fill="url(#ta-coin)" />
          <circle cx="32" cy="31" r="21" fill="none" stroke="#e3f1ff" strokeOpacity="0.6" strokeWidth="2.5" />
          <text x="32" y="38.5" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="19" fill="#ffffff">
            G$
          </text>
        </svg>
      );
  }
}
