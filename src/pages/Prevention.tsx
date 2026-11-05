import { motion } from "framer-motion";
import { CalendarDays, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Big, Page } from "@/components/Page";
import { NetworkMap } from "@/components/NetworkMap";
import { INCIDENT_BY_ID } from "@/sim/incidents";
import { OUTLOOK, PREDICTIONS } from "@/sim/insight";
import { ROUTINE } from "@/sim/routine";
import { clock, shiftLead } from "@/sim/time";
import { useSim } from "@/state/sim";
import { compact, cx, num } from "@/lib/format";

/** What the agents stopped before customers felt it. */
const PREVENTED = [
  { id: "fog", then: "3 coastal links drop in the 06:25 rush, 11 sites lose capacity", now: "Traffic moved to fibre at 05:44. Two links faded; nobody noticed.", proof: "g-verify" },
  { id: "power", then: "5 sites off air from 13:10, including the hospital site", now: "Load shed, generators on site by 12:55. No site went off air.", proof: "w-verify" },
  { id: "gitex", then: "Radio load 97% at 13:50; ~6% of card payments time out", now: "Intent applied at 13:24. Peak 92%, payments 99.8%.", proof: "x-verify" },
  { id: "enterprise", then: "SLA breach at 16:22 and a service credit", now: "Moved to the spare PE at 16:12. Peaked at 21 ms.", proof: "e-verify" },
  { id: "sleeping", then: "A second sleeping cell at DXB T3 until morning", now: "Found by the fleet scan at 21:31 and woken at 21:33.", proof: "z-learn" },
];

export default function Prevention() {
  const { state, incidents, sites, links } = useSim();
  const [approved, setApproved] = useState<Record<string, number>>({});
  const doneStep = (id: string) => incidents.flatMap((s) => s.steps).find((x) => x.step.id === id && x.status === "done");
  const prevented = PREVENTED.filter((p) => doneStep(p.proof));
  const risks = PREDICTIONS.filter((p) => p.from <= state.t).sort((a, b) => b.risk - a.risk);
  const subHours = prevented.reduce((n, p) => n + (INCIDENT_BY_ID[p.id].impact.subscribers * INCIDENT_BY_ID[p.id].impact.minutesAvoided) / 60, 0);
  const visits = ROUTINE.filter((r) => r.visitAvoided && r.t + r.durationMin <= state.t).length;

  return (
    <Page eyebrow="Intelligence · Downtime prevention" title="Fix it before anyone notices"
      intro="Sentinel compares every KPI with its neighbours, last week, the weather and the event calendar. Most of today's best work is the outages that never happened.">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Big label="Outages prevented today" value={String(prevented.length)} tone="good" sub="Each one proven by KPIs" />
        <Big label="Subscriber-hours protected" value={compact(subHours)} tone="grad" sub="Subscribers kept on air × hours avoided" />
        <Big label="Risks on the watchlist" value={String(risks.length)} sub={`${risks.filter((r) => r.status === "Needs approval" && !approved[r.id]).length} need a decision`} />
        <Big label="Field visits avoided" value={num(visits)} sub="Fixed remotely, logged for the next visit" />
      </div>

      <div className="card p-5">
        <p className="eyebrow">Prevented today</p>
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {prevented.map((p, i) => {
            const inc = INCIDENT_BY_ID[p.id];
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-line bg-raised/60 p-4">
                <p className="font-mono text-[11px] text-ink-4">{clock(inc.trigger)} · {inc.number} · {inc.place}</p>
                <p className="mt-1 text-[14.5px] font-semibold text-ink">{inc.title}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[12.5px] leading-5">
                  <div><p className="text-[10.5px] font-semibold uppercase tracking-wider text-bad">Would have happened</p><p className="mt-1 text-ink-3">{p.then}</p></div>
                  <div><p className="text-[10.5px] font-semibold uppercase tracking-wider text-good">What happened</p><p className="mt-1 text-ink-2">{p.now}</p></div>
                </div>
              </motion.div>
            );
          })}
          {prevented.length === 0 && <p className="text-[13px] text-ink-4">Nothing prevented yet. The first one comes with the fog at 05:40.</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_420px] gap-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="eyebrow">Risk board · next 7 days</p>
            <p className="text-[11.5px] text-ink-4">New risks appear as the agents learn during the day</p>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-4">
                <th className="px-5 py-2.5 font-semibold">Where</th>
                <th className="px-3 py-2.5 font-semibold">Risk</th>
                <th className="px-3 py-2.5 font-semibold">Why, and what the agents propose</th>
                <th className="px-5 py-2.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => {
                const ok = approved[r.id];
                return (
                  <tr key={r.id} className="border-b border-line/70 align-top last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink">{r.place}</p>
                      <p className="font-mono text-[11px] text-ink-4">{r.siteId} · {r.window}</p>
                      {r.learnedFrom && <p className="mt-1 text-[11px] text-brand">Learned from {INCIDENT_BY_ID[r.learnedFrom].number}</p>}
                    </td>
                    <td className="px-3 py-3.5">
                      <p className={cx("font-mono text-[18px] font-semibold", r.risk >= 85 ? "text-bad" : r.risk >= 70 ? "text-warn" : "text-ink-2")}>{r.risk}</p>
                      <div className="mt-1 h-1 w-16 rounded-full bg-line"><div className={cx("h-1 rounded-full", r.risk >= 85 ? "bg-bad" : r.risk >= 70 ? "bg-warn" : "bg-ink-4")} style={{ width: `${r.risk}%` }} /></div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-ink-2">{r.factor}</p>
                      <p className="mt-1 text-ink"><span className="text-ink-4">→</span> {r.action}</p>
                      <p className="mt-1 text-[11px] text-ink-4">Confidence {r.confidence}%</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.status === "Needs approval" && !ok ? (
                        <button type="button" onClick={() => setApproved({ ...approved, [r.id]: state.t })} className="btn-primary px-3 py-1.5 text-[12px]">Approve</button>
                      ) : (
                        <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", ok || r.status === "Scheduled" ? "bg-good/12 text-good" : "bg-info/12 text-info")}>
                          {ok ? <><Check className="h-3 w-3" /> Approved by {shiftLead(ok).name}</> : r.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="card h-[300px] overflow-hidden">
            <NetworkMap statuses={sites} links={links} region="wide" showTransport={false}
              callouts={risks.slice(0, 4).map((r) => ({ siteId: r.siteId, text: `Risk ${r.risk}`, tone: r.risk >= 85 ? "bad" : "warn" }))} />
          </div>
          <div className="card p-5">
            <p className="eyebrow flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> The week ahead</p>
            <ul className="mt-3 space-y-2.5">
              {OUTLOOK.map((o) => (
                <li key={o.day} className="flex gap-3 text-[12.5px]">
                  <span className="w-9 shrink-0 font-semibold text-ink">{o.day}</span>
                  <span className="text-ink-3">{o.items.join(" · ")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[11.5px] text-ink-4"><ShieldCheck className="h-3.5 w-3.5" /> Sources: NCM, the event calendar and the change calendar</p>
          </div>
        </div>
      </div>
    </Page>
  );
}
