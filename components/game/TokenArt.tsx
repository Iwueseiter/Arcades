import type { Skin } from '@/lib/game-rules';

/** Main colour of each skin, used for burst particles and splats. */
export const SKIN_COLORS: Record<Skin, string[]> = {
  standard: ['#ffd34d', '#fff1b0', '#ffffff'],
  coin: ['#ffd34d', '#fff1b0', '#f2a516'],
  'jelly-drop': ['#ff4f9a', '#ff9fc8', '#ffd6ea'],
  'jelly-cube': ['#2fd99a', '#8ff0c9', '#d6fff0'],
  bubble: ['#9fd8ff', '#e2a8ff', '#ffffff'],
  candy: ['#ff8a3d', '#ffd166', '#ffffff'],
  golden: ['#ffd34d', '#ffffff', '#fff1b0'],
  rocket: ['#3ee8b5', '#ffffff', '#ff5fae'],
  bomb: ['#ff5f6d', '#2a1f45', '#ffc94a'],
};

/*
 * Every token follows the same lighting so the set reads as one family:
 * light from the top-left, a soft white highlight, a crisp specular dot,
 * and a darker rim at the bottom-right that gives the shape volume.
 */

function Coin({ star = false }: { star?: boolean }) {
  const id = star ? 'star' : 'coin';
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id={`${id}-face`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fff8d6" />
          <stop offset="40%" stopColor="#ffd84f" />
          <stop offset="80%" stopColor="#f3a817" />
          <stop offset="100%" stopColor="#d48a0c" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3b8" />
          <stop offset="50%" stopColor="#f0a514" />
          <stop offset="100%" stopColor="#b56b06" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8900d" />
          <stop offset="100%" stopColor="#8f4f04" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="30" r="26" />
        </clipPath>
      </defs>
      {star && (
        <g className="ta-rays" opacity="0.9">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M32 30L30 1h4z" fill="#fff4c2" opacity={i % 2 ? 0.5 : 0.9} transform={`rotate(${i * 30} 32 30)`} />
          ))}
        </g>
      )}
      {/* coin thickness with a reeded edge */}
      <circle cx="32" cy="34" r="26" fill={`url(#${id}-edge)`} />
      <circle cx="32" cy="34" r="25" fill="none" stroke="#7a4303" strokeWidth="2" strokeDasharray="1.2 2.2" opacity="0.6" />
      {/* face */}
      <circle cx="32" cy="30" r="26" fill={`url(#${id}-rim)`} />
      <circle cx="32" cy="30" r="21" fill={`url(#${id}-face)`} />
      <circle cx="32" cy="30" r="21" fill="none" stroke="#c07a08" strokeWidth="1.2" opacity="0.7" />
      <circle cx="32" cy="30" r="18.5" fill="none" stroke="#fff3c0" strokeWidth="0.8" opacity="0.7" />
      {star ? (
        <g>
          <path d="M32 17l3.8 8 8.7 1-6.4 6 1.7 8.6L32 36.4l-7.8 4.2 1.7-8.6-6.4-6 8.7-1z" fill="#b8700a" transform="translate(0 1.2)" opacity="0.5" />
          <path d="M32 17l3.8 8 8.7 1-6.4 6 1.7 8.6L32 36.4l-7.8 4.2 1.7-8.6-6.4-6 8.7-1z" fill="#fffbe8" />
        </g>
      ) : (
        <g fontFamily="var(--font-display), system-ui, sans-serif" fontWeight="900" fontSize="17" textAnchor="middle">
          {/* embossed G$: a light bevel under a darker stamp */}
          <text x="32" y="37" fill="#fff4c4">
            G$
          </text>
          <text x="32" y="35.8" fill="#a85f04">
            G$
          </text>
        </g>
      )}
      {/* glint across the face */}
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M8 22L24 6h8L12 30z" fill="#ffffff" opacity="0.45" />
        <path d="M14 30L36 8h4L18 34z" fill="#ffffff" opacity="0.2" />
      </g>
      <path d="M50 8l1.4 3.6L55 13l-3.6 1.4L50 18l-1.4-3.6L45 13l3.6-1.4z" fill="#ffffff" className="ta-twinkle" />
    </svg>
  );
}

function JellyFace({ cx, cy, scale = 1, dark }: { cx: number; cy: number; scale?: number; dark: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <ellipse cx="-7" cy="0" rx="3" ry="3.6" fill={dark} />
      <ellipse cx="7" cy="0" rx="3" ry="3.6" fill={dark} />
      <circle cx="-6" cy="-1.3" r="1.2" fill="#ffffff" />
      <circle cx="8" cy="-1.3" r="1.2" fill="#ffffff" />
      <path d="M-3 5q3 3 6 0" stroke={dark} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="-12" cy="5" rx="3.5" ry="2" fill="#ff6fa8" opacity="0.45" />
      <ellipse cx="12" cy="5" rx="3.5" ry="2" fill="#ff6fa8" opacity="0.45" />
    </g>
  );
}

function JellyDrop() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="jd-body" cx="40%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#ffc2de" />
          <stop offset="45%" stopColor="#ff5aa2" />
          <stop offset="85%" stopColor="#e0267a" />
          <stop offset="100%" stopColor="#b3135c" />
        </radialGradient>
        <radialGradient id="jd-core" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M32 5C40 15 56 28 56 42c0 11-10.7 18-24 18S8 53 8 42C8 28 24 15 32 5z" fill="url(#jd-body)" />
      <path d="M32 5C40 15 56 28 56 42c0 11-10.7 18-24 18S8 53 8 42C8 28 24 15 32 5z" fill="url(#jd-core)" />
      {/* soft inner rim on the shadow side */}
      <path d="M52 40c0 9-8.5 15.5-20 15.5" stroke="#9e0f50" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M20 27c3-6 7-11 11-15" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.7" fill="none" />
      <circle cx="17" cy="35" r="2.4" fill="#ffffff" opacity="0.9" />
      <JellyFace cx={32} cy={42} scale={0.9} dark="#5a0730" />
    </svg>
  );
}

function JellyCube() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="jc-body" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#c6ffe7" />
          <stop offset="40%" stopColor="#40e3a4" />
          <stop offset="100%" stopColor="#0c9b68" />
        </linearGradient>
        <radialGradient id="jc-core" cx="45%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="6" y="9" width="52" height="49" rx="17" fill="url(#jc-body)" />
      <rect x="6" y="9" width="52" height="49" rx="17" fill="url(#jc-core)" />
      {/* top bevel and shadow-side rim */}
      <path d="M14 14h36" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 30v14c0 7-5 11-12 11H24" stroke="#06704a" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M13 28c0-7 4-12 12-13" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.75" fill="none" />
      <circle cx="14" cy="35" r="2.2" fill="#ffffff" opacity="0.85" />
      <JellyFace cx={32} cy={36} dark="#05432d" />
    </svg>
  );
}

function Bubble() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="bb-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b6e3ff" stopOpacity="0.18" />
          <stop offset="62%" stopColor="#8fc9ff" stopOpacity="0.32" />
          <stop offset="86%" stopColor="#d79cff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id="bb-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fe3ff" />
          <stop offset="35%" stopColor="#e39bff" />
          <stop offset="65%" stopColor="#ffd36e" />
          <stop offset="100%" stopColor="#7ff0b5" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#bb-fill)" />
      <circle cx="32" cy="32" r="27.5" fill="none" stroke="url(#bb-rim)" strokeWidth="2.6" />
      {/* window reflection, specular dot and bounce light */}
      <path d="M13 25a20 20 0 0 1 15-14" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9" />
      <rect x="38" y="14" width="7" height="5" rx="1.5" fill="#ffffff" opacity="0.55" transform="rotate(20 41 16)" />
      <circle cx="15" cy="33" r="2.6" fill="#ffffff" />
      <path d="M22 52a22 22 0 0 0 26-6" stroke="#9ff0ff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

function Candy() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="cd-body" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffe2b8" />
          <stop offset="45%" stopColor="#ff9a3d" />
          <stop offset="100%" stopColor="#d9530f" />
        </radialGradient>
        <linearGradient id="cd-wrap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="100%" stopColor="#f07a1f" />
        </linearGradient>
        <clipPath id="cd-clip">
          <circle cx="32" cy="32" r="19" />
        </clipPath>
      </defs>
      {/* twisted wrapper ends */}
      <path d="M14 32L2 20l3 6-3 6 3 6-3 6z" fill="url(#cd-wrap)" />
      <path d="M50 32l12-12-3 6 3 6-3 6 3 6z" fill="url(#cd-wrap)" />
      <path d="M14 32L5 26M14 32L5 38M50 32l9-6M50 32l9 6" stroke="#c4560f" strokeOpacity="0.5" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="19" fill="url(#cd-body)" />
      <g clipPath="url(#cd-clip)" opacity="0.9">
        {[0, 72, 144, 216, 288].map((angle) => (
          <path key={angle} d="M32 32c6-6 14-8 22-6l-2 6c-6-1-13 0-20 0z" fill="#fff6e8" transform={`rotate(${angle} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="19" fill="none" stroke="#b8440a" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M19 27a14 14 0 0 1 9-9" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.75" fill="none" />
      <circle cx="20" cy="33" r="1.8" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

function Rocket() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="rk-orb" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#d9fff2" />
          <stop offset="50%" stopColor="#3ee8b5" />
          <stop offset="100%" stopColor="#0a8f68" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#rk-orb)" />
      <g transform="rotate(45 32 32)">
        <path d="M32 12c6 5 8 12 8 20v8H24v-8c0-8 2-15 8-20z" fill="#ffffff" />
        <circle cx="32" cy="27" r="4" fill="#0f9e7a" />
        <path d="M24 34l-6 8h6zM40 34l6 8h-6z" fill="#ff5fae" />
        <path d="M27 40h10l-5 10z" fill="#ffc94a" />
      </g>
      <path d="M13 24a20 20 0 0 1 13-12" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.6" fill="none" />
    </svg>
  );
}

function Bomb() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="bm-body" cx="36%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#6f6390" />
          <stop offset="55%" stopColor="#2b2147" />
          <stop offset="100%" stopColor="#120c22" />
        </radialGradient>
      </defs>
      <circle cx="30" cy="37" r="23" fill="url(#bm-body)" stroke="#ff5f6d" strokeWidth="2.5" />
      <rect x="35" y="9" width="10" height="9" rx="2" transform="rotate(35 40 13)" fill="#4b3d6b" />
      <path d="M44 10c3-4 8-3 9 0" stroke="#ffc94a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="54" cy="9" r="4" fill="#ff5f6d" className="ta-fuse" />
      <circle cx="54" cy="9" r="2" fill="#ffe08a" />
      <path d="M21 34l6 6m0-6l-6 6M33 34l6 6m0-6l-6 6" stroke="#ff5f6d" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 30a16 16 0 0 1 9-10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.35" fill="none" />
    </svg>
  );
}

/** Hand-drawn SVG tokens so the game stays crisp at any size and needs no image assets. */
export function TokenArt({ skin }: { skin: Skin }) {
  switch (skin) {
    case 'jelly-drop':
      return <JellyDrop />;
    case 'jelly-cube':
      return <JellyCube />;
    case 'bubble':
      return <Bubble />;
    case 'candy':
      return <Candy />;
    case 'golden':
      return <Coin star />;
    case 'rocket':
      return <Rocket />;
    case 'bomb':
      return <Bomb />;
    default:
      return <Coin />;
  }
}
