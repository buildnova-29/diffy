/** The diffy mark: two overlapping sheets, violet behind, lime in front. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <rect x="4" y="4" width="34" height="42" rx="7" fill="var(--surface)" stroke="var(--brand-1)" strokeWidth="3.5" />
      <rect x="20" y="14" width="34" height="42" rx="7" fill="var(--surface)" stroke="var(--brand-2)" strokeWidth="3.5" />
      <path d="M27 24h20M27 44h20" stroke="var(--border)" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="27" y="30" width="20" height="8" rx="2" fill="var(--brand-2)" opacity="0.35" />
    </svg>
  )
}

/** Mark + lowercase word, with the two f's in the brand colours. */
export function Logo() {
  return (
    <span className="logo" role="img" aria-label="diffy">
      <LogoMark />
      <span className="logo-word" aria-hidden="true">
        di<span style={{ color: 'var(--brand-1)' }}>f</span>
        <span style={{ color: 'var(--brand-2)' }}>f</span>y
      </span>
    </span>
  )
}
