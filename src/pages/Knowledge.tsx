import { BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Page } from "@/components/Page";
import { KB, type KbKind } from "@/sim/knowledge";
import { AGENTS } from "@/sim/agents";
import { clock } from "@/sim/time";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

const KINDS: KbKind[] = ["MOP", "Policy", "Change", "Past incident", "Vendor bulletin", "Contract", "Feed"];

export default function Knowledge() {
  const { incidents } = useSim();
  const [kind, setKind] = useState<KbKind | "All">("All");

  const citations = useMemo(() => {
    const m: Record<string, { t: number; agent: string; incident: string }[]> = {};
    for (const s of incidents) for (const x of s.steps) if (x.status === "done") for (const id of x.step.kb ?? []) (m[id] ??= []).push({ t: x.at, agent: AGENTS[x.step.agent].name, incident: s.incident.number });
    return m;
  }, [incidents]);

  const learned = incidents.flatMap((s) => s.steps.filter((x) => x.status === "done" && x.step.kind === "learn").map((x) => ({ t: x.at, title: x.step.title, body: x.step.body, incident: s.incident.number })));
  const list = KB.filter((k) => kind === "All" || k.kind === kind);

  return (
    <Page eyebrow="Knowledge" title="What the agents know, and what they learned today" intro="Methods of procedure, policies, change records, vendor bulletins and past incidents. Every step an agent takes cites the entries it used.">
      {learned.length > 0 && (
        <div className="mb-6 card p-5">
          <p className="eyebrow">Learned today</p>
          <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {learned.map((l) => (
              <div key={l.title} className="rounded-xl border border-brand/40 bg-brand/[0.06] p-4">
                <p className="font-mono text-[11px] text-ink-4">{clock(l.t)} · {l.incident}</p>
                <p className="mt-1 text-[13.5px] font-semibold text-ink">{l.title}</p>
                {l.body && <p className="mt-1 text-[12.5px] leading-5 text-ink-3">{l.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", ...KINDS] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cx("rounded-full border px-3 py-1 text-[12.5px] font-medium", kind === k ? "border-brand bg-brand/10 text-ink" : "border-line text-ink-3 hover:text-ink")}>{k}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {list.map((k) => {
          const cites = citations[k.id] ?? [];
          return (
            <div key={k.id} className="card p-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand" />
                <span className="font-mono text-[12px] font-semibold text-ink">{k.id}</span>
                <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10.5px] text-ink-3">{k.kind}</span>
                <span className="ml-auto text-[11.5px] text-ink-4">{k.owner}</span>
              </div>
              <p className="mt-2 text-[15px] font-semibold text-ink">{k.title}</p>
              <p className="mt-1 text-[13px] leading-5 text-ink-3">{k.summary}</p>
              <div className="mt-3 border-t border-line pt-3 text-[12px]">
                {cites.length ? (
                  <p className="text-ink-2">Cited {cites.length}× today · last by <span className="font-semibold">{cites[cites.length - 1].agent}</span> at {clock(cites[cites.length - 1].t)} on {cites[cites.length - 1].incident}</p>
                ) : <p className="text-ink-4">Not cited yet today</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
