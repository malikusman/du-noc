import { AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { IncidentRoom } from "@/components/room/IncidentRoom";
import { useDirectorKeys } from "@/hooks/useDirectorKeys";
import { useSim } from "@/state/sim";
import Operations from "@/pages/Operations";
import Incidents from "@/pages/Incidents";
import Network from "@/pages/Network";
import Security from "@/pages/Security";
import Agents from "@/pages/Agents";
import Knowledge from "@/pages/Knowledge";
import Reports from "@/pages/Reports";
import Policy from "@/pages/Policy";

export default function App() {
  const { pathname } = useLocation();
  const { state, setFollow, closeRoom } = useSim();
  const path = useRef(pathname);
  useDirectorKeys();
  // Incidents open on their own only while Operations is on screen.
  useEffect(() => {
    setFollow(pathname === "/operations");
    if (path.current !== pathname && state.room) closeRoom();
    path.current = pathname;
  }, [pathname, state.room, setFollow, closeRoom]);
  const fixed = pathname === "/operations" || Boolean(state.room);
  return (
    <div className={fixed ? "wall-glow flex h-screen flex-col overflow-hidden" : "wall-glow flex min-h-screen flex-col"}>
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/operations" replace />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/network" element={<Network />} />
        <Route path="/security" element={<Security />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="*" element={<Navigate to="/operations" replace />} />
      </Routes>
      <AnimatePresence>{state.room && <IncidentRoom key={state.room} />}</AnimatePresence>
    </div>
  );
}
