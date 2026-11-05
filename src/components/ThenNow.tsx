import { History } from "lucide-react";
import { THEN_NOW } from "@/sim/insight";
import { cx } from "@/lib/format";

/** "Last time vs today", from a past incident review. */
export function ThenNowCard({ id, className, compact = false }: { id: string; className?: string; compact?: boolean }) {
  const data = THEN_NOW[id];
  if (!data) return null;
  return (
    <div className={cx("rounded-xl border border-line bg-raised/60 p-4", className)}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3"><History className="h-3.5 w-3.5 text-brand" /> Last time vs today</p>
      <p className="mt-1 text-[11.5px] text-ink-4">{data.source}</p>
      <table className="mt-3 w-full text-[12.5px]">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-wider text-ink-4">
            <th className="pb-1.5 font-semibold" />
            <th className="pb-1.5 font-semibold">Last time</th>
            <th className="pb-1.5 font-semibold">Today</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.label} className="border-t border-line/70">
              <td className={cx("py-1.5 pr-2 text-ink-3", compact && "text-[11.5px]")}>{r.label}</td>
              <td className="py-1.5 pr-2 text-ink-3 line-through decoration-bad/50">{r.then}</td>
              <td className="py-1.5 font-semibold text-good">{r.now}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
