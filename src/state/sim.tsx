import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { INCIDENTS, INCIDENT_BY_ID, incidentForStep } from "@/sim/incidents";
import { allIncidentStates, availability, downLinks, routineDone, siteStatuses, subscribersAffected, type IncidentState } from "@/sim/progress";
import { rawAlarms, uniqueEvents } from "@/sim/alarms";
import { CHAPTERS } from "@/sim/story";
import { DAY_LENGTH, shiftLead } from "@/sim/time";
import { AUTONOMY, DEFAULT_LEVELS, DOMAINS } from "@/sim/agents";
import type { Approvals, AutonomyLevel, Domain, Levels, SiteStatus } from "@/sim/types";

/** Sim minutes per real second at 1×. The day takes about four minutes plus the incident rooms. */
const BASE_RATE = 6;

export interface Decision {
  t: number;
  kind: "approved" | "rejected" | "autonomy";
  detail: string;
  incident?: string;
  by?: string;
  via?: string;
}

interface State {
  t: number;
  playing: boolean;
  speed: 1 | 2 | 5;
  levels: Levels;
  captions: boolean;
  follow: boolean;
  approvals: Approvals;
  room: string | null;
  roomPaused: boolean;
  roomSkip: number;
  resumeAfterRoom: boolean;
  seen: string[];
  decisions: Decision[];
}

type Action =
  | { type: "tick"; dt: number }
  | { type: "play"; value?: boolean }
  | { type: "speed"; value: State["speed"] }
  | { type: "seek"; t: number }
  | { type: "levels"; value: Partial<Levels>; states: IncidentState[]; detail: string }
  | { type: "captions"; value?: boolean }
  | { type: "decide"; stepId: string; decision: "approved" | "rejected"; via?: string }
  | { type: "open"; id: string }
  | { type: "close" }
  | { type: "roomPause"; value?: boolean }
  | { type: "roomAdvance"; t: number }
  | { type: "roomSkip" }
  | { type: "reset" }
  | { type: "follow"; value: boolean };

const initial: State = {
  t: 0,
  playing: false,
  speed: 1,
  levels: DEFAULT_LEVELS,
  captions: true,
  follow: true,
  approvals: {},
  room: null,
  roomPaused: false,
  roomSkip: 0,
  resumeAfterRoom: false,
  seen: [],
  decisions: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "tick": {
      if (!state.playing || state.room) return state;
      const next = Math.min(DAY_LENGTH, state.t + action.dt * BASE_RATE * state.speed);
      if (state.follow) {
        const due = INCIDENTS.find((i) => i.autoOpen && !state.seen.includes(i.id) && i.trigger > state.t - 0.001 && i.trigger <= next);
        if (due) return { ...state, t: due.trigger, room: due.id, roomPaused: false, resumeAfterRoom: true, seen: [...state.seen, due.id] };
      }
      return { ...state, t: next, playing: next < DAY_LENGTH };
    }
    case "play":
      if (state.t >= DAY_LENGTH && action.value !== false) return { ...state, t: 0, approvals: {}, seen: [], decisions: [], playing: true };
      return { ...state, playing: action.value ?? !state.playing };
    case "speed":
      return { ...state, speed: action.value };
    case "seek": {
      const t = Math.max(0, Math.min(DAY_LENGTH, action.t));
      const approvals = Object.fromEntries(Object.entries(state.approvals).filter(([, a]) => a.at <= t));
      const seen = state.seen.filter((id) => INCIDENT_BY_ID[id].trigger < t);
      return { ...state, t, approvals, seen, room: null, decisions: state.decisions.filter((d) => d.t <= t) };
    }
    case "levels": {
      // Actions already executed under the old level stay executed.
      const approvals = { ...state.approvals };
      for (const incident of action.states) {
        for (const step of incident.steps) {
          if (step.status === "done" && step.step.action && !approvals[step.step.id]) approvals[step.step.id] = { at: step.at, auto: true };
        }
      }
      return {
        ...state,
        levels: { ...state.levels, ...action.value },
        approvals,
        decisions: [...state.decisions, { t: state.t, kind: "autonomy", detail: action.detail }],
      };
    }
    case "captions":
      return { ...state, captions: action.value ?? !state.captions };
    case "decide": {
      if (state.approvals[action.stepId] && !state.approvals[action.stepId].auto) return state;
      const incident = incidentForStep(action.stepId);
      const step = incident?.steps.find((s) => s.id === action.stepId);
      return {
        ...state,
        approvals: { ...state.approvals, [action.stepId]: { at: state.t, auto: false, decision: action.decision, via: action.via } },
        roomPaused: false,
        decisions: [...state.decisions, { t: state.t, kind: action.decision, detail: step?.title ?? action.stepId, incident: incident?.number, by: shiftLead(state.t).name, via: action.via }],
      };
    }
    case "open":
      return { ...state, room: action.id, roomPaused: false, resumeAfterRoom: state.playing, playing: false, seen: state.seen.includes(action.id) ? state.seen : [...state.seen, action.id] };
    case "close":
      return { ...state, room: null, playing: state.resumeAfterRoom && state.t < DAY_LENGTH, resumeAfterRoom: false };
    case "roomPause":
      return { ...state, roomPaused: action.value ?? !state.roomPaused };
    case "roomAdvance":
      return { ...state, t: Math.max(state.t, action.t) };
    case "roomSkip":
      return { ...state, roomSkip: state.roomSkip + 1 };
    case "reset":
      return { ...initial, levels: state.levels, captions: state.captions, follow: state.follow };
    case "follow":
      return state.follow === action.value ? state : { ...state, follow: action.value };
  }
}

export interface Kpi {
  availability: number;
  affected: number;
  handled: number;
  waiting: number;
  raw: number;
  unique: number;
  incidents: number;
  tickets: number;
}

interface SimContext {
  state: State;
  incidents: IncidentState[];
  sites: Record<string, SiteStatus>;
  links: [string, string][];
  kpi: Kpi;
  play: (value?: boolean) => void;
  seek: (t: number) => void;
  setSpeed: (value: State["speed"]) => void;
  setAllLevels: (value: AutonomyLevel) => void;
  setLevel: (domain: Domain, value: AutonomyLevel) => void;
  toggleCaptions: (value?: boolean) => void;
  approve: (stepId: string, via?: string) => void;
  reject: (stepId: string, via?: string) => void;
  openRoom: (id: string) => void;
  closeRoom: () => void;
  pauseRoom: (value?: boolean) => void;
  advanceRoom: (t: number) => void;
  skipRoom: () => void;
  nextChapter: () => void;
  reset: () => void;
  setFollow: (value: boolean) => void;
}

const Context = createContext<SimContext | null>(null);
const STORE = "du-noc-state";

function restore(): State {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null");
    if (saved && typeof saved.t === "number") {
      return { ...initial, t: saved.t, levels: { ...DEFAULT_LEVELS, ...saved.levels }, approvals: saved.approvals ?? {}, seen: saved.seen ?? [], captions: saved.captions ?? true, speed: saved.speed ?? 1, decisions: saved.decisions ?? [] };
    }
  } catch {
    /* storage unavailable */
  }
  return initial;
}

export function SimProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, restore);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const { t, levels, approvals, seen, captions, speed, decisions } = state;
        sessionStorage.setItem(STORE, JSON.stringify({ t, levels, approvals, seen, captions, speed, decisions }));
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [state]);

  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!state.playing || state.room) {
      last.current = null;
      return;
    }
    let frame = 0;
    const loop = (now: number) => {
      if (last.current !== null) dispatch({ type: "tick", dt: Math.min(0.1, (now - last.current) / 1000) });
      last.current = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.playing, state.room]);

  const incidents = useMemo(() => allIncidentStates(state.t, state.approvals, state.levels), [state.t, state.approvals, state.levels]);
  const sites = useMemo(() => siteStatuses(state.t, incidents), [state.t, incidents]);
  const links = useMemo(() => downLinks(incidents), [incidents]);
  const kpi = useMemo<Kpi>(() => {
    const opened = incidents.filter((i) => i.status !== "upcoming");
    const routine = routineDone(state.t);
    return {
      availability: availability(sites),
      affected: subscribersAffected(incidents),
      handled: routine.length + incidents.filter((i) => i.status === "resolved").length,
      waiting: incidents.filter((i) => i.status === "waiting").length,
      raw: rawAlarms(state.t),
      unique: uniqueEvents(state.t),
      incidents: opened.length,
      tickets: incidents.filter((i) => i.status === "waiting" || i.status === "escalated").length,
    };
  }, [incidents, sites, state.t]);

  const ref = useRef({ incidents, t: state.t });
  ref.current = { incidents, t: state.t };

  const value: SimContext = {
    state,
    incidents,
    sites,
    links,
    kpi,
    play: useCallback((v?: boolean) => dispatch({ type: "play", value: v }), []),
    seek: useCallback((t: number) => dispatch({ type: "seek", t }), []),
    setSpeed: useCallback((v: State["speed"]) => dispatch({ type: "speed", value: v }), []),
    setAllLevels: useCallback((v: AutonomyLevel) => {
      const all = Object.fromEntries(DOMAINS.map((d) => [d, v])) as Levels;
      dispatch({ type: "levels", value: all, states: ref.current.incidents, detail: `All domains set to ${AUTONOMY[v].name}` });
    }, []),
    setLevel: useCallback((domain: Domain, v: AutonomyLevel) => {
      dispatch({ type: "levels", value: { [domain]: v }, states: ref.current.incidents, detail: `${domain} set to ${AUTONOMY[v].name}` });
    }, []),
    toggleCaptions: useCallback((v?: boolean) => dispatch({ type: "captions", value: v }), []),
    approve: useCallback((stepId: string, via?: string) => dispatch({ type: "decide", stepId, decision: "approved", via }), []),
    reject: useCallback((stepId: string, via?: string) => dispatch({ type: "decide", stepId, decision: "rejected", via }), []),
    openRoom: useCallback((id: string) => dispatch({ type: "open", id }), []),
    closeRoom: useCallback(() => dispatch({ type: "close" }), []),
    pauseRoom: useCallback((v?: boolean) => dispatch({ type: "roomPause", value: v }), []),
    advanceRoom: useCallback((t: number) => dispatch({ type: "roomAdvance", t }), []),
    skipRoom: useCallback(() => dispatch({ type: "roomSkip" }), []),
    nextChapter: useCallback(() => {
      const next = CHAPTERS.find((c) => c.t > ref.current.t + 0.5);
      dispatch({ type: "seek", t: next ? next.t : DAY_LENGTH });
    }, []),
    setFollow: useCallback((v: boolean) => dispatch({ type: "follow", value: v }), []),
    reset: useCallback(() => dispatch({ type: "reset" }), []),
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSim() {
  const context = useContext(Context);
  if (!context) throw new Error("useSim must be used inside SimProvider");
  return context;
}
