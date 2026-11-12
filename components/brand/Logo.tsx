/** Xurri's mark: a chunky candy "X" popping out of a bubble, on a warm squircle. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo-svg">
      <defs>
        <linearGradient id="xurri-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffb547" />
          <stop offset="55%" stopColor="#ff7a2f" />
          <stop offset="100%" stopColor="#ff5c8a" />
        </linearGradient>
        <linearGradient id="xurri-x" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffeede" />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="60" height="58" rx="18" fill="#d9520a" />
      <rect x="2" y="2" width="60" height="57" rx="18" fill="url(#xurri-bg)" />
      {/* glossy bubble behind the X */}
      <circle cx="32" cy="31" r="19" fill="#ffffff" opacity="0.18" />
      <path d="M17 24a16 16 0 0 1 12-10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.55" fill="none" />
      {/* the X: two rounded candy bars with a soft drop shadow */}
      <g transform="translate(0 2)" opacity="0.28" fill="#a3300a">
        <rect x="27" y="13" width="10" height="36" rx="5" transform="rotate(45 32 31)" />
        <rect x="27" y="13" width="10" height="36" rx="5" transform="rotate(-45 32 31)" />
      </g>
      <g fill="url(#xurri-x)">
        <rect x="27" y="13" width="10" height="36" rx="5" transform="rotate(45 32 31)" />
        <rect x="27" y="13" width="10" height="36" rx="5" transform="rotate(-45 32 31)" />
      </g>
      <circle cx="32" cy="31" r="3.2" fill="#ff7a2f" />
      {/* sparkle and floating bubbles */}
      <path d="M50 10l1.5 3.5L55 15l-3.5 1.5L50 20l-1.5-3.5L45 15l3.5-1.5z" fill="#fff6c2" />
      <circle cx="13" cy="48" r="3" fill="#ffffff" opacity="0.6" />
      <circle cx="19" cy="53" r="1.6" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="logo" aria-label="Xurri">
      <LogoMark size={size} />
      <span className="logo-word" aria-hidden>
        <em>X</em>urri
      </span>
    </span>
  );
}
