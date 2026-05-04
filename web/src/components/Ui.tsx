import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[#1a1a26] p-6 shadow-lg shadow-black/30 ${className}`}
    >
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-white/90">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-white/50">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400"
        aria-hidden
      />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
    >
      {message}
    </div>
  );
}
