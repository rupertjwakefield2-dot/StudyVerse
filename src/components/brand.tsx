import Link from "next/link";

export function Logo({ size = 28, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group">
      <span
        className="relative inline-grid place-items-center rounded-xl bg-iris text-white shadow-[0_6px_20px_-6px_rgb(var(--iris)/0.8)]"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="7" r="2" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M8 6.5 16 7M7.5 8 7 16M8.5 17l7-8M16 9l1 6" />
        </svg>
      </span>
      {withWord && (
        <span className="font-display text-[17px] font-700 font-bold tracking-tight text-ink">
          Synapse
        </span>
      )}
    </Link>
  );
}
