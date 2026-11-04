import type { ReactNode } from "react";

export function Page({ eyebrow, title, intro, right, children }: { eyebrow: string; title: string; intro?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-8 pb-16 pt-8">
      <div className="mb-7 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-[32px] font-extrabold leading-9 tracking-tight text-ink">{title}</h1>
          {intro && <p className="mt-2 max-w-3xl text-[14.5px] leading-6 text-ink-3">{intro}</p>}
        </div>
        {right}
      </div>
      {children}
    </main>
  );
}

export function Big({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "grad" | "good" | "warn" | "bad" }) {
  const cls = tone === "grad" ? "grad-text" : tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="card p-5">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={`mt-2 font-mono text-[30px] font-semibold leading-none tracking-tight tabular ${cls}`}>{value}</p>
      {sub && <p className="mt-2 text-[12px] text-ink-4">{sub}</p>}
    </div>
  );
}
