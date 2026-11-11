import { AnimatePresence, motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { useMemo } from "react";
import { AgentAvatar } from "./AgentAvatar";
import { SeverityTag } from "./Status";
import { ROUTINE } from "@/sim/routine";
import { siteLabel } from "@/sim/sites";
import { clock } from "@/sim/time";
import type { AgentId } from "@/sim/types";
import { useSim } from "@/state/sim";
import { useEscalation } from "@/state/escalation";
import { cx } from "@/lib/format";

interface Item {
  key: string;
  t: number;
  agent: AgentId;
  text: string;
  sub: string;
  incident?: string;
  routine?: boolean;
}

export function useFeed(limit = 40): Item[] {
  const { state, incidents } = useSim();
  return useMemo(() => {
    const items: Item[] = [];
    for (const s of incidents) {
      for (const step of s.steps) {
        if (step.status === "done" && step.step.feed) {
          items.push({ key: step.step.id, t: step.at, agent: step.step.agent, text: step.step.feed, sub: `${s.incident.number} · ${s.incident.place}`, incident: s.incident.id });
        }
      }
    }
    for (const r of ROUTINE) {
      if (r.t + r.durationMin <= state.t) items.push({ key: r.id, t: r.t + r.durationMin, agent: r.agent, text: `${r.kind}: ${r.action.charAt(0).toLowerCase()}${r.action.slice(1)}`, sub: `${siteLabel(r.siteId)} · no ticket`, routine: true });
    }
    return items.sort((a, b) => b.t - a.t).slice(0, limit);
  }, [incidents, state.t, limit]);
}

export function Feed() {
  const items = useFeed(40);
  const { openRoom } = useSim();
  return (
    <ol className="space-y-1">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.li key={item.key} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <button type="button" disabled={!item.incident} onClick={() => item.incident && openRoom(item.incident)}
              className={cx("flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition", item.incident && "hover:bg-raised")}>
              <AgentAvatar id={item.agent} size="sm" done={!item.routine} />
              <span className="min-w-0 flex-1">
                <span className={cx("block text-[12.8px] leading-[18px]", item.routine ? "text-ink-3" : "text-ink")}>{item.text}</span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-4">{item.sub}</span>
              </span>
              <span className="shrink-0 font-mono text-[10.5px] text-ink-4">{clock(item.t)}</span>
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
      {items.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-ink-4">Quiet so far. Press Space to start the day.</li>}
    </ol>
  );
}

export function Approvals() {
  const { incidents, approve, reject, openRoom, state } = useSim();
  const { escalations } = useEscalation();
  const waiting = incidents.flatMap((s) => s.steps.filter((x) => x.status === "waiting").map((x) => ({ s, x })));
  if (waiting.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-[12.5px] text-ink-4">
        <Check className="h-4 w-4 text-good" /> Nothing waiting for a person
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {waiting.map(({ s, x }) => (
        <motion.div key={x.step.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-warn/50 bg-warn/10 p-3">
          <button type="button" onClick={() => openRoom(s.incident.id)} className="block w-full text-left">
            <p className="flex items-center gap-2 text-[11px] text-ink-3"><SeverityTag severity={s.incident.severity} /> {s.incident.number} · waiting {Math.max(0, Math.round(state.t - x.at))} min</p>
            <p className="mt-1 text-[13px] font-semibold leading-[18px] text-ink">{x.step.title}</p>
            {x.step.action?.cost && <p className="mt-0.5 text-[11.5px] text-ink-3">{x.step.action.cost}</p>}
            {escalations[x.step.id] && !["canceled", "failed", "unanswered"].includes(escalations[x.step.id].status) && (
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-good"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />{escalations[x.step.id].channel === "whatsapp-message" ? "Sent on WhatsApp" : "On a call with"} {escalations[x.step.id].approver.name}</p>
            )}
          </button>
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={() => reject(x.step.id)} className="btn-line flex-1 py-1.5 text-[12.5px]">Reject</button>
            <button type="button" onClick={() => approve(x.step.id)} className="btn-primary flex-1 py-1.5 text-[12.5px]"><Zap className="h-3.5 w-3.5" /> Approve</button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
