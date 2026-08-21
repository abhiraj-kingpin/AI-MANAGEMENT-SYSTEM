/**
 * The brand mark — a brain-and-circuit line icon (white stroke) on a
 * rounded-square `brand-gradient` badge, replacing the plain "AI" text
 * glyph the app used before. Traces the same brain/circuit motif as the
 * project's full logo artwork, redrawn as a single-color line icon so it
 * reads clearly at the ~30px badge size used in the Sidebar and on the
 * Login screen.
 */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div
      className="brand-gradient grid shrink-0 place-items-center rounded-[10px] shadow-[0_6px_18px_-6px_rgba(255,138,61,0.55)]"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 3.5c-1.7 0-3 1.3-3 3 0 .3 0 .6.1.9C4.8 8 4 9.3 4 10.8c0 1.3.6 2.4 1.5 3.1-.3.5-.5 1.1-.5 1.7 0 1.7 1.3 3 3 3 .3 0 .6 0 .9-.1.3 1 1.2 1.8 2.3 1.9" />
        <path d="M15 3.5c1.7 0 3 1.3 3 3 0 .3 0 .6-.1.9 1.3.6 2.1 1.9 2.1 3.4 0 1.3-.6 2.4-1.5 3.1.3.5.5 1.1.5 1.7 0 1.7-1.3 3-3 3-.3 0-.6 0-.9-.1-.3 1-1.2 1.8-2.3 1.9" />
        <path d="M9 3.5c1.1 0 2 .5 2.6 1.3M15 3.5c-1.1 0-2 .5-2.6 1.3M9 20.3v-2M15 20.3v-2" />
        <circle cx="12" cy="11" r="0.65" fill="#ffffff" />
        <circle cx="8.5" cy="9.5" r="0.65" fill="#ffffff" />
        <circle cx="15.5" cy="9.5" r="0.65" fill="#ffffff" />
        <circle cx="10.5" cy="13.5" r="0.65" fill="#ffffff" />
        <path d="M12 11L8.5 9.5M12 11L15.5 9.5M12 11L10.5 13.5" />
        <path d="M15.5 9.5h2.2M17.7 9.5v-1.3" />
      </svg>
    </div>
  );
}
