/**
 * Xurri product banner — a self-contained SVG with logo, mascot, and candy-arcade art.
 * Drop it anywhere: social cards, README, splash screens, etc.
 *
 * Usage:
 *   <Banner />                   — default 1200×630 (og:image / Twitter card)
 *   <Banner width={800} />       — scales proportionally
 *   <Banner variant="square" />  — 1080×1080 (Instagram)
 *   <Banner variant="wide" />    — 1200×630 (default)
 */

type Variant = 'wide' | 'square';

interface BannerProps {
  /** Output width in px; height is derived from the variant aspect ratio. */
  width?: number;
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
}

const DIMENSIONS: Record<Variant, [number, number]> = {
  wide: [1200, 630],
  square: [1080, 1080],
};

// ---------------------------------------------------------------------------
// Sub-components (all self-contained SVG fragments)
// ---------------------------------------------------------------------------

/** Xurri wordmark, sized for the banner. */
function BannerLogo({ x, y, size = 72 }: { x: number; y: number; size?: number }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
      fontWeight="800"
      fontSize={size}
      letterSpacing="-1"
      dominantBaseline="auto"
    >
      <tspan fill="#ff6a2b">X</tspan>
      <tspan fill="#ffffff">urri</tspan>
    </text>
  );
}

/** Arcade coin (G$). */
function Coin({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const id = `banner-coin-${cx}`;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-f`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fff8d6" />
          <stop offset="40%" stopColor="#ffd84f" />
          <stop offset="80%" stopColor="#f3a817" />
          <stop offset="100%" stopColor="#d48a0c" />
        </radialGradient>
      </defs>
      {/* thickness */}
      <circle cx={cx} cy={cy + r * 0.14} r={r} fill="#8f4f04" />
      {/* face */}
      <circle cx={cx} cy={cy} r={r} fill="#f0a514" />
      <circle cx={cx} cy={cy} r={r * 0.82} fill={`url(#${id}-f)`} />
      {/* label */}
      <text
        x={cx}
        y={cy + r * 0.3}
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize={r * 0.65}
        fill="#a85f04"
      >
        G$
      </text>
      {/* glint */}
      <path
        d={`M${cx - r * 0.55} ${cy - r * 0.3}L${cx - r * 0.1} ${cy - r * 0.78}h${r * 0.3}L${cx - r * 0.25} ${cy - r * 0.3}z`}
        fill="#ffffff"
        opacity="0.45"
      />
    </g>
  );
}

/** The Bloop mascot body, simplified for large banner rendering. */
function BloopMascot({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const scale = r / 50;
  return (
    <g transform={`translate(${cx - r}, ${cy - r * 1.1}) scale(${scale * 2})`}>
      <defs>
        <radialGradient id="banner-bloop-body" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffe6ee" />
          <stop offset="45%" stopColor="#ff8fb3" />
          <stop offset="100%" stopColor="#f0507f" />
        </radialGradient>
        <radialGradient id="banner-bloop-coin" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="60%" stopColor="#ffc94a" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
      </defs>
      {/* antenna */}
      <path d="M50 22c0-6 4-10 8-12" stroke="#e8507c" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* antenna coin */}
      <circle cx="59" cy="9" r="7" fill="url(#banner-bloop-coin)" />
      <text x="59" y="12" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="900" fontSize="5.5" fill="#a85f04">G$</text>
      {/* body */}
      <path
        d="M50 20C74 20 88 40 88 62c0 14-6 22-14 24-4 1-6-3-10-3s-6 5-14 5-10-5-14-5-6 4-10 3C18 84 12 76 12 62 12 40 26 20 50 20z"
        fill="url(#banner-bloop-body)"
      />
      {/* highlight */}
      <ellipse cx="32" cy="36" rx="8" ry="12" transform="rotate(30 32 36)" fill="#ffffff" opacity="0.5" />
      {/* cheeks */}
      <ellipse cx="26" cy="60" rx="6" ry="3.5" fill="#ff5c8a" opacity="0.55" />
      <ellipse cx="74" cy="60" rx="6" ry="3.5" fill="#ff5c8a" opacity="0.55" />
      {/* happy eyes */}
      <g stroke="#4a1a24" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M30 50q7-9 14 0" />
        <path d="M56 50q7-9 14 0" />
      </g>
      {/* happy mouth */}
      <path d="M40 62q10 14 20 0z" fill="#6b1430" />
      <path d="M45 67q5 4 10 0" fill="#ff7a9c" />
    </g>
  );
}

/** Floating token cluster (candy-arcade tokens). */
function FloatingTokens({ x, y }: { x: number; y: number }) {
  return (
    <g opacity="0.92">
      {/* large candy-orange drop */}
      <g transform={`translate(${x}, ${y})`}>
        <defs>
          <radialGradient id="ft-candy" cx="40%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#ffc2de" />
            <stop offset="45%" stopColor="#ff5aa2" />
            <stop offset="85%" stopColor="#e0267a" />
          </radialGradient>
          <radialGradient id="ft-blue" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#b6e3ff" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#8fc9ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="ft-green" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#c6ffe7" />
            <stop offset="45%" stopColor="#40e3a4" />
            <stop offset="100%" stopColor="#0c9b68" />
          </radialGradient>
        </defs>
        {/* jelly drop */}
        <path d="M0 -58C10 -44 28 -28 28 -14c0 11-10.7 18-24 18S-20 -3 -20 -14C-20 -28 -10 -44 0 -58z"
          fill="url(#ft-candy)" transform="scale(1.4)" />
        {/* bubble */}
        <circle cx="80" cy="30" r="30" fill="url(#ft-blue)" stroke="#e39bff" strokeWidth="2.5" />
        <path d="M56 22a18 18 0 0 1 12-10" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.8" fill="none" />
        {/* jelly cube */}
        <rect x="-80" y="10" width="52" height="48" rx="17" fill="url(#ft-green)" />
        <path d="M-74 16h40" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** Radiating sun burst behind the mascot. */
function SunBurst({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g opacity="0.18">
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i * 360) / 16;
        const rad = (angle * Math.PI) / 180;
        const x2 = cx + Math.cos(rad) * r;
        const y2 = cy + Math.sin(rad) * r;
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={i % 2 === 0 ? 3 : 1.5} />;
      })}
    </g>
  );
}

/** Arcade-dotted confetti scatter. */
function Confetti({ w, h }: { w: number; h: number }) {
  const dots = [
    { x: 0.07, y: 0.15, r: 7, fill: '#ff6a2b', op: 0.7 },
    { x: 0.14, y: 0.72, r: 5, fill: '#ffc933', op: 0.6 },
    { x: 0.22, y: 0.42, r: 4, fill: '#ff5c8a', op: 0.55 },
    { x: 0.88, y: 0.12, r: 8, fill: '#34a6ff', op: 0.6 },
    { x: 0.78, y: 0.68, r: 5, fill: '#22c58b', op: 0.65 },
    { x: 0.93, y: 0.52, r: 4, fill: '#ffc933', op: 0.5 },
    { x: 0.5, y: 0.08, r: 6, fill: '#ff5c8a', op: 0.45 },
    { x: 0.3, y: 0.88, r: 5, fill: '#ff6a2b', op: 0.4 },
    { x: 0.65, y: 0.9, r: 4, fill: '#34a6ff', op: 0.4 },
    { x: 0.04, y: 0.9, r: 3, fill: '#22c58b', op: 0.5 },
    { x: 0.97, y: 0.82, r: 3, fill: '#ff5c8a', op: 0.5 },
  ];
  return (
    <g>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x * w} cy={d.y * h} r={d.r} fill={d.fill} opacity={d.op} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main banner
// ---------------------------------------------------------------------------

export function Banner({ width, variant = 'wide', className, style }: BannerProps) {
  const [vw, vh] = DIMENSIONS[variant];
  const scale = width ? width / vw : 1;
  const computedWidth = width ?? vw;
  const computedHeight = Math.round(vh * scale);

  // Layout constants (all in the native vw×vh coordinate space)
  const isSquare = variant === 'square';

  const mascotCx = isSquare ? vw * 0.5 : vw * 0.72;
  const mascotCy = isSquare ? vh * 0.56 : vh * 0.56;
  const mascotR = isSquare ? 165 : 140;

  const logoCy = isSquare ? vh * 0.19 : vh * 0.38;
  const logoX = isSquare ? vw * 0.5 - 170 : 76;
  const logoSize = isSquare ? 96 : 80;

  const taglineX = isSquare ? vw * 0.5 : 76;
  const taglineAnchor = isSquare ? 'middle' : 'start';
  const taglineY = isSquare ? vh * 0.29 : vh * 0.56;

  const coinPositions = isSquare
    ? [
        { cx: vw * 0.14, cy: vh * 0.18, r: 36 },
        { cx: vw * 0.86, cy: vh * 0.22, r: 28 },
        { cx: vw * 0.1, cy: vh * 0.82, r: 24 },
        { cx: vw * 0.9, cy: vh * 0.78, r: 32 },
      ]
    : [
        { cx: 140, cy: vh * 0.18, r: 44 },
        { cx: 60, cy: vh * 0.74, r: 30 },
        { cx: vw * 0.5, cy: vh * 0.1, r: 26 },
        { cx: vw * 0.9, cy: vh * 0.82, r: 34 },
      ];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vw} ${vh}`}
      width={computedWidth}
      height={computedHeight}
      className={className}
      style={style}
      role="img"
      aria-label="Xurri — Earn while you play"
    >
      {/* ── background: deep navy with brand-orange glow ── */}
      <defs>
        <linearGradient id="banner-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a3157" />
          <stop offset="100%" stopColor="#0f1c33" />
        </linearGradient>
        <radialGradient id="banner-glow" cx="70%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#ff6a2b" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ff6a2b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="banner-glow2" cx="20%" cy="80%" r="45%">
          <stop offset="0%" stopColor="#ff5c8a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ff5c8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="banner-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="60%" stopColor="#ff6a2b" />
          <stop offset="100%" stopColor="#f2456a" />
        </linearGradient>
        <filter id="banner-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* base */}
      <rect width={vw} height={vh} rx="32" fill="url(#banner-bg)" />
      <rect width={vw} height={vh} rx="32" fill="url(#banner-glow)" />
      <rect width={vw} height={vh} rx="32" fill="url(#banner-glow2)" />

      {/* confetti */}
      <Confetti w={vw} h={vh} />

      {/* sun burst behind mascot */}
      <SunBurst cx={mascotCx} cy={mascotCy} r={mascotR * 2.6} />

      {/* mascot glow halo */}
      <circle cx={mascotCx} cy={mascotCy + 20} r={mascotR * 1.1} fill="#ff6a2b" opacity="0.12" />

      {/* floating tokens (left side in wide, bottom in square) */}
      {!isSquare && <FloatingTokens x={vw * 0.38} y={vh * 0.68} />}

      {/* mascot */}
      <BloopMascot cx={mascotCx} cy={mascotCy} r={mascotR} />

      {/* mascot shadow */}
      <ellipse cx={mascotCx} cy={mascotCy + mascotR * 1.0} rx={mascotR * 0.8} ry={mascotR * 0.14} fill="#000000" opacity="0.18" />

      {/* coins */}
      {coinPositions.map((c, i) => (
        <Coin key={i} cx={c.cx} cy={c.cy} r={c.r} />
      ))}

      {/* ── wordmark ── */}
      <BannerLogo x={logoX} y={logoCy} size={logoSize} />

      {/* pill badge */}
      {!isSquare && (
        <g transform={`translate(76, ${logoCy + 18})`}>
          <rect width="140" height="30" rx="15" fill="rgba(255,106,43,0.18)" />
          <rect width="140" height="30" rx="15" fill="none" stroke="#ff6a2b" strokeWidth="1.5" strokeOpacity="0.6" />
          <text
            x="70"
            y="20"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="800"
            fontSize="13"
            letterSpacing="1.5"
            fill="#ffb48c"
          >
            PLAY · EARN · WIN
          </text>
        </g>
      )}

      {/* tagline */}
      <text
        x={taglineX}
        y={taglineY}
        textAnchor={taglineAnchor}
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="800"
        fontSize={isSquare ? 48 : 42}
        fill="#ffffff"
        opacity="0.95"
      >
        Earn while you play.
      </text>

      {/* sub-tagline */}
      <text
        x={taglineX}
        y={taglineY + (isSquare ? 60 : 52)}
        textAnchor={taglineAnchor}
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="600"
        fontSize={isSquare ? 28 : 24}
        fill="rgba(255,255,255,0.6)"
      >
        Catch tokens, collect G$ rewards.
      </text>

      {/* CTA pill */}
      <g transform={`translate(${taglineX - (isSquare ? 100 : 0)}, ${taglineY + (isSquare ? 110 : 100)})`}>
        <rect
          width="200"
          height="52"
          rx="14"
          fill="url(#banner-brand)"
          style={{ filter: 'drop-shadow(0 4px 0 #d84a10) drop-shadow(0 8px 18px rgba(216,74,16,0.35))' }}
        />
        <text
          x="100"
          y="34"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontWeight="800"
          fontSize="20"
          fill="#ffffff"
        >
          Play Free Now
        </text>
      </g>

      {/* bottom-right wordmark repeat (subtle) */}
      <text
        x={vw - 28}
        y={vh - 28}
        textAnchor="end"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="rgba(255,255,255,0.22)"
      >
        xurri.app
      </text>

      {/* border inner glow */}
      <rect
        width={vw}
        height={vh}
        rx="32"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="2"
      />
    </svg>
  );
}
