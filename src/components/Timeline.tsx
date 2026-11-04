import { Pause, Play, RotateCcw } from "lucide-react";
import { useRef } from "react";
import { INCIDENTS } from "@/sim/incidents";
import { SHIFTS, clock, DAY_LENGTH } from "@/sim/time";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

export function Timeline() {
  const { state, play, seek, setSpeed, reset, incidents, openRoom } = useSim();
  const bar = useRef<HTMLDivElement>(null);
  const pos = (t: number) => `${(t / DAY_LENGTH) * 100}%`;
  const onBar = (e: React.MouseEvent) => {
    const r = bar.current!.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * DAY_LENGTH);
  };
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => play()} className="grad-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_24px_rgb(var(--brand)/0.4)]" aria-label={state.playing ? "Pause" : "Play"}>
        {state.playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
      </button>
      <div className="flex shrink-0 rounded-full border border-line p-0.5">
        {([1, 2, 5] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSpeed(s)} className={cx("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", state.speed === s ? "bg-raised text-ink" : "text-ink-4 hover:text-ink-2")}>{s}×</button>
        ))}
      </div>
      <div ref={bar} onClick={onBar} className="relative h-9 flex-1 cursor-pointer">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-raised" />
        <div className="grad-line absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ width: pos(state.t) }} />
        {SHIFTS.slice(0, 2).map((s) => (
          <span key={s.id} className="absolute top-0 h-9 border-l border-dashed border-ink-4/50" style={{ left: pos(s.handover) }}>
            <span className="absolute -top-0.5 left-1 whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-wider text-ink-4">Handover</span>
          </span>
        ))}
        {INCIDENTS.map((i) => {
          const st = incidents.find((x) => x.incident.id === i.id)!;
          const color = st.status === "waiting" ? "bg-warn" : st.status === "escalated" ? "bg-bad" : st.status === "resolved" ? "bg-good" : st.status === "upcoming" ? (i.severity === "P1" ? "bg-ink-2" : "bg-ink-4") : "bg-brand";
          return (
            <button key={i.id} type="button" title={`${clock(i.trigger)} · ${i.title}`} onClick={(e) => { e.stopPropagation(); if (st.status === "upcoming") seek(i.trigger - 4); else openRoom(i.id); }}
              className={cx("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel transition hover:scale-125", color, i.severity === "P1" ? "h-3.5 w-3.5" : "h-2.5 w-2.5")}
              style={{ left: pos(i.trigger) }} />
          );
        })}
        <span className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-ink" style={{ left: pos(state.t) }} />
        <div className="absolute inset-x-0 -bottom-1 flex justify-between text-[9.5px] text-ink-4">
          {["00", "04", "08", "12", "16", "20", "24"].map((h) => <span key={h}>{h}:00</span>)}
        </div>
      </div>
      <button type="button" onClick={reset} className="rounded-full p-2 text-ink-4 hover:bg-raised hover:text-ink" title="Restart the day (R)"><RotateCcw className="h-4 w-4" /></button>
    </div>
  );
}
