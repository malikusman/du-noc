import { Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { AutonomyMenu } from "./AutonomyMenu";
import { useSim } from "@/state/sim";
import { useTheme } from "@/state/theme";
import { clock, DAY_LABEL } from "@/sim/time";
import { cx } from "@/lib/format";

const NAV = [
  { to: "/operations", label: "Operations" },
  { to: "/incidents", label: "Incidents" },
  { to: "/network", label: "Network" },
  { to: "/security", label: "Security" },
  { to: "/agents", label: "Agents" },
  { to: "/knowledge", label: "Knowledge" },
  { to: "/reports", label: "Reports" },
  { to: "/policy", label: "Policy" },
];

export function TopNav() {
  const { state, kpi } = useSim();
  const { theme, toggle } = useTheme();
  return (
    <header className="relative z-50 flex h-16 shrink-0 items-center gap-6 border-b border-line bg-panel/90 px-5 backdrop-blur-xl">
      <Logo />
      <nav className="ml-4 flex items-center gap-1">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => cx("relative rounded-lg px-3 py-2 text-[13.5px] font-medium transition", isActive ? "text-ink" : "text-ink-3 hover:text-ink")}>
            {({ isActive }) => (
              <>
                {item.label}
                {item.to === "/incidents" && kpi.waiting > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[10px] font-bold text-black">{kpi.waiting}</span>
                )}
                {isActive && <span className="grad-line absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[11.5px] text-ink-3 xl:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-good shadow-[0_0_8px_rgb(var(--good))]" /> Simulated network
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
