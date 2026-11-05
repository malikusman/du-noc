import { Check, Lock, Unlock } from "lucide-react";
import { useMemo } from "react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Page } from "@/components/Page";
import { AGENTS, AGENT_ORDER, AUTONOMY, GUARDRAILS } from "@/sim/agents";
import { ROUTINE } from "@/sim/routine";
import { SHIFTS, clock } from "@/sim/time";
import type { AgentId } from "@/sim/types";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

export default function Agents() {
  const { state, incidents } = useSim();

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of incidents) for (const x of s.steps) if (x.status === "done") m[x.step.agent] = (m[x.step.agent] ?? 0) + 1;
    for (const r of ROUTINE) if (r.t + r.durationMin <= state.t) m[r.agent] = (m[r.agent] ?? 0) + 1;
    m.scribe = SHIFTS.filter((s) => s.handover <= state.t).length;
    return m;
  }, [incidents, state.t]);

  const working = new Set(incidents.filter((s) => s.status === "investigating" || s.status === "waiting").map((s) => s.next?.step.agent).filter(Boolean) as AgentId[]);

  const handoffs = useMemo(() => {
    const rows: { t: number; from: AgentId; to: AgentId; incident: string; what: string }[] = [];
    for (const s of incidents) {
      const done = s.steps.filter((x) => x.status === "done");
      for (let i = 1; i < done.length; i++) {
        if (done[i].step.agent !== done[i - 1].step.agent) rows.push({ t: done[i].at, from: done[i - 1].step.agent, to: done[i].step.agent, incident: s.incident.number, what: done[i].step.title });
      }
    }
    return rows.sort((a, b) => b.t - a.t).slice(0, 14);
  }, [incidents]);

  return (
    <Page eyebrow="Agent observatory" title="Nine agents, one shift" intro="Restricted agents only read and recommend. Unrestricted agents can change the network, and only inside the guardrails set for each domain.">
      <div className="grid grid-cols-3 gap-4">
        {AGENT_ORDER.map((id) => {
          const a = AGENTS[id];
          const busy = working.has(id);
          return (
            <div key={id} className={cx("card p-5", busy && "border-brand/60 shadow-[0_0_0_1px_rgb(var(--brand)/0.3)]")}>
              <div className="flex items-center gap-3">
                <AgentAvatar id={id} size="lg" active={busy} done={!busy} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-ink">{a.name}</p>
                  <p className="text-[12.5px] text-ink-3">{a.role}</p>
                </div>
                <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", a.restricted ? "bg-raised text-ink-3" : "bg-brand/15 text-brand")}>
                  {a.restricted ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}{a.restricted ? "Restricted" : "Can act"}
                </span>
              </div>
              <p className="mt-3 text-[12.5px] leading-5 text-ink-2">{a.watches}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.tools.map((t) => <span key={t} className="rounded-md border border-line bg-raised px-1.5 py-0.5 text-[10.5px] text-ink-3">{t}</span>)}
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                <p className="text-[11.5px] leading-4 text-ink-4">{a.never}</p>
                <p className="ml-4 shrink-0 text-right"><span className="block font-mono text-[22px] font-semibold leading-none text-ink">{counts[id] ?? 0}</span><span className="text-[10.5px] text-ink-4">actions today</span></p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="card p-5">
          <p className="eyebrow">Hand-offs between agents</p>
          <ul className="mt-3 space-y-2.5">
            {handoffs.map((h, i) => (
              <li key={i} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-11 font-mono text-ink-4">{clock(h.t)}</span>
                <AgentAvatar id={h.from} size="sm" done />
                <span className="text-ink-4">→</span>
                <AgentAvatar id={h.to} size="sm" done />
                <span className="min-w-0 flex-1 truncate text-ink-2">{h.what}</span>
                <span className="font-mono text-[10.5px] text-ink-4">{h.incident}</span>
              </li>
            ))}
            {handoffs.length === 0 && <li className="text-[13px] text-ink-4">No hand-offs yet.</li>}
          </ul>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Decision log</p>
          <ul className="mt-3 space-y-2.5">
            {[...state.decisions].reverse().slice(0, 14).map((d, i) => (
              <li key={i} className="flex items-start gap-3 text-[12.5px]">
                <span className="w-11 font-mono text-ink-4">{clock(d.t)}</span>
                <span className={cx("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", d.kind === "approved" ? "bg-good/15 text-good" : d.kind === "rejected" ? "bg-bad/15 text-bad" : "bg-brand/15 text-brand")}>{d.kind === "autonomy" ? "Policy" : d.kind === "approved" ? "Approved" : "Rejected"}{d.by ? ` · ${d.by}` : ""}</span>
                <span className="min-w-0 flex-1 text-ink-2">{d.detail}{d.incident && <span className="ml-1 font-mono text-[10.5px] text-ink-4">{d.incident}</span>}</span>
              </li>
            ))}
            {state.decisions.length === 0 && <li className="text-[13px] text-ink-4">Every approval, rejection and autonomy change is recorded here.</li>}
          </ul>
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-line px-5 py-3"><p className="eyebrow">Guardrails · what each autonomy level lets the agents do</p></div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-4">
              <th className="px-5 py-2.5 font-semibold">Action</th>
              {AUTONOMY.map((a) => <th key={a.level} className="px-3 py-2.5 text-center font-semibold">{a.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {GUARDRAILS.map((g) => (
              <tr key={g.action} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-3"><p className="font-medium text-ink">{g.action}</p><p className="text-[12px] text-ink-4">{g.example}</p></td>
                {AUTONOMY.map((a) => {
                  const auto = a.level === 3 || (a.level === 2 && g.reversible);
                  return <td key={a.level} className="px-3 py-3 text-center">{auto ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-good"><Check className="h-3.5 w-3.5" /> Runs</span> : <span className="text-[12px] text-warn">Asks</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
