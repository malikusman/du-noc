import { Zap } from "lucide-react";
import { Big, Page } from "@/components/Page";
import { SeverityTag, StatusPill } from "@/components/Status";
import { aedProtected } from "@/sim/incidents";
import { routineDone } from "@/sim/progress";
import { clock, duration } from "@/sim/time";
import type { IncidentState } from "@/sim/progress";
import { useSim } from "@/state/sim";
import { aed, cx, num } from "@/lib/format";

export function rootCauseMinutes(s: IncidentState) {
  const hyps = s.steps.filter((x) => x.status === "done" && (x.step.hypotheses || x.step.kind === "tool"));
  const last = hyps[hyps.length - 1];
  return last ? Math.max(1, Math.round(last.at - s.incident.trigger)) : undefined;
}

export default function Incidents() {
  const { state, incidents, kpi, openRoom, approve } = useSim();
  const opened = incidents.filter((s) => s.status !== "upcoming");
  const upcoming = incidents.filter((s) => s.status === "upcoming");
  const resolved = opened.filter((s) => s.status === "resolved");
  const protectedAed = resolved.reduce((n, s) => n + aedProtected(s.incident), 0);
  const routine = routineDone(state.t);

  return (
    <Page eyebrow="Incident correlation" title="Incidents today" intro="Every alarm storm the agents turned into one incident, what they found, and who decided what. Open any row to replay the reasoning.">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Big label="Raw alarms → incidents" value={`${num(kpi.raw)} → ${opened.length}`} sub={`${num(kpi.unique)} unique events after deduplication`} />
        <Big label="Resolved and proven" value={String(resolved.length)} sub={`plus ${routine.length} small faults fixed without a ticket`} tone="good" />
        <Big label="Waiting for a person" value={String(kpi.waiting)} sub="Approve here or in Operations" tone={kpi.waiting ? "warn" : undefined} />
        <Big label="Revenue protected" value={aed(protectedAed)} sub="Resolved incidents only" tone="grad" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-4">
              <th className="px-5 py-3 font-semibold">Incident</th>
              <th className="px-3 py-3 font-semibold">Domain</th>
              <th className="px-3 py-3 font-semibold">Alarms</th>
              <th className="px-3 py-3 font-semibold">Root cause in</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Resolved in</th>
              <th className="px-3 py-3 text-right font-semibold">Protected</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...opened].reverse().map((s) => {
              const waiting = s.steps.find((x) => x.status === "waiting");
              const rc = rootCauseMinutes(s);
              return (
                <tr key={s.incident.id} onClick={() => openRoom(s.incident.id)} className={cx("cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-raised", waiting && "bg-warn/5")}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <SeverityTag severity={s.incident.severity} />
                      <span className="font-mono text-[11px] text-ink-4">{s.incident.number} · {clock(s.incident.trigger)}</span>
                    </div>
                    <p className="mt-1 font-semibold text-ink">{s.incident.title}</p>
                    <p className="text-[12px] text-ink-3">{s.incident.place} · {s.incident.asset}</p>
                  </td>
                  <td className="px-3 py-3.5 text-ink-2">{s.incident.domain}</td>
                  <td className="px-3 py-3.5 font-mono text-ink-2">{s.incident.rawAlarms ? `${s.incident.rawAlarms} → 1` : <span className="text-ink-4">none fired</span>}</td>
                  <td className="px-3 py-3.5 font-mono text-ink-2">{rc ? `${rc} min` : "–"}</td>
                  <td className="px-3 py-3.5"><StatusPill status={s.status} /></td>
                  <td className="px-3 py-3.5 font-mono text-ink-2">{s.closedAt ? duration(s.closedAt - s.incident.trigger) : "–"}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-ink">{s.status === "resolved" ? (aedProtected(s.incident) ? aed(aedProtected(s.incident)) : <span className="text-ink-4">No impact</span>) : "–"}</td>
                  <td className="px-5 py-3.5 text-right">
                    {waiting ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); approve(waiting.step.id); }} className="btn-primary px-3 py-1.5 text-[12px]"><Zap className="h-3.5 w-3.5" /> Approve</button>
                    ) : <span className="text-[12px] font-semibold text-brand">Replay →</span>}
                  </td>
                </tr>
              );
            })}
            {opened.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-4">No incidents yet. Start the day from Operations.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {upcoming.length > 0 && (
        <p className="mt-4 text-[12.5px] text-ink-4">{upcoming.length} more incidents will happen later today.</p>
      )}
    </Page>
  );
}
