// The "Office App" mark from the design handoff (Office App Icon.dc.html):
// two solid white buildings — a tall block with six windows and a lower
// wing with a canopy/doorway — knocked out of a flat #14304F field. Window
/// door cutouts use var(--color-accent) rather than a hardcoded hex so
// they stay in sync with the background if that token ever changes again.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div
      className="bg-accent grid shrink-0 place-items-center rounded-[22%] shadow-[0_6px_18px_-6px_rgba(20,48,79,0.55)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 132 132" width={size * 0.62} height={size * 0.62} aria-hidden="true">
        <path d="M18 24h50v84H18z" fill="#ffffff" />
        <path d="M74 46h40v6H74z" fill="#ffffff" />
        <path d="M74 58h40v50H74z" fill="#ffffff" />
        <rect x="28" y="34" width="12" height="12" fill="var(--color-accent)" />
        <rect x="46" y="34" width="12" height="12" fill="var(--color-accent)" />
        <rect x="28" y="55" width="12" height="12" fill="var(--color-accent)" />
        <rect x="46" y="55" width="12" height="12" fill="var(--color-accent)" />
        <rect x="28" y="76" width="12" height="12" fill="var(--color-accent)" />
        <rect x="46" y="76" width="12" height="12" fill="var(--color-accent)" />
        <rect x="86" y="86" width="16" height="22" fill="var(--color-accent)" />
      </svg>
    </div>
  );
}
