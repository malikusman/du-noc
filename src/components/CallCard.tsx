import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageCircle, Phone, PhoneOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHANNELS, VIA_LABEL } from "@/sim/escalation";
import { INCIDENT_BY_ID } from "@/sim/incidents";
import { useEscalation, type Escalation } from "@/state/escalation";
import { cx } from "@/lib/format";

const STATUS: Record<string, string> = {
  dialing: "Calling…",
  ringing: "Ringing…",
  speaking: "Agent is briefing",
  listening: "Listening for a decision",
  messaging: "Sending…",
  "waiting-reply": "Delivered · waiting for a tap",
  decided: "Decided",
  unanswered: "No answer · left on the NOC screen",
  failed: "Couldn't connect",
  canceled: "Call ended",
};

/** The shift lead's side of an escalation: a phone call or a WhatsApp message, with the agent's briefing as it is spoken. */
export function CallCard() {
  const { escalations, dismissed, dismiss } = useEscalation();
  const list = Object.values(escalations).filter((e) => !dismissed.includes(e.stepId));
  const open = list.filter((e) => !["decided", "canceled"].includes(e.status));
  const show = open[open.length - 1] ?? list[list.length - 1];

  useEffect(() => {
    if (!show || !["decided", "canceled"].includes(show.status)) return;
    const id = window.setTimeout(() => dismiss(show.stepId), 9000);
    return () => clearTimeout(id);
  }, [show?.stepId, show?.status, dismiss]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {show && <Card key={show.stepId} e={show} />}
    </AnimatePresence>
  );
}

function Card({ e }: { e: Escalation }) {
  const { answer, cancel, dismiss, backend } = useEscalation();
  const incident = INCIDENT_BY_ID[e.incidentId];
  const channel = CHANNELS.find((c) => c.id === e.channel)!;
  const message = e.channel === "whatsapp-message";
  const ringing = e.status === "dialing" || e.status === "ringing";
  const canDecide = ["speaking", "listening", "waiting-reply"].includes(e.status) && !e.decision;
  const done = e.status === "decided" || e.status === "canceled";
  const scroller = useRef<HTMLDivElement>(null);
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (e.status === "speaking" && since === null) setSince(Date.now());
  }, [e.status, since]);
  useEffect(() => {
    if (done || since === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [done, since]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [e.transcript.length]);

  const secs = since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  const timer = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="fixed bottom-6 right-6 z-[55] w-[360px] overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <div className="grad-line h-1" />
      <div className="flex items-center gap-2 px-4 pt-3 text-[11px]">
        {message ? <MessageCircle className="h-3.5 w-3.5 text-good" /> : <Phone className="h-3.5 w-3.5 text-good" />}
        <span className="font-semibold text-ink-2">{channel.name}</span>
        <span className="text-ink-4">· {incident.number}</span>
        <span className={cx("ml-auto rounded-full px-2 py-0.5 font-semibold", e.live ? "bg-bad/15 text-bad" : "bg-raised text-ink-3")}>{e.live ? (backend.dryRun ? "Live · dry run" : "Live") : "Simulated"}</span>
        {done && <button type="button" onClick={() => dismiss(e.stepId)} className="rounded-full p-1 text-ink-4 hover:bg-raised hover:text-ink" aria-label="Close"><X className="h-3.5 w-3.5" /></button>}
      </div>

      <div className="flex items-center gap-3 px-4 pb-3 pt-3">
        <div className="relative">
          <span className="grad-bg flex h-12 w-12 items-center justify-center rounded-full text-[18px] font-bold text-white">{e.approver.name[0]}</span>
          {ringing && <span className="absolute inset-0 animate-ping2 rounded-full border-2 border-good" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold leading-5 text-ink">{e.approver.name}</p>
          <p className="truncate text-[12px] text-ink-3">{e.approver.role}{e.live && backend.contacts[e.approver.key] ? ` · ${backend.contacts[e.approver.key]}` : ""}</p>
        </div>
        <div className="text-right">
          <p className={cx("text-[11.5px] font-semibold", e.decision === "approved" ? "text-good" : e.decision === "rejected" ? "text-bad" : "text-ink-2")}>
            {e.decision ? `${e.decision === "approved" ? "Approved" : "Rejected"} ${VIA_LABEL[e.via ?? "app"] ?? ""}` : STATUS[e.status] ?? e.status}
          </p>
          {!message && since !== null && <p className="font-mono text-[11px] text-ink-4">{timer}</p>}
        </div>
      </div>

      <div ref={scroller} className="max-h-[230px] min-h-[64px] space-y-2 overflow-y-auto border-t border-line bg-raised/50 px-4 py-3">
        {e.transcript.length === 0 && <p className="text-[12px] text-ink-4">{message ? "Sending the briefing with Approve, Reject and Call me buttons…" : `The agent is calling ${e.approver.name} with a spoken briefing on this incident.`}</p>}
        {e.transcript.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cx("flex", l.who === "human" ? "justify-end" : l.who === "system" ? "justify-center" : "justify-start")}>
            {l.who === "system" ? (
              <span className="text-[10.5px] uppercase tracking-wider text-ink-4">{l.text}</span>
            ) : (
              <p className={cx("max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[12.5px] leading-[18px]", l.who === "human" ? "rounded-br-md bg-good/20 text-ink" : "rounded-bl-md bg-panel text-ink-2 shadow-sm")}>
                {l.who === "agent" && <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-brand">NOC agent</span>}
                {l.text}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="px-4 pb-4 pt-3">
        {canDecide ? (
          <>
            <p className="mb-2 text-[11px] text-ink-4">{e.live ? `${e.approver.name} can say “approve” or “reject”, press 1 or 2, or decide here:` : `Answer as ${e.approver.name}:`}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => answer(e.stepId, "rejected")} className="btn-line flex-1"><X className="h-4 w-4" /> Reject</button>
              <button type="button" onClick={() => answer(e.stepId, "approved")} className="btn flex-1 bg-good text-white hover:brightness-110"><Check className="h-4 w-4" /> Approve</button>
            </div>
          </>
        ) : !done ? (
          <button type="button" onClick={() => cancel(e.stepId)} className="btn w-full bg-bad/90 text-white hover:bg-bad"><PhoneOff className="h-4 w-4" /> {message ? "Cancel" : "Hang up"}</button>
        ) : (
          <p className="text-center text-[12px] text-ink-4">{e.decision ? "The agents carry on from here." : "Still waiting on the NOC screen."}</p>
        )}
      </div>
    </motion.div>
  );
}
