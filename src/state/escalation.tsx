import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { INCIDENT_BY_ID } from "@/sim/incidents";
import { approverAt, scriptFor, type Approver, type CallScript, type Channel } from "@/sim/escalation";
import { useSim } from "./sim";

/**
 * Human-in-the-loop escalation. When an agent waits for a decision, the shift lead is reached by
 * a WhatsApp call, a phone call or a WhatsApp message.
 *
 * Two modes:
 *  • Simulated: everything happens on screen (a phone card, the spoken briefing, Approve/Reject on the phone).
 *  • Live: the escalation service (server/index.mjs) places the real call or message, and the decision
 *    comes back over Server-Sent Events.
 */

export type CallStatus = "dialing" | "ringing" | "speaking" | "listening" | "messaging" | "waiting-reply" | "decided" | "unanswered" | "failed" | "canceled";

export interface Line {
  who: "agent" | "human" | "system";
  text: string;
}

export interface Escalation {
  stepId: string;
  incidentId: string;
  channel: Channel;
  approver: Approver;
  script: CallScript;
  status: CallStatus;
  /** How many of the script's spoken parts have been heard so far. */
  spoken: number;
  transcript: Line[];
  decision?: "approved" | "rejected";
  via?: string;
  serverId?: string;
  live: boolean;
  log: string[];
}

export interface EscalationSettings {
  mode: "simulated" | "live";
  channel: Channel;
  /** Seconds to wait on screen before calling. 0 = only when someone presses Call. */
  autoAfter: 0 | 4 | 10;
  /** Read the briefing aloud through the laptop speakers in simulated mode. */
  speak: boolean;
}

interface Backend {
  online: boolean;
  dryRun: boolean;
  channels: Record<Channel, boolean>;
  contacts: Record<string, string>;
}

interface Ctx {
  settings: EscalationSettings;
  setSettings: (s: Partial<EscalationSettings>) => void;
  backend: Backend;
  escalations: Record<string, Escalation>;
  start: (stepId: string) => void;
  answer: (stepId: string, decision: "approved" | "rejected") => void;
  cancel: (stepId: string) => void;
  dismiss: (stepId: string) => void;
  dismissed: string[];
}

const Context = createContext<Ctx | null>(null);
const KEY = "du-noc-escalation";
const DEFAULTS: EscalationSettings = { mode: "simulated", channel: "whatsapp-call", autoAfter: 4, speak: false };

function loadSettings(): EscalationSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** Spoken parts of a script, in order. */
export function parts(s: CallScript) {
  return [s.greeting, ...s.lines, s.ask];
}

const LINE_MS = 2900;

export function EscalationProvider({ children }: { children: ReactNode }) {
  const sim = useSim();
  const [settings, setSettingsState] = useState<EscalationSettings>(loadSettings);
  const [backend, setBackend] = useState<Backend>({ online: false, dryRun: true, channels: { "whatsapp-call": false, phone: false, "whatsapp-message": false }, contacts: {} });
  const [escalations, setEscalations] = useState<Record<string, Escalation>>({});
  const [dismissed, setDismissed] = useState<string[]>([]);
  const timers = useRef<Record<string, number[]>>({});
  const simRef = useRef(sim);
  simRef.current = sim;
  const escRef = useRef(escalations);
  escRef.current = escalations;

  const setSettings = useCallback((s: Partial<EscalationSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...s };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const patch = useCallback((stepId: string, p: Partial<Escalation> | ((e: Escalation) => Partial<Escalation>)) => {
    setEscalations((all) => {
      const e = all[stepId];
      if (!e) return all;
      const change = typeof p === "function" ? p(e) : p;
      return { ...all, [stepId]: { ...e, ...change } };
    });
  }, []);

  const later = useCallback((stepId: string, ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    (timers.current[stepId] ??= []).push(id);
  }, []);

  const stopTimers = useCallback((stepId: string) => {
    (timers.current[stepId] ?? []).forEach(clearTimeout);
    timers.current[stepId] = [];
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  /* ── backend discovery ── */
  useEffect(() => {
    let alive = true;
    const probe = () =>
      fetch("/api/escalation/config")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((c) => alive && setBackend({ online: true, dryRun: c.dryRun, channels: c.channels, contacts: c.contacts }))
        .catch(() => alive && setBackend((b) => ({ ...b, online: false })));
    probe();
    const id = window.setInterval(probe, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const live = settings.mode === "live" && backend.online;

  /* ── spoken briefing: reveal parts one by one (optionally aloud) ── */
  const speakParts = useCallback((stepId: string) => {
    const e = escRef.current[stepId];
    if (!e) return;
    const all = parts(e.script);
    const reveal = (i: number) => {
      const cur = escRef.current[stepId];
      if (!cur || cur.decision || cur.status === "canceled") return;
      patch(stepId, (x) => ({ spoken: i + 1, transcript: [...x.transcript, { who: "agent", text: all[i] }], status: i + 1 >= all.length ? (x.channel === "whatsapp-message" ? "waiting-reply" : "listening") : "speaking" }));
      if (i + 1 >= all.length) return;
      const aloud = settings.speak && !cur.live && typeof window !== "undefined" && "speechSynthesis" in window;
      if (aloud) {
        const u = new SpeechSynthesisUtterance(all[i]);
        const voice = window.speechSynthesis.getVoices().find((v) => /en-GB/i.test(v.lang)) ?? window.speechSynthesis.getVoices().find((v) => /^en/i.test(v.lang));
        if (voice) u.voice = voice;
        u.rate = 1.04;
        u.onend = () => later(stepId, 350, () => reveal(i + 1));
        window.speechSynthesis.speak(u);
      } else later(stepId, LINE_MS, () => reveal(i + 1));
    };
    reveal(0);
  }, [patch, later, settings.speak]);

  /* ── start an escalation ── */
  const start = useCallback((stepId: string) => {
    if (escRef.current[stepId] && !["canceled", "failed", "unanswered"].includes(escRef.current[stepId].status)) return;
    const state = simRef.current.incidents.find((s) => s.steps.some((x) => x.step.id === stepId && x.status === "waiting"));
    const stepState = state?.steps.find((x) => x.step.id === stepId);
    if (!state || !stepState) return;
    const approver = approverAt(stepState.at);
    const script = scriptFor(INCIDENT_BY_ID[state.incident.id], stepState.step, approver.name);
    const channel = settings.channel;
    const e: Escalation = { stepId, incidentId: state.incident.id, channel, approver, script, status: channel === "whatsapp-message" ? "messaging" : "dialing", spoken: 0, transcript: [], live, log: [] };
    setEscalations((all) => ({ ...all, [stepId]: e }));
    setDismissed((d) => d.filter((x) => x !== stepId));

    if (live) {
      fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, incident: { number: state.incident.number, title: state.incident.title, severity: state.incident.severity }, approver, channel, script }),
      })
        .then((r) => r.json())
        .then((r) => (r.error ? patch(stepId, { status: "failed", log: [r.error] }) : patch(stepId, { serverId: r.id })))
        .catch(() => patch(stepId, { status: "failed", log: ["The escalation service is not reachable."] }));
      return;
    }
    // Simulated: dial, ring, answer, read the briefing, then wait for the person on the phone.
    if (channel === "whatsapp-message") {
      later(stepId, 1200, () => patch(stepId, { status: "waiting-reply", spoken: parts(script).length, transcript: [{ who: "agent", text: script.message }] }));
      return;
    }
    later(stepId, 1200, () => patch(stepId, { status: "ringing" }));
    later(stepId, 4200, () => {
      patch(stepId, { status: "speaking", transcript: [{ who: "system", text: `${approver.name} answered` }] });
      speakParts(stepId);
    });
  }, [settings.channel, live, patch, later, speakParts]);

  /* ── the person on the phone decides (presenter in simulated mode, or the app in live mode) ── */
  const answer = useCallback((stepId: string, decision: "approved" | "rejected") => {
    const e = escRef.current[stepId];
    if (!e || e.decision) return;
    stopTimers(stepId);
    const via = e.channel;
    const said = e.channel === "whatsapp-message" ? (decision === "approved" ? "Tapped Approve" : "Tapped Reject") : decision === "approved" ? "Approve. Go ahead." : "Reject. Hold it.";
    const reply = decision === "approved" ? e.script.approved : e.script.rejected;
    if (e.live && e.serverId) {
      fetch(`/api/escalations/${e.serverId}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, via, heard: said }) }).catch(() => {});
    }
    patch(stepId, (x) => ({ decision, via, status: "decided", transcript: [...x.transcript, { who: "human", text: said }, ...(x.channel === "whatsapp-message" ? [] : [{ who: "agent" as const, text: reply }])] }));
    if (decision === "approved") simRef.current.approve(stepId, via);
    else simRef.current.reject(stepId, via);
  }, [patch, stopTimers]);

  const cancel = useCallback((stepId: string) => {
    const e = escRef.current[stepId];
    if (!e) return;
    stopTimers(stepId);
    if (e.live && e.serverId) fetch(`/api/escalations/${e.serverId}/cancel`, { method: "POST" }).catch(() => {});
    patch(stepId, { status: "canceled" });
  }, [patch, stopTimers]);

  const dismiss = useCallback((stepId: string) => setDismissed((d) => [...d, stepId]), []);

  /* ── live updates from the escalation service ── */
  useEffect(() => {
    if (!live) return;
    const source = new EventSource("/api/escalations/stream");
    source.onmessage = (msg) => {
      let v: { id: string; stepId: string; status: string; decision?: "approved" | "rejected"; via?: string; heard?: string; log?: { note: string }[]; channel: Channel };
      try {
        v = JSON.parse(msg.data);
      } catch {
        return;
      }
      const e = escRef.current[v.stepId];
      if (!e || (e.serverId && e.serverId !== v.id)) return;
      const log = (v.log ?? []).map((l) => l.note);
      if (v.decision && !e.decision) {
        stopTimers(v.stepId);
        const heard = v.heard ? `“${v.heard}”` : v.decision === "approved" ? "Approve." : "Reject.";
        const reply = v.decision === "approved" ? e.script.approved : e.script.rejected;
        patch(v.stepId, (x) => ({ decision: v.decision, via: v.via, status: "decided", log, transcript: [...x.transcript, { who: "human", text: heard }, ...(x.channel === "whatsapp-message" ? [] : [{ who: "agent" as const, text: reply }])] }));
        if (v.decision === "approved") simRef.current.approve(v.stepId, v.via ?? v.channel);
        else simRef.current.reject(v.stepId, v.via ?? v.channel);
        return;
      }
      const status = v.status === "speaking" ? "speaking" : v.status === "no-decision" || v.status === "no-answer" || v.status === "busy" ? "dialing" : (v.status as CallStatus);
      const begin = status === "speaking" && e.spoken === 0 && e.status !== "speaking";
      patch(v.stepId, { status: e.spoken > 0 && status === "speaking" ? e.status : status, channel: v.channel, log, ...(begin ? { transcript: [{ who: "system", text: `${e.approver.name} answered` }] } : {}) });
      if (begin) speakParts(v.stepId);
      if (v.status === "waiting-reply" && e.channel === "whatsapp-message" && e.spoken === 0) patch(v.stepId, { spoken: 1, transcript: [{ who: "agent", text: e.script.message }] });
    };
    return () => source.close();
  }, [live, patch, speakParts, stopTimers]);

  /* ── decided on the NOC screen (button or A key) while a call is running ── */
  useEffect(() => {
    for (const e of Object.values(escalations)) {
      if (e.decision || e.status === "canceled") continue;
      const a = sim.state.approvals[e.stepId];
      if (a && !a.auto && a.decision) {
        stopTimers(e.stepId);
        if (e.live && e.serverId) fetch(`/api/escalations/${e.serverId}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: a.decision, via: "app" }) }).catch(() => {});
        patch(e.stepId, (x) => ({ decision: a.decision, via: a.via ?? "app", status: "decided", transcript: [...x.transcript, { who: "system", text: `Decided on the NOC screen` }] }));
      }
    }
  }, [sim.state.approvals, escalations, patch, stopTimers]);

  /* ── auto-escalate when a step starts waiting ── */
  const waitingIds = useMemo(() => sim.incidents.flatMap((s) => s.steps.filter((x) => x.status === "waiting").map((x) => x.step.id)), [sim.incidents]);
  useEffect(() => {
    if (!settings.autoAfter) return;
    const ids = waitingIds.filter((id) => !escRef.current[id]);
    if (!ids.length) return;
    const handles = ids.map((id) => window.setTimeout(() => start(id), settings.autoAfter * 1000));
    return () => handles.forEach(clearTimeout);
  }, [waitingIds.join(), settings.autoAfter, start]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── a restart or a seek backwards clears calls that no longer apply ── */
  useEffect(() => {
    const gone = Object.keys(escRef.current).filter((id) => !waitingIds.includes(id) && !sim.state.approvals[id]);
    if (!gone.length) return;
    gone.forEach(stopTimers);
    setEscalations((all) => Object.fromEntries(Object.entries(all).filter(([id]) => !gone.includes(id))));
  }, [waitingIds.join(), sim.state.approvals, stopTimers]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: Ctx = { settings, setSettings, backend, escalations, start, answer, cancel, dismiss, dismissed };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useEscalation() {
  const c = useContext(Context);
  if (!c) throw new Error("useEscalation must be used inside EscalationProvider");
  return c;
}
