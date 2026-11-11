import { MascotArt } from '@/components/game/Mascot';
import { TokenArt } from '@/components/game/TokenArt';
import type { Skin } from '@/lib/game-rules';

/** Tile colours per tier, light → deep, so bigger treats read as more valuable at a glance. */
export const TIER_STYLE: { bg: string; glow: string }[] = [
  { bg: 'linear-gradient(160deg, #ffe0f0, #ffb3d9)', glow: 'rgba(255,143,199,0.5)' },
  { bg: 'linear-gradient(160deg, #d6fff1, #8ff0cf)', glow: 'rgba(62,232,181,0.5)' },
  { bg: 'linear-gradient(160deg, #e0f7ff, #9fdcfb)', glow: 'rgba(125,211,252,0.55)' },
  { bg: 'linear-gradient(160deg, #fff0d6, #ffc98a)', glow: 'rgba(255,176,87,0.55)' },
  { bg: 'linear-gradient(160deg, #ffd6ec, #f472b6)', glow: 'rgba(244,114,182,0.6)' },
  { bg: 'linear-gradient(160deg, #eadcff, #b98bff)', glow: 'rgba(185,139,255,0.6)' },
  { bg: 'linear-gradient(160deg, #ffe1e6, #fb7185)', glow: 'rgba(251,113,133,0.65)' },
  { bg: 'linear-gradient(160deg, #dbeafe, #5b8cff)', glow: 'rgba(91,140,255,0.7)' },
  { bg: 'linear-gradient(160deg, #fff7d1, #fbbf24)', glow: 'rgba(251,191,36,0.75)' },
  { bg: 'linear-gradient(160deg, #ffe9a8, #f59e0b 60%, #b45309)', glow: 'rgba(245,158,11,0.85)' },
  { bg: 'linear-gradient(135deg, #ff5fae, #ffc94a, #3ee8b5, #5b7cff, #9b6bff)', glow: 'rgba(255,255,255,0.9)' },
];

export const tierStyle = (tier: number) => TIER_STYLE[Math.min(tier, TIER_STYLE.length) - 1];

const SKIN_FOR_TIER: Partial<Record<number, Skin>> = {
  1: 'jelly-drop',
  2: 'jelly-cube',
  3: 'bubble',
  4: 'candy',
  8: 'coin',
  9: 'golden',
};

function Lollipop() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <rect x="30" y="34" width="4" height="26" rx="2" fill="#fff7ed" stroke="#e7c9a9" />
      <circle cx="32" cy="26" r="20" fill="#ff5fae" />
      <path d="M32 26m-14 0a14 14 0 1 1 28 0a10 10 0 1 1-20 0a6 6 0 1 1 12 0a2.5 2.5 0 1 1-5 0" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="24" cy="16" rx="5" ry="3" fill="#ffffff" opacity="0.55" transform="rotate(-30 24 16)" />
    </svg>
  );
}

function Donut() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="34" r="26" fill="#d8955a" />
      <path d="M8 31a24 22 0 0 1 48 0c0 6-4 4-6 8s-6 2-9 5-7 0-9 3-6-1-9-3-6 0-9-4-6-3-6-9z" fill="#ff7ac0" />
      <circle cx="32" cy="32" r="8" fill="#5a3a7a" />
      <circle cx="32" cy="32" r="8" fill="none" stroke="#c46d9e" strokeWidth="2" />
      {[
        [18, 22, '#fff27a', 20],
        [44, 20, '#7ce8ff', -30],
        [22, 40, '#9dffb0', 60],
        [46, 38, '#ffffff', 10],
        [33, 16, '#c4b5fd', 80],
        [40, 46, '#fff27a', -50],
      ].map(([x, y, color, rot], i) => (
        <rect key={i} x={Number(x) - 3} y={Number(y) - 1} width="6" height="2.4" rx="1.2" fill={String(color)} transform={`rotate(${rot} ${x} ${y})`} />
      ))}
      <ellipse cx="20" cy="18" rx="6" ry="3" fill="#ffffff" opacity="0.45" transform="rotate(-25 20 18)" />
    </svg>
  );
}

function Cupcake() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <path d="M14 34h36l-5 24H19z" fill="#7cc0ff" />
      <path d="M20 34l3 24M28 34l1 24M36 34l-1 24M44 34l-3 24" stroke="#4f8fd6" strokeWidth="2" />
      <path d="M12 36c-4-8 4-14 10-12 0-8 8-12 14-8 6-4 14 2 12 8 8 0 10 8 4 12z" fill="#fff0f6" />
      <path d="M18 30c4 2 8 2 12 0M34 28c4 2 8 2 12 0" stroke="#ffc2dc" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="33" cy="12" r="5.5" fill="#ff3b6b" />
      <path d="M33 7c1-3 4-4 6-4" stroke="#3f9b4a" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="31" cy="10.5" r="1.6" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}

function Crown() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="crown-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="60%" stopColor="#ffc94a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path d="M8 22l12 12 12-20 12 20 12-12-5 30H13z" fill="url(#crown-gold)" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" />
      <rect x="13" y="48" width="38" height="8" rx="3" fill="url(#crown-gold)" stroke="#b45309" strokeWidth="2" />
      <circle cx="32" cy="36" r="5" fill="#ff5fae" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="20" cy="40" r="3" fill="#3ee8b5" />
      <circle cx="44" cy="40" r="3" fill="#5b7cff" />
      {[8, 32, 56].map((x, i) => (
        <circle key={x} cx={x} cy={i === 1 ? 12 : 20} r="3.5" fill="#fff8e1" stroke="#b45309" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function TierArt({ tier }: { tier: number }) {
  const skin = SKIN_FOR_TIER[tier];
  if (skin) return <TokenArt skin={skin} />;
  if (tier === 5) return <Lollipop />;
  if (tier === 6) return <Donut />;
  if (tier === 7) return <Cupcake />;
  if (tier === 10) return <Crown />;
  return <MascotArt mood="excited" />;
}
