import { Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Big, Page } from "@/components/Page";
import { StatusPill } from "@/components/Status";
import { AED_PER_SUB_DAY, INCIDENT_BY_ID, aedProtected } from "@/sim/incidents";
import { CUSTOMERS } from "@/sim/insight";
import { ROUTINE } from "@/sim/routine";
import { useSim } from "@/state/sim";
import { token } from "@/state/theme";
import { aed, compact, cx } from "@/lib/format";

/** Interconnect fraud a SIM-box ring of this size typically costs in a month. Simulated estimate. */
const SIMBOX_MONTHLY = 18600;

export default function Revenue() {
  const { state, incidents, kpi, openRoom } = useSim();
  const byId = Object.fromEntries(incidents.map((s) => [s.incident.id, s]));
  const resolved = incidents.filter((s) => s.status === "resolved");
  const protectedAed = resolved.reduce((n, s) => n + aedProtected(s.incident), 0);
  const credits = resolved.reduce((n, s) => n + s.incident.impact.slaCreditsAvoided, 0);
  const atRiskPerHour = (kpi.affected * AED_PER_SUB_DAY) / 24 + incidents.filter((s) => ["investigating", "waiting", "escalated"].includes(s.status)).reduce((n, s) => n + s.incident.impact.slaCreditsAvoided / 8, 0);
  const fraud = ROUTINE.some((r) => r.kind === "SIM-box suspicion" && r.t + r.durationMin <= state.t);
  const chart = resolved.filter((s) => aedProtected(s.incident) > 0).map((s) => ({ name: `${s.incident.place.split(" · ")[0]}`, subs: Math.round(aedProtected(s.incident) - s.incident.impact.slaCreditsAvoided), sla: s.incident.impact.slaCreditsAvoided, id: s.incident.id }));
  const gitex = byId.gitex;
  const gitexProven = gitex?.steps.some((x) => x.step.id === "x-verify" && x.status === "done");

  return (
    <Page eyebrow="Intelligence · Revenue protection" title="Every minute of downtime has a price"
      intro="The agents weigh every action by who is affected: consumers, premium 5G+ users, enterprise SLAs and events. This page puts a number on what was at risk and what the NOC kept.">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Big label="Revenue at risk right now" value={`${aed(atRiskPerHour)}/h`} tone={atRiskPerHour > 0 ? "bad" : "good"} sub={kpi.affected ? `${compact(kpi.affected)} subscribers affected` : "Nobody affected right now"} />
        <Big label="Revenue protected today" value={aed(protectedAed)} tone="grad" sub="Resolved incidents only" />
        <Big label="SLA credits avoided" value={aed(credits)} tone="good" sub="Enterprise and event contracts" />
        <Big label="Fraud stopped" value={fraud ? `~${aed(SIMBOX_MONTHLY)}/mo` : "–"} sub={fraud ? "SIM-box ring barred at 15:34 (estimate)" : "No fraud cases yet today"} />
      </div>

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
        <div className="card p-5">
          <p className="text-[14px] font-semibold text-ink">Protected today, by incident</p>
          <p className="text-[12px] text-ink-4">Subscriber revenue kept on air, plus service credits not paid.</p>
          <div className="mt-3 h-[300px]">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: token("ink-4", 0.1) }} formatter={(v: number) => aed(v)} />
                  <Bar dataKey="subs" name="Subscriber revenue" stackId="a" fill={token("brand-2")} />
                  <Bar dataKey="sla" name="SLA credits avoided" stackId="a" fill={token("brand")} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="pt-20 text-center text-[13px] text-ink-4">Nothing resolved yet.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className={cx("card p-5", gitexProven && "border-good/40")}>
            <p className="eyebrow">Premium and events · GITEX at DWTC</p>
            {gitex && gitex.status !== "upcoming" ? (
              <>
                <p className="mt-2 text-[15px] font-semibold text-ink">{gitexProven ? "Every floor held through the keynote rush" : "The GITEX intent is running"}</p>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
                  <div><dt className="text-ink-4">Card payments</dt><dd className="mt-0.5 font-mono text-[18px] font-semibold text-ink">{gitexProven ? "99.8%" : "≥ 2 Mbps"}</dd></div>
                  <div><dt className="text-ink-4">5G+ median</dt><dd className="mt-0.5 font-mono text-[18px] font-semibold text-ink">{gitexProven ? "186 Mbps" : "≥ 100"}</dd></div>
                  <div><dt className="text-ink-4">Broadcast uplink</dt><dd className="mt-0.5 font-mono text-[18px] font-semibold text-ink">≥ 50 Mbps</dd></div>
                </dl>
                <button type="button" onClick={() => openRoom("gitex")} className="mt-3 text-[12.5px] font-semibold text-brand">Replay the GITEX incident →</button>
              </>
            ) : <p className="mt-2 text-[13px] text-ink-4">GITEX traffic peaks after 13:00.</p>}
          </div>
          <div className="card p-5">
            <p className="eyebrow flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> How the numbers are worked out</p>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-5 text-ink-3">
              <li><span className="font-semibold text-ink">AED {AED_PER_SUB_DAY} per subscriber per day.</span> du's Q3 2026 revenue (AED 4,145m) over 92 days and 10.26m subscribers.</li>
              <li><span className="font-semibold text-ink">Subscriber revenue protected</span> = subscribers kept on air × minutes avoided × AED {AED_PER_SUB_DAY} ÷ 1,440.</li>
              <li><span className="font-semibold text-ink">SLA credits</span> come from each contract's credit table. The customers and contracts here are simulated.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-line px-5 py-3"><p className="eyebrow">Enterprise SLAs today</p></div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-4">
              <th className="px-5 py-2.5 font-semibold">Customer</th>
              <th className="px-3 py-2.5 font-semibold">Service</th>
              <th className="px-3 py-2.5 font-semibold">SLA</th>
              <th className="px-3 py-2.5 font-semibold">Today</th>
              <th className="px-5 py-2.5 text-right font-semibold">Credit at risk</th>
            </tr>
          </thead>
          <tbody>
            {CUSTOMERS.map((c) => {
              const s = c.incident ? byId[c.incident] : undefined;
              const touched = s && s.status !== "upcoming";
              return (
                <tr key={c.id} onClick={() => touched && openRoom(c.incident!)} className={cx("border-b border-line/70 last:border-0", touched && "cursor-pointer hover:bg-raised")}>
                  <td className="px-5 py-3"><p className="font-semibold text-ink">{c.name}</p><p className="font-mono text-[11px] text-ink-4">{c.id} · {c.tier}</p></td>
                  <td className="px-3 py-3 text-ink-2">{c.service}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-ink-2">{c.sla}</td>
                  <td className="px-3 py-3">{touched ? <div className="flex items-center gap-2"><StatusPill status={s!.status} /><span className="text-[11.5px] text-ink-4">{INCIDENT_BY_ID[c.incident!].number}</span></div> : <span className="text-[12px] text-good">No issues today</span>}</td>
                  <td className="px-5 py-3 text-right font-mono text-ink-2">{c.creditAtRisk ? (s?.status === "resolved" ? <span className="text-good">Avoided</span> : aed(c.creditAtRisk)) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
