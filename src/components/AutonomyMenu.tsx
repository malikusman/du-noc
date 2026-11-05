import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AUTONOMY, DOMAINS } from "@/sim/agents";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

export function AutonomyMenu() {
  const { state, setAllLevels } = useSim();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const values = DOMAINS.map((d) => state.levels[d]);
  const same = values.every((v) => v === values[0]);
  const label = same ? AUTONOMY[values[0]].short : "Per domain";

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5 text-[12.5px] text-ink-2 hover:border-brand/50">
        <span className="text-ink-4">Autonomy</span>
        <span className="font-semibold text-ink">{label}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-[340px] rounded-2xl border border-line bg-panel p-2 shadow-2xl">
          {AUTONOMY.map((a) => {
            const on = same && values[0] === a.level;
            return (
              <button key={a.level} type="button" onClick={() => { setAllLevels(a.level); setOpen(false); }}
                className={cx("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-raised", on && "bg-raised")}>
                <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "grad-bg border-transparent text-white" : "border-line")}>{on && <Check className="h-3 w-3" />}</span>
                <span>
                  <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">{a.name}<span className="rounded bg-raised px-1.5 py-px font-mono text-[10px] text-ink-3">TM Forum {a.tmf}</span></span>
                  <span className="mt-0.5 block text-[12px] leading-5 text-ink-3">{a.description}</span>
                </span>
              </button>
            );
          })}
          <button type="button" onClick={() => { navigate("/settings"); setOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-line px-3 py-2.5 text-[12.5px] font-medium text-brand hover:bg-raised">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Set autonomy per domain
          </button>
        </div>
      )}
    </div>
  );
}
