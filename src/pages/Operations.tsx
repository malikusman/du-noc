import { AnimatePresence, motion } from "framer-motion";
import { Inbox, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlarmRiver } from "@/components/AlarmRiver";
import { Approvals, Feed } from "@/components/Feed";
import { NetworkMap, type Callout, type MapRegion } from "@/components/NetworkMap";
import { Timeline } from "@/components/Timeline";
import { chapterAt } from "@/sim/story";
import { TOTAL_CELLS, TOTAL_SITES } from "@/sim/sites";
import { daylight } from "@/sim/time";
import { useSim } from "@/state/sim";
import { compact, cx, num } from "@/lib/format";

export default function Operations() {
  const { state, sites, links, kpi, incidents, openRoom, seek } = useSim();
  const [region, setRegion] = useState<MapRegion>("uae");
  const chapter = chapterAt(state.t);

  const callouts = useMemo<Callout[]>(() => incidents
    .filter((s) => ["investigating", "waiting", "escalated"].includes(s.status) || (s.status === "monitoring" && s.activePhases.some((p) => p.status === "down")))
    .map((s) => ({ siteId: s.incident.siteId, text: s.incident.place, tone: s.status === "waiting" ? "warn" : s.status === "escalated" ? "bad" : s.activePhases.some((p) => p.status === "down") ? "bad" : "brand" })), [incidents]);

  const active = incidents.filter((s) => ["investigating", "waiting", "monitoring", "escalated"].includes(s.status));

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-0">
          <NetworkMap statuses={sites} links={links} region={region} callouts={callouts} night={1 - daylight(state.t)} />
        </div>

        {/* Headline numbers */}
        <div className="pointer-events-none absolute left-6 top-6 flex gap-3">
          <Headline label="Cell availability" value={`${(kpi.availability * 100).toFixed(2)}%`} sub={`${num(TOTAL_CELLS)} cells · ${num(TOTAL_SITES)} sites`} tone={kpi.availability < 0.995 ? "bad" : kpi.availability < 0.999 ? "warn" : "good"} />
          <Headline label="Subscribers affected now" value={kpi.affected ? compact(kpi.affected) : "0"} sub={kpi.affected ? "Agents on it" : "Nobody affected"} tone={kpi.affected ? "bad" : "good"} />
          <Headline label="Handled without a ticket" value={num(kpi.handled)} sub="today, proven by KPIs" tone="grad" />
        </div>

        {/* Region switch */}
        <div className="absolute right-6 top-6 flex rounded-full border border-line bg-panel/80 p-1 backdrop-blur">
          {(["uae", "north", "dubai"] as MapRegion[]).map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)} className={cx("rounded-full px-3 py-1 text-[12px] font-semibold", region === r ? "bg-raised text-ink" : "text-ink-4 hover:text-ink-2")}>
              {r === "uae" ? "UAE" : r === "north" ? "North" : "Dubai"}
            </button>
          ))}
        </div>

        {/* Story caption */}
        <AnimatePresence mode="wait">
          {state.captions && (
            <motion.div key={chapter.kicker} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              className="glass absolute left-6 top-[132px] max-w-[440px] rounded-2xl p-4 shadow-xl">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-4">{chapter.act}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">{chapter.kicker}</p>
              <p className="mt-1.5 text-[15px] font-medium leading-6 text-ink">{chapter.text}</p>
              {chapter.incident && (
                <button type="button" onClick={() => { const i = incidents.find((x) => x.incident.id === chapter.incident); if (i && i.status !== "upcoming") openRoom(chapter.incident!); else if (i) seek(i.incident.trigger + 0.5); }}
                  className="mt-2 text-[12.5px] font-semibold text-brand hover:underline">Open the incident →</button>
              )}
              {chapter.link && <Link to={chapter.link.to} className="mt-2 inline-block text-[12.5px] font-semibold text-brand hover:underline">{chapter.link.label}</Link>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active incidents */}
        {active.length > 0 && (
          <div className="absolute bottom-[112px] left-[370px] right-6 flex flex-wrap gap-2">
            {active.map((s) => (
              <button key={s.incident.id} type="button" onClick={() => openRoom(s.incident.id)}
                className={cx("glass flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-left shadow-lg transition hover:border-brand/60", s.status === "waiting" && "border-warn/60")}>
                <span className={cx("h-2 w-2 rounded-full", s.status === "waiting" ? "bg-warn" : s.status === "escalated" ? "bg-bad" : s.status === "monitoring" ? "bg-info" : "grad-bg animate-pulse")} />
                <span className="font-mono text-[10.5px] text-ink-4">{s.incident.severity}</span>
                <span className="text-[12.5px] font-semibold text-ink">{s.incident.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Alarm river + timeline */}
        <div className="absolute inset-x-6 bottom-5 flex items-end gap-4">
          <div className="glass w-[340px] shrink-0 rounded-2xl p-4 shadow-xl">
            <p className="eyebrow mb-1 flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-brand" /> Alarm river · today</p>
            <AlarmRiver />
          </div>
          <div className="glass min-w-0 flex-1 rounded-2xl px-4 pb-4 pt-3 shadow-xl">
            <Timeline />
          </div>
        </div>
      </div>

      <aside className="flex w-[360px] shrink-0 flex-col border-l border-line bg-panel/85 backdrop-blur-xl">
        <div className="border-b border-line p-4">
          <p className="eyebrow mb-3 flex items-center gap-1.5"><Inbox className="h-3.5 w-3.5" /> Needs approval</p>
          <Approvals />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <p className="eyebrow">Agent activity</p>
          <span className="text-[11px] text-ink-4">{kpi.handled} handled today</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <Feed />
        </div>
      </aside>
    </div>
  );
}

function Headline({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "good" | "warn" | "bad" | "grad" }) {
  const cls = tone === "grad" ? "grad-text" : tone === "good" ? "text-ink" : tone === "warn" ? "text-warn" : "text-bad";
  return (
    <div className="glass pointer-events-auto min-w-[188px] rounded-2xl px-4 py-3 shadow-xl">
      <p className="text-[11.5px] text-ink-3">{label}</p>
      <motion.p key={value} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className={`mt-1 font-mono text-[28px] font-semibold leading-none tracking-tight tabular ${cls}`}>{value}</motion.p>
      <p className="mt-1.5 text-[11px] text-ink-4">{sub}</p>
    </div>
  );
}
