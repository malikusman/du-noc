import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Big, Page } from "@/components/Page";
import { SeverityTag, StatusPill } from "@/components/Status";
import { alarmsByHour, rawAlarms } from "@/sim/alarms";
import { AED_PER_SUB_DAY, INCIDENTS, aedProtected } from "@/sim/incidents";
import type { Approvals, Levels } from "@/sim/types";
import { incidentState } from "@/sim/progress";
import { ROUTINE } from "@/sim/routine";
import { SHIFTS, clock, duration } from "@/sim/time";
import { useSim } from "@/state/sim";
import { token } from "@/state/theme";
import { aed, cx, num } from "@/lib/format";
import { rootCauseMinutes } from "./Incidents";

export default function Reports() {
  const { state } = useSim();
  const available = SHIFTS.filter((s) => state.t >= s.from);
  const [pick, setPick] = useState<string>(available[available.length - 1]?.id ?? "night");
  const shift = SHIFTS.find((s) => s.id === pick) ?? SHIFTS[0];
  const end = Math.min(shift.to, state.t);
  const complete = state.t >= shift.to;

  // Each incident as it stood at the end of the shift (or now).
  const atEnd = useMemo(() => {
    return INCIDENTS_AT(end, state.approvals, state.levels).filter((s) => s.incident.trigger >= shift.from && s.incident.trigger < shift.to && s.status !== "upcoming");
  }, [end, shift, state.approvals, state.levels]);
  const carried = useMemo(() => INCIDENTS_AT(end, state.approvals, state.levels).filter((s) => s.incident.trigger < shift.from && s.status !== "resolved" && s.status !== "upcoming"), [end, shift, state.approvals, state.levels]);

  const routine = ROUTINE.filter((r) => r.t >= shift.from && r.t + r.durationMin <= end);
  const byKind = Object.entries(routine.reduce<Record<string, number>>((m, r) => ({ ...m, [r.kind]: (m[r.kind] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const decisions = state.decisions.filter((d) => d.t >= shift.from && d.t < shift.to && d.kind !== "autonomy");
  const alarms = rawAlarms(end) - rawAlarms(shift.from);
  const resolved = atEnd.filter((s) => s.status === "resolved");
  const protectedAed = resolved.reduce((n, s) => n + aedProtected(s.incident), 0);
  const open = [...carried, ...atEnd].filter((s) => s.status !== "resolved");

  const hourly = alarmsByHour(state.t).map((n, h) => ({ hour: `${String(h).padStart(2, "0")}`, alarms: n }));
  const allNow = INCIDENTS_AT(state.t, state.approvals, state.levels).filter((s) => s.status !== "upcoming");
  const value = allNow.map((s) => ({ name: s.incident.number.slice(-4), title: s.incident.title, aed: s.status === "resolved" ? aedProtected(s.incident) : 0, rc: rootCauseMinutes(s) ?? 0 }));

  return (
    <Page eyebrow="Analytics & reports" title="Shift handover" intro="Written by the Scribe agent at the end of each shift from what actually happened, including every decision your engineers made."
      right={
        <div className="flex rounded-full border border-line bg-panel p-1">
          {SHIFTS.map((s) => {
            const on = s.id === pick;
            const can = state.t >= s.from;
            return (
              <button key={s.id} type="button" disabled={!can} onClick={() => setPick(s.id)} className={cx("rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold", on ? "bg-raised text-ink" : can ? "text-ink-3 hover:text-ink" : "text-ink-4/50")}>
                {s.name} · {clock(s.from)}–{clock(s.to)}
              </button>
            );
          })}
        </div>
      }>
      <div className="card overflow-hidden">
        <div className="grad-line h-1" />
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          <AgentAvatar id="scribe" done />
          <div className="flex-1">
            <p className="text-[15px] font-bold text-ink">{shift.name} handover · {clock(shift.handover)}</p>
            <p className="text-[12px] text-ink-4">{complete ? "Final" : `Draft, updating live · as of ${clock(state.t)}`} · Thursday, GITEX week</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] text-ink-3"><FileText className="h-3.5 w-3.5" /> Also filed in ITSM</span>
        </div>

        <div className="grid grid-cols-5 gap-4 border-b border-line p-6">
          <Mini label="Raw alarms" value={num(alarms)} />
          <Mini label="Incidents" value={String(atEnd.length)} />
          <Mini label="Fixed without a ticket" value={String(routine.length)} />
          <Mini label="Decisions by engineers" value={String(decisions.length)} />
          <Mini label="Revenue protected" value={aed(protectedAed)} grad />
        </div>

        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-8 p-6">
          <div>
            <p className="eyebrow mb-3">What happened</p>
            <ul className="space-y-3">
              {atEnd.map((s) => {
                const human = s.steps.filter((x) => x.approval && !x.approval.auto);
                return (
                  <li key={s.incident.id} className="rounded-xl border border-line bg-raised/60 p-4">
                    <div className="flex items-center gap-2">
                      <SeverityTag severity={s.incident.severity} />
                      <span className="font-mono text-[11px] text-ink-4">{clock(s.incident.trigger)} · {s.incident.number}</span>
                      <span className="ml-auto"><StatusPill status={s.status} /></span>
                    </div>
                    <p className="mt-1.5 text-[14px] font-semibold text-ink">{s.incident.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-5 text-ink-3">{s.incident.oneLiner}</p>
                    <p className="mt-2 text-[12px] text-ink-2">
                      {s.lastDone ? `Latest: ${s.lastDone.step.title}.` : ""}
                      {s.closedAt ? ` Resolved in ${duration(s.closedAt - s.incident.trigger)}.` : ""}
                      {human.length ? ` ${human.length} decision${human.length > 1 ? "s" : ""} by the shift.` : " No human decision needed."}
                    </p>
                  </li>
                );
              })}
              {atEnd.length === 0 && <li className="text-[13px] text-ink-4">No incidents in this shift yet.</li>}
            </ul>
          </div>
          <div className="space-y-6">
            <div>
              <p className="eyebrow mb-3">Open for the next shift</p>
              {open.length ? (
                <ul className="space-y-2">
                  {open.map((s) => (
                    <li key={s.incident.id} className="rounded-xl border border-warn/40 bg-warn/5 p-3 text-[12.5px]">
                      <p className="font-semibold text-ink">{s.incident.number} · {s.incident.title}</p>
                      <p className="mt-0.5 text-ink-3">{s.status === "waiting" ? `Waiting for approval: ${s.next?.step.title}` : s.status === "escalated" ? "Rejected and handed to engineers" : `Next: ${s.next?.step.title} at ${s.next ? clock(s.next.at) : ""}`}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-xl border border-good/40 bg-good/5 p-3 text-[12.5px] text-ink-2">Nothing open. The next shift starts clean.</p>}
            </div>
            <div>
              <p className="eyebrow mb-3">Small faults fixed without a ticket</p>
              <ul className="space-y-1.5">
                {byKind.map(([k, n]) => (
                  <li key={k} className="flex justify-between text-[12.5px]"><span className="text-ink-2">{k}</span><span className="font-mono text-ink">{n}</span></li>
                ))}
                {byKind.length === 0 && <li className="text-[12.5px] text-ink-4">None yet.</li>}
              </ul>
            </div>
            {decisions.length > 0 && (
              <div>
                <p className="eyebrow mb-3">Decisions by the shift</p>
                <ul className="space-y-1.5">
                  {decisions.map((d, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px]"><span className="font-mono text-ink-4">{clock(d.t)}</span><span className={d.kind === "approved" ? "text-good" : "text-bad"}>{d.kind === "approved" ? "Approved" : "Rejected"}</span><span className="text-ink-2">{d.detail}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="eyebrow mb-4">The day so far</p>
        <div className="grid grid-cols-4 gap-4">
          <Big label="Raw alarms today" value={num(rawAlarms(state.t))} sub={`${allNow.length} incidents`} />
          <Big label="Median time to root cause" value={`${median(allNow.map((s) => rootCauseMinutes(s) ?? 0).filter(Boolean))} min`} sub="From first signal to a confident cause" tone="grad" />
          <Big label="Field visits avoided" value={String(allNow.filter((s) => s.status === "resolved").reduce((n, s) => n + s.incident.impact.visitsAvoided, 0) + ROUTINE.filter((r) => r.visitAvoided && r.t <= state.t).length)} sub="Fixed remotely and proven" tone="good" />
          <Big label="Revenue protected today" value={aed(allNow.filter((s) => s.status === "resolved").reduce((n, s) => n + aedProtected(s.incident), 0))} sub={`AED ${AED_PER_SUB_DAY}/subscriber/day + SLA credits avoided`} tone="grad" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-[14px] font-semibold text-ink">Raw alarms per hour</p>
            <p className="text-[12px] text-ink-4">Each spike became one incident.</p>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={2} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: token("ink-4", 0.1) }} />
                  <Bar dataKey="alarms" fill={token("brand")} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-5">
            <p className="text-[14px] font-semibold text-ink">Minutes to root cause, by incident</p>
            <p className="text-[12px] text-ink-4">From the first signal to the cause the agents acted on.</p>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={value} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: token("ink-4", 0.1) }} labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ""} />
                  <Bar dataKey="rc" name="Minutes" fill={token("brand-2")} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

function INCIDENTS_AT(t: number, approvals: Approvals, levels: Levels) {
  const scoped = Object.fromEntries(Object.entries(approvals).filter(([, a]) => a.at <= t));
  return INCIDENTS.map((i) => incidentState(i, t, scoped, levels));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function Mini({ label, value, grad }: { label: string; value: string; grad?: boolean }) {
  return (
    <div>
      <p className="text-[11.5px] text-ink-4">{label}</p>
      <p className={cx("mt-1 font-mono text-[22px] font-semibold leading-none tabular", grad ? "grad-text" : "text-ink")}>{value}</p>
    </div>
  );
}
