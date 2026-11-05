import { needsApproval } from "./agents";
import { INCIDENTS } from "./incidents";
import { ROUTINE } from "./routine";
import { SITE_BY_ID, TOTAL_CELLS } from "./sites";
import type { Approval, Approvals, Incident, Levels, Phase, SiteStatus, Step } from "./types";

export type StepStatus = "done" | "waiting" | "pending" | "rejected";

export interface StepState {
  step: Step;
  status: StepStatus;
  at: number;
  needsApproval: boolean;
  approval?: Approval;
  /** Irreversible action cleared by policy at Autonomous level. */
  policyApproved: boolean;
}

export type IncidentStatus = "upcoming" | "investigating" | "waiting" | "monitoring" | "resolved" | "escalated";

export interface IncidentState {
  incident: Incident;
  steps: StepState[];
  status: IncidentStatus;
  lastDone?: StepState;
  next?: StepState;
  doneCount: number;
  lastActivity: number;
  closedAt?: number;
  /** Delay added by waiting for a person. */
  shift: number;
  activePhases: Phase[];
}

export function incidentState(incident: Incident, now: number, approvals: Approvals, levels: Levels): IncidentState {
  const level = levels[incident.domain];
  let shift = 0;
  let blocked = false;
  const steps: StepState[] = incident.steps.map((step) => {
    const effective = step.t + shift;
    const approval = approvals[step.id];
    const required = step.action ? needsApproval(level, step.action) : false;
    const policyApproved = Boolean(step.action && !step.action.reversible && !required && !approval);
    const human = Boolean(approval && !approval.auto && approval.decision !== "rejected");
    if (blocked || effective > now) {
      return { step, status: "pending", at: effective, needsApproval: required && !approval, policyApproved: false };
    }
    if (approval?.decision === "rejected") {
      blocked = true;
      return { step, status: "rejected", at: Math.max(effective, approval.at), needsApproval: false, approval, policyApproved: false };
    }
    if (step.action && required && !approval) {
      blocked = true;
      return { step, status: "waiting", at: effective, needsApproval: true, policyApproved: false };
    }
    const doneAt = human ? Math.max(effective, approval!.at) : effective;
    if (human) shift = Math.max(shift, doneAt - step.t);
    return { step, status: "done", at: doneAt, needsApproval: false, approval, policyApproved };
  });

  const done = steps.filter((s) => s.status === "done");
  const waiting = steps.find((s) => s.status === "waiting");
  const rejected = steps.find((s) => s.status === "rejected");
  const lastDone = done[done.length - 1];
  const next = rejected ? undefined : steps.find((s) => s.status !== "done");
  const closing = done.find((s) => s.step.id === incident.closesOn);
  let status: IncidentStatus = "upcoming";
  if (done.length > 0) {
    if (rejected) status = "escalated";
    else if (waiting) status = "waiting";
    else if (closing) status = "resolved";
    else if (next && next.at <= incident.liveUntil + shift) status = "investigating";
    else status = "monitoring";
  }

  const stepAt = (id: string) => steps.find((s) => s.step.id === id);
  const activePhases = incident.phases.filter((phase) => {
    const from = stepAt(phase.from);
    if (!from || from.status !== "done" || from.at > now) return false;
    const to = phase.to ? stepAt(phase.to) : undefined;
    if (to && to.status === "done" && to.at <= now) return false;
    if (phase.status === "fixed" && now - from.at > 40) return false;
    return true;
  });

  return {
    incident,
    steps,
    status,
    lastDone,
    next,
    doneCount: done.length,
    lastActivity: rejected ? rejected.at : lastDone ? lastDone.at : incident.trigger,
    closedAt: closing?.at,
    shift,
    activePhases,
  };
}

export function allIncidentStates(now: number, approvals: Approvals, levels: Levels) {
  return INCIDENTS.map((incident) => incidentState(incident, now, approvals, levels));
}

const RANK: Record<SiteStatus, number> = { ok: 0, fixed: 1, watch: 2, degraded: 3, waiting: 4, down: 5 };

export function siteStatuses(now: number, incidents: IncidentState[]): Record<string, SiteStatus> {
  const map: Record<string, SiteStatus> = {};
  const raise = (id: string, status: SiteStatus) => {
    if (!map[id] || RANK[status] > RANK[map[id]]) map[id] = status;
  };
  for (const event of ROUTINE) {
    if (now >= event.t && now < event.t + event.durationMin) raise(event.siteId, "degraded");
    else if (now >= event.t + event.durationMin && now < event.t + event.durationMin + 20) raise(event.siteId, "fixed");
  }
  for (const state of incidents) {
    for (const phase of state.activePhases) for (const id of phase.sites) raise(id, phase.status);
    if (state.status === "waiting") raise(state.incident.siteId, "waiting");
  }
  return map;
}

export function downLinks(incidents: IncidentState[]): [string, string][] {
  return incidents.flatMap((s) => s.activePhases.flatMap((p) => p.links ?? []));
}

export function routineDone(now: number) {
  return ROUTINE.filter((event) => event.t + event.durationMin <= now);
}

/** Cell availability right now, from sites that are down or degraded. */
export function availability(statuses: Record<string, SiteStatus>) {
  let lost = 0;
  for (const [id, status] of Object.entries(statuses)) {
    const cells = SITE_BY_ID[id]?.cells ?? 0;
    if (status === "down") lost += cells;
    else if (status === "degraded") lost += cells * 0.12;
  }
  return Math.min(0.99985, 1 - lost / TOTAL_CELLS) - 0.00011;
}

export function subscribersAffected(incidents: IncidentState[]) {
  return incidents.reduce((n, s) => n + s.activePhases.reduce((m, p) => m + p.subscribers, 0), 0);
}

/** Minutes from the first signal to the last diagnosis step. */
export function rootCauseMinutes(s: IncidentState) {
  const hyps = s.steps.filter((x) => x.status === "done" && (x.step.hypotheses || x.step.kind === "tool"));
  const last = hyps[hyps.length - 1];
  return last ? Math.max(1, Math.round(last.at - s.incident.trigger)) : undefined;
}
