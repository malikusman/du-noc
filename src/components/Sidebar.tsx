import { BarChart3, BookOpen, LayoutDashboard, Bot, Brain, ChevronsLeft, ChevronsRight, DollarSign, Home, Link2, MessageSquareText, Radio, Settings, Shield, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

/** Same groups and names as the NOC sidebar the du team has already seen. */
export const NAV_GROUPS = [
  {
    label: "Admin",
    items: [{ to: "/command", label: "Command Center", icon: LayoutDashboard }],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/prevention", label: "Downtime Prevention", icon: TrendingDown },
      { to: "/correlation", label: "Incident Correlation", icon: Link2 },
      { to: "/revenue", label: "Revenue Protection", icon: DollarSign },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/operations", label: "Overview", icon: Home },
      { to: "/network", label: "Cell Site Management", icon: Radio },
      { to: "/remediation", label: "Autonomous Remediation", icon: Bot },
      { to: "/security", label: "Security Operations", icon: Shield },
      { to: "/agents", label: "Agent Observatory", icon: Brain },
      { to: "/reports", label: "Analytics & Reports", icon: BarChart3 },
      { to: "/executive", label: "Executive Intelligence", icon: MessageSquareText },
      { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const KEY = "du-noc-sidebar";

export function useSidebarWidth() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.style.setProperty("--sb", collapsed ? "68px" : "248px");
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);
  return { collapsed, setCollapsed };
}

export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebarWidth();
  const { kpi } = useSim();
  return (
    <aside className="sticky top-0 z-50 flex h-screen shrink-0 flex-col border-r border-line bg-panel/95 backdrop-blur-xl transition-[width] duration-300" style={{ width: "var(--sb)" }}>
      <div className={cx("flex h-16 shrink-0 items-center border-b border-line", collapsed ? "justify-center px-2" : "px-4")}>
        {collapsed ? <span className="grad-bg inline-flex h-9 w-9 items-center justify-center rounded-xl text-[17px] font-extrabold text-white">du</span> : <Logo />}
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={cx(gi > 0 && "mt-4 border-t border-line pt-4")}>
            {!collapsed && <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} title={item.label}
                    className={({ isActive }) => cx("group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition",
                      collapsed && "justify-center px-0",
                      isActive ? "bg-brand/12 text-ink" : "text-ink-3 hover:bg-raised hover:text-ink")}>
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="grad-bg absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-full" />}
                        <item.icon className={cx("h-[18px] w-[18px] shrink-0", isActive ? "text-brand" : "")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {item.to === "/remediation" && kpi.waiting > 0 && (
                          <span className={cx("inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[10px] font-bold text-black", collapsed ? "absolute right-1 top-1" : "ml-auto")}>{kpi.waiting}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <button type="button" onClick={() => setCollapsed(!collapsed)} className="flex h-11 shrink-0 items-center justify-center gap-2 border-t border-line text-[12px] text-ink-4 hover:text-ink">
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
      </button>
    </aside>
  );
}
