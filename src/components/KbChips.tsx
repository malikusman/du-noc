import { BookOpen } from "lucide-react";
import { KB_BY_ID } from "@/sim/knowledge";

export function KbChips({ ids }: { ids: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {ids.map((id) => {
        const entry = KB_BY_ID[id];
        return (
          <span key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 py-1 text-[12px] text-ink-2" title={entry?.summary}>
            <BookOpen className="h-3.5 w-3.5 text-brand" />
            <span className="font-mono text-[11px] font-semibold text-ink">{id}</span>
            {entry && <span className="text-ink-3">{entry.title}</span>}
          </span>
        );
      })}
    </div>
  );
}
