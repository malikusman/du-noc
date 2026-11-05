import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, CircleDot, XCircle, Zap } from "lucide-react";
import { useState } from "react";
import { Big, Page } from "@/components/Page";
import { SeverityTag, StatusPill } from "@/components/Status";
import { ThenNowCard } from "@/components/ThenNow";
import { aedProtected } from "@/sim/incidents";
import { ALARM_GROUPS, CHECKS } from "@/sim/insight";
import { rootCauseMinutes, routineDone, type IncidentState } from "@/sim/progress";
import { clock, duration } from "@/sim/time";
import { useSim } from "@/state/sim";
import { aed, cx, num } from "@/lib/format";

function finalCause(s: IncidentState) {
  const done = s.steps.filter((x) => x.status === "done" && x.step.hypotheses);
  const last = done[done.length - 1]?.step.hypotheses;
  if (!last) return undefined;
  return [...last].sort((a, b) => b.p - a.p)[0];
}

export default function Correlation() {
  const { state, incidents, kpi, openRoom, approve } = useSim();
  const opened = incidents.filter((s) => s.status !== "upcoming");
  const [pick, setPick] = useState<string | null>(null);
  const selected = opened.find((s) => s.incident.id === pick) ?? opened.find((s) => s.incident.id === "fibre") ?? opened[opened.length - 1];
  const resolved = opened.filter((s) => s.status === "resolved");
  const routine = routineDone(state.t);

  const funnel = [
    { label: "Raw alarms", value: kpi.raw },
    { label: "Unique events", value: kpi.unique },
    { label: "Incidents", value: kpi.incidents },
    { label: "Needed a person", value: state.decisions.filter((d) => d.kind !== "autonomy").length + kpi.waiting },
  ];

  return (
    <Page eyebrow="Intelligence · Incident correlation" title="Thousands of alarms. A handful of incidents."
      intro="The Correlator groups every alarm by topology, time and cause, checks the change calendar and the outside world, and opens one incident per real problem. Planned work never pages anyone.">
      <div className="mb-6 grid grid-cols-4 gap-4">
        {funnel.map((f, i) => (
          <div key={f.label} className="card relative overflow-hidden p-5">
            <div className="grad-bg absolute inset-y-0 left-0 opacity-[0.08]" style={{ width: `${Math.max(6, 100 - i * 30)}%` }} />
            <p className="relative text-[12px] text-ink-3">{f.label}</p>
            <p className={cx("relative mt-2 font-mono text-[30px] font-semibold leading-none tabular", i === 2 ? "grad-text" : "text-ink")}>{num(f.value)}</p>
            {i < 3 && <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-4" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[400px_minmax(0,1fr)] gap-6">
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-3"><p className="eyebrow">Incidents today · {opened.length}</p></div>
          <ul className="max-h-[760px] overflow-y-auto">
            {[...opened].reverse().map((s) => {
              const on = s.incident.id === selected?.incident.id;
              return (
                <li key={s.incident.id}>
                  <button type="button" onClick={() => setPick(s.incident.id)} className={cx("w-full border-b border-line/70 px-5 py-3.5 text-left transition", on ? "bg-brand/[0.08]" : "hover:bg-raised")}>
                    <div className="flex items-center gap-2">
                      <SeverityTag severity={s.incident.severity} />
                      <span className="font-mono text-[11px] text-ink-4">{clock(s.incident.trigger)}</span>
                      <span className="ml-auto"><StatusPill status={s.status} /></span>
                    </div>
                    <p className="mt-1.5 text-[14px] font-semibold text-ink">{s.incident.title}</p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-ink-3">{s.incident.rawAlarms ? `${s.incident.rawAlarms} alarms → 1 incident` : "No alarm fired · found from KPIs"}</p>
                  </button>
                </li>
              );
            })}
            {opened.length === 0 && <li className="px-5 py-10 text-center text-[13px] text-ink-4">No incidents yet. Start the day from the Overview.</li>}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[12px] text-ink-4">Plus {routine.length} small faults fixed without a ticket.</p>
        </div>

        <AnimatePresence mode="wait">
          {selected ? <CorrelationView key={selected.incident.id} s={selected} onOpen={() => openRoom(selected.incident.id)} onApprove={approve} /> : <div className="card p-10 text-center text-ink-4">Nothing to correlate yet.</div>}
        </AnimatePresence>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Big label="Resolved and proven" value={String(resolved.length)} tone="good" sub="Closed only when KPIs recovered" />
        <Big label="Median time to root cause" value={`${median(opened.map((s) => rootCauseMinutes(s) ?? 0).filter(Boolean))} min`} tone="grad" sub="From first signal to a confident cause" />
        <Big label="Tickets the agents didn't open" value={num(opened.reduce((n, s) => n + s.incident.impact.ticketsAvoided, 0) + routine.length)} sub="Duplicates, planned work and self-healed faults" />
      </div>
    </Page>
  );
}

function CorrelationView({ s, onOpen, onApprove }: { s: IncidentState; onOpen: () => void; onApprove: (id: string) => void }) {
  const groups = ALARM_GROUPS[s.incident.id] ?? [];
  const checks = CHECKS[s.incident.id] ?? [];
  const cause = finalCause(s);
  const max = Math.max(1, ...groups.map((g) => g.count));
  const planned = s.incident.id === "planned";
  const waiting = s.steps.find((x) => x.status === "waiting");
  const rc = rootCauseMinutes(s);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="card p-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11.5px] text-ink-4">{s.incident.number} · {s.incident.domain} · {s.incident.place}</p>
          <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">{s.incident.title}</h2>
          <p className="mt-1 text-[13.5px] text-ink-3">{s.incident.oneLiner}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {waiting && <button type="button" onClick={() => onApprove(waiting.step.id)} className="btn-primary"><Zap className="h-4 w-4" /> Approve</button>}
          <button type="button" onClick={onOpen} className="btn-line">Replay the reasoning →</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_56px_minmax(0,0.9fr)] items-center gap-2">
        <div className="rounded-xl border border-line bg-raised/60 p-4">
          <p className="eyebrow mb-3">{groups.length ? `What arrived · ${s.incident.rawAlarms} alarms` : "What arrived"}</p>
          {groups.length ? (
            <ul className="space-y-2.5">
              {groups.map((g, i) => (
                <li key={g.type}>
                  <div className="flex justify-between text-[12.5px]"><span className="text-ink-2">{g.type}</span><span className="font-mono text-ink">{g.count}</span></div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                      <motion.div className="h-1.5 rounded-full bg-brand/80" initial={{ width: 0 }} animate={{ width: `${(g.count / max) * 100}%` }} transition={{ delay: 0.1 + i * 0.08, duration: 0.6 }} />
                    </div>
                    <span className="w-28 truncate text-right text-[10.5px] text-ink-4">{g.source}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-5 text-ink-2">No alarm at all. Sentinel found this from KPIs: {s.incident.steps[0].title.toLowerCase()}.</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 text-ink-4">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grad-bg flex h-10 w-10 items-center justify-center rounded-full text-white shadow-[0_6px_20px_rgb(var(--brand)/0.4)]"><ArrowRight className="h-5 w-5" /></motion.span>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Correlator</span>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className={cx("rounded-xl border p-4", planned ? "border-info/50 bg-info/[0.06]" : "border-brand/50 bg-brand/[0.06]")}>
          <p className="eyebrow">One incident</p>
          <p className="mt-2 text-[16px] font-bold leading-6 text-ink">{planned ? "Planned work, not an outage" : cause ? cause.label : s.incident.title}</p>
          {cause && <p className="mt-2 font-mono text-[28px] font-semibold leading-none grad-text">{Math.round(cause.p * 100)}%</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
            <span className={cx("rounded-md px-2 py-0.5 font-semibold", planned ? "bg-info/15 text-info" : "bg-bad/12 text-bad")}>{planned ? "Planned · no ticket" : "Unplanned"}</span>
            {rc && <span className="rounded-md bg-raised px-2 py-0.5 text-ink-2">Cause in {rc} min</span>}
            {s.closedAt && <span className="rounded-md bg-good/12 px-2 py-0.5 text-good">Resolved in {duration(s.closedAt - s.incident.trigger)}</span>}
            {s.status === "resolved" && aedProtected(s.incident) > 0 && <span className="rounded-md bg-raised px-2 py-0.5 text-ink-2">{aed(aedProtected(s.incident))} protected</span>}
          </div>
        </motion.div>
      </div>

      {checks.length > 0 && (
        <div className="mt-6">
          <p className="eyebrow mb-3">Checks before calling it · planned or unplanned?</p>
          <div className="grid grid-cols-2 gap-2">
            {checks.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex items-start gap-3 rounded-xl border border-line px-3.5 py-2.5">
                {c.verdict === "points to" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> : c.verdict === "rules out" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" /> : <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />}
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink">{c.label} <span className="font-normal text-ink-4">· {c.verdict}</span></p>
                  <p className="text-[12.5px] text-ink-3">{c.result}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <ThenNowCard id={s.incident.id} className="mt-6" />
    </motion.div>
  );
}

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
