import { motion } from "framer-motion";
import { useMemo } from "react";
import { alarmRate } from "@/sim/alarms";
import { useSim } from "@/state/sim";
import { compact as short } from "@/lib/format";

/** Raw alarms flow in from the left and collapse into a handful of incidents. */
export function AlarmRiver({ compact = false }: { compact?: boolean }) {
  const { kpi, state } = useSim();
  const rate = alarmRate(state.t);
  const dots = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ y: 8 + ((i * 37) % 44), delay: (i * 0.23) % 2.4, dur: 1.6 + ((i * 13) % 10) / 10 })), []);
  const intensity = Math.min(1, rate / 120);
  const stages = [
    { label: "Raw alarms", value: kpi.raw, tone: "text-ink" },
    { label: "Unique events", value: kpi.unique, tone: "text-ink" },
    { label: "Incidents", value: kpi.incidents, tone: "grad-text" },
    { label: "Need a person", value: kpi.tickets + kpi.waiting, tone: kpi.waiting ? "text-warn" : "text-good" },
  ];
  return (
    <div className="relative overflow-hidden">
      {!compact && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[60px] opacity-90">
          {dots.map((d, i) => (
            <span key={i} className="river-dot absolute left-0 h-1 w-1 rounded-full bg-brand"
              style={{ top: d.y, ["--dx" as string]: "240px", ["--dur" as string]: `${d.dur / (0.6 + intensity)}s`, ["--delay" as string]: `${d.delay}s`, opacity: 0.3 + intensity * 0.7 } as React.CSSProperties} />
          ))}
          <div className="absolute inset-y-0 left-[230px] w-24 bg-gradient-to-r from-transparent to-panel" />
        </div>
      )}
      <div className={compact ? "grid grid-cols-4 gap-2" : "relative grid grid-cols-4 gap-3 pt-[60px]"}>
        {stages.map((s, i) => (
          <div key={s.label} className="relative">
            <motion.p key={Math.round(s.value)} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className={`font-mono text-[21px] font-semibold leading-none tabular ${s.tone}`}>{short(s.value)}</motion.p>
            <p className="mt-1.5 text-[11px] text-ink-3">{s.label}</p>
            {i < 3 && <span className="absolute right-0 top-2 text-ink-4">›</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
