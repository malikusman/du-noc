import { Moon, Sun } from "lucide-react";
import { AutonomyMenu } from "./AutonomyMenu";
import { useSim } from "@/state/sim";
import { useTheme } from "@/state/theme";
import { ACTS } from "@/sim/story";
import { clock, DAY_LABEL, shiftLead } from "@/sim/time";

export function TopNav() {
  const { state } = useSim();
  const { theme, toggle } = useTheme();
  const act = ACTS.find((a) => state.t >= a.from && state.t < a.to) ?? ACTS[ACTS.length - 1];
  const lead = shiftLead(state.t);
  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center gap-5 border-b border-line bg-panel/90 px-6 backdrop-blur-xl">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">{act.name}</p>
        <p className="truncate text-[14px] font-semibold text-ink">{act.theme}</p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[11.5px] text-ink-3 2xl:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-good shadow-[0_0_8px_rgb(var(--good))]" /> Simulated network
        </span>
        <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-3 lg:inline-flex">
          On shift: <span className="font-semibold text-ink">{lead.name}</span> <span className="text-ink-4">· {lead.role}</span>
        </span>
        <AutonomyMenu />
        <div className="text-right leading-none">
          <p className="font-mono text-[19px] font-semibold tabular text-ink">{clock(state.t)}</p>
          <p className="mt-1 text-[10.5px] text-ink-4">{DAY_LABEL}</p>
        </div>
        <button type="button" onClick={toggle} className="rounded-full border border-line p-2 text-ink-2 hover:bg-raised" aria-label="Switch theme" title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
