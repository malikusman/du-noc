import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clock, Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AgentAvatar, Thinking } from "../AgentAvatar";
import { EvidenceChart } from "../Evidence";
import { NetworkMap } from "../NetworkMap";
import { SeverityTag, StatusPill } from "../Status";
import { StepCard } from "./StepCard";
import { AGENTS, AUTONOMY } from "@/sim/agents";
import { aedProtected } from "@/sim/incidents";
import { clock, duration } from "@/sim/time";
import type { AgentId, Hypothesis, StepKind } from "@/sim/types";
import { useSim } from "@/state/sim";
import { aed, compact } from "@/lib/format";
import { cx } from "@/lib/format";

/** How long each step stays on screen before the next agent picks up (ms). */
const DWELL: Record<StepKind, number> = { observe: 5200, correlate: 5600, hypothesize: 5000, tool: 6400, plan: 7000, act: 3800, verify: 4400, learn: 5000 };

export function IncidentRoom() {
  const { state, incidents, sites, links, closeRoom, approve, reject, advanceRoom, pauseRoom, skipRoom } = useSim();
  const current = incidents.find((i) => i.incident.id === state.room);
  const scroller = useRef<HTMLDivElement>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string> | null>(null);
  const skipSeen = useRef(state.roomSkip);
  const openedAt = useRef(state.t);

  const incident = current?.incident;
  const steps = current?.steps ?? [];
  const visible = steps.filter((s) => s.status !== "pending");
  const next = current?.next;
  const liveNext = next && next.status === "pending" && incident && next.step.t <= incident.liveUntil ? next : undefined;
  const scheduled = steps.filter((s) => s.status === "pending" && incident && s.step.t > incident.liveUntil);
  const liveDone = !liveNext && next?.status !== "waiting";

  useEffect(() => {
    const ids = visible.map((s) => s.step.id);
    if (seenIds.current === null) seenIds.current = new Set(visible.filter((s) => s.at < openedAt.current - 0.01).map((s) => s.step.id));
    const added = ids.filter((id) => !seenIds.current!.has(id));
    if (added.length) {
      added.forEach((id) => seenIds.current!.add(id));
      setFreshIds((prev) => new Set([...prev, ...added]));
    }
  }, [visible.map((s) => s.step.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pace the reasoning: after each step has had its moment, move the clock to the next one.
  useEffect(() => {
    if (!current || !liveNext || state.roomPaused) return;
    const last = visible[visible.length - 1];
    const skipped = skipSeen.current !== state.roomSkip;
    skipSeen.current = state.roomSkip;
    const wait = skipped ? 50 : last ? DWELL[last.step.kind] : 1200;
    const timer = window.setTimeout(() => advanceRoom(liveNext.at), wait);
    return () => clearTimeout(timer);
  }, [current?.incident.id, liveNext?.step.id, state.roomPaused, state.roomSkip]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length, next?.status]);

  const evidence = useMemo(() => {
    for (let i = visible.length - 1; i >= 0; i--) if (visible[i].step.evidence) return visible[i].step.evidence;
    return incident?.steps.find((s) => s.evidence)?.evidence;
  }, [visible, incident]);

  const latestHypotheses = useMemo(() => {
    for (let i = visible.length - 1; i >= 0; i--) if (visible[i].step.hypotheses) return visible[i].step.hypotheses;
    return undefined;
  }, [visible]);

  if (!current || !incident) return null;
  const level = state.levels[incident.domain];
  const activeAgent = next && next.status === "waiting" ? next.step.agent : liveNext ? liveNext.step.agent : undefined;
  const top = latestHypotheses ? [...latestHypotheses].sort((a, b) => b.p - a.p)[0] : undefined;
  const crew = [...new Set(incident.steps.map((s) => s.agent))] as AgentId[];
  const involved = new Set(visible.map((s) => s.step.agent));
  const elapsed = (current.closedAt ?? state.t) - incident.trigger;

  const previousHypotheses = (index: number): Hypothesis[] | undefined => {
    for (let i = index - 1; i >= 0; i--) if (visible[i].step.hypotheses) return visible[i].step.hypotheses;
    return undefined;
  };

  return (
    <motion.div className="wall-glow fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.35 }}>
      <header className="flex items-center gap-6 border-b border-line bg-panel/80 px-8 py-4 backdrop-blur-xl">
        <button type="button" onClick={closeRoom} className="btn-line"><ArrowLeft className="h-4 w-4" /> Operations</button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 text-[12px]">
            <SeverityTag severity={incident.severity} />
            <span className="font-mono font-semibold text-ink-3">{incident.number}</span>
            <StatusPill status={current.status} />
            <span className="text-ink-4">{incident.domain} · {incident.place}</span>
          </div>
          <h1 className="mt-1 truncate text-[26px] font-extrabold leading-8 tracking-tight text-ink">{incident.title}</h1>
          <p className="mt-0.5 truncate text-[13.5px] text-ink-3">{incident.oneLiner}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[28px] font-semibold leading-none tabular text-ink">{clock(state.t)}</p>
          <p className="mt-1.5 text-[11.5px] text-ink-4">{incident.domain} autonomy: <span className="font-semibold text-ink-2">{AUTONOMY[level].name}</span></p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_minmax(360px,440px)]">
        <aside className="border-r border-line bg-panel/60 px-4 py-6">
          <p className="eyebrow mb-4 px-2">Agents on this incident</p>
          <ol className="space-y-1">
            {crew.map((id) => {
              const active = id === activeAgent;
              const done = involved.has(id) && !active;
              return (
                <li key={id} className={cx("flex items-center gap-3 rounded-xl px-2 py-2.5 transition", active && "bg-brand/10")}>
                  <AgentAvatar id={id} active={active} done={done} />
                  <div className="min-w-0">
                    <p className={cx("text-[13.5px] font-semibold", active ? "text-brand" : done ? "text-ink" : "text-ink-4")}>{AGENTS[id].name}</p>
                    <p className="truncate text-[11.5px] text-ink-4">{active ? <span className="text-brand">working <Thinking /></span> : AGENTS[id].role}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 rounded-xl border border-line bg-raised p-3.5 text-[12px] leading-5 text-ink-3">
            Every agent sees the same evidence. Each step is logged with its reason, and any engineer can take over at any point.
          </div>
        </aside>

        <section ref={scroller} className="min-h-0 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[760px] space-y-5">
            <AnimatePresence initial={false}>
              {visible.map((s, index) => (
                <StepCard key={s.step.id} state={s} fresh={freshIds.has(s.step.id)} previous={previousHypotheses(index)} level={level}
                  onApprove={() => approve(s.step.id)} onReject={() => reject(s.step.id)} />
              ))}
            </AnimatePresence>
            {liveNext && (
              <div className="flex items-center gap-3 pl-14 text-[13px] text-ink-3">
                <AgentAvatar id={liveNext.step.agent} size="sm" active />
                <span>{AGENTS[liveNext.step.agent].name} is {liveNext.step.kind === "tool" ? "running tests" : "working"} <Thinking /></span>
              </div>
            )}
            {liveDone && scheduled.length > 0 && (
              <div className="ml-14 rounded-2xl border border-dashed border-line p-5">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-2"><Clock className="h-4 w-4" /> The agents carry on in the background</p>
                <ul className="mt-3 space-y-2">
                  {scheduled.map((s) => (
                    <li key={s.step.id} className="flex items-center gap-3 text-[13px] text-ink-3">
                      <span className="shrink-0 font-mono font-semibold text-ink tabular">{clock(s.at)}</span>
                      <AgentAvatar id={s.step.agent} size="sm" />
                      {s.step.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {liveDone && (
              <div className="flex items-center justify-between gap-4 pl-14 pt-2">
                <p className="text-[13px] text-ink-3">{current.status === "resolved" ? "Closed and proven by the KPIs." : current.status === "escalated" ? "Handed to the NOC engineers." : "Live reasoning complete."}</p>
                <button type="button" onClick={closeRoom} className="btn-line">Back to operations</button>
              </div>
            )}
            <div className="h-24" />
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-line bg-panel/60 px-6 py-6">
          <div className="h-[170px] overflow-hidden rounded-xl border border-line">
            <NetworkMap statuses={sites} links={links} focus={incident.siteId} callouts={[{ siteId: incident.siteId, text: incident.place, tone: "brand" }]} />
          </div>
          <div className="mt-6">
            <p className="eyebrow mb-3">Evidence</p>
            <AnimatePresence mode="wait">
              {evidence && (
                <motion.div key={evidence.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <EvidenceChart evidence={evidence} height={190} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {top && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="eyebrow">Most likely cause</p>
              <p className="mt-2 text-[17px] font-bold leading-6 tracking-tight text-ink">{top.label}</p>
              <div className="mt-2 flex items-end gap-3">
                <motion.span key={top.p} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} className="grad-text font-mono text-[46px] font-bold leading-none tabular">{Math.round(top.p * 100)}%</motion.span>
                <span className="mb-1.5 text-[12.5px] text-ink-3">confidence</span>
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-line pt-5">
            <p className="eyebrow">What this is worth</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Stat label="Revenue protected" value={aed(aedProtected(incident))} />
              <Stat label="Subscribers protected" value={incident.impact.subscribers ? compact(incident.impact.subscribers) : "None at risk"} />
              <Stat label="Tickets avoided" value={String(incident.impact.ticketsAvoided)} />
              <Stat label={current.closedAt ? "Time to resolve" : "Elapsed"} value={duration(Math.max(0, elapsed))} />
            </dl>
          </div>
        </aside>
      </div>

      {liveNext && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-panel/95 p-1.5 text-ink shadow-2xl backdrop-blur">
            <button type="button" onClick={() => pauseRoom()} className="rounded-full p-2 hover:bg-raised" aria-label={state.roomPaused ? "Resume" : "Pause"}>
              {state.roomPaused ? <Play className="h-4 w-4" fill="currentColor" /> : <Pause className="h-4 w-4" fill="currentColor" />}
            </button>
            <button type="button" onClick={skipRoom} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium hover:bg-raised">
              Next step <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] text-ink-4">{label}</dt>
      <dd className="mt-0.5 text-[16px] font-bold tracking-tight text-ink">{value}</dd>
    </div>
  );
}
