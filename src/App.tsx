import { AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { Intro } from "@/components/Intro";
import { CallCard } from "@/components/CallCard";
import { IncidentRoom } from "@/components/room/IncidentRoom";
import { useDirectorKeys } from "@/hooks/useDirectorKeys";
import { useSim } from "@/state/sim";
import Operations from "@/pages/Operations";
import Correlation from "@/pages/Correlation";
import Network from "@/pages/Network";
import Security from "@/pages/Security";
import Agents from "@/pages/Agents";
import Knowledge from "@/pages/Knowledge";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import Prevention from "@/pages/Prevention";
import Revenue from "@/pages/Revenue";
import Remediation from "@/pages/Remediation";
import Executive from "@/pages/Executive";
import Command from "@/pages/Command";

export default function App() {
  const { pathname } = useLocation();
  const { state, setFollow, closeRoom } = useSim();
  const path = useRef(pathname);
  const scroller = useRef<HTMLDivElement>(null);
  useDirectorKeys();
  // Incidents open on their own only while the Overview is on screen.
  useEffect(() => {
    setFollow(pathname === "/operations");
    if (path.current !== pathname && state.room) closeRoom();
    if (path.current !== pathname) scroller.current?.scrollTo({ top: 0 });
    path.current = pathname;
  }, [pathname, state.room, setFollow, closeRoom]);
  const fixed = pathname === "/operations";
  return (
    <div className="wall-glow flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <div ref={scroller} className={fixed ? "flex min-h-0 flex-1" : "flex min-h-0 flex-1 flex-col overflow-y-auto"}>
          <Routes>
            <Route path="/" element={<Navigate to="/operations" replace />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/command" element={<Command />} />
            <Route path="/prevention" element={<Prevention />} />
            <Route path="/correlation" element={<Correlation />} />
            <Route path="/revenue" element={<Revenue />} />
            <Route path="/network" element={<Network />} />
            <Route path="/remediation" element={<Remediation />} />
            <Route path="/security" element={<Security />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/executive" element={<Executive />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/incidents" element={<Navigate to="/correlation" replace />} />
            <Route path="/policy" element={<Navigate to="/settings" replace />} />
            <Route path="*" element={<Navigate to="/operations" replace />} />
          </Routes>
        </div>
      </div>
      <AnimatePresence>{state.room && <IncidentRoom key={state.room} />}</AnimatePresence>
      {pathname === "/operations" && <Intro />}
      <CallCard />
    </div>
  );
}
