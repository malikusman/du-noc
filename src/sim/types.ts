export type AgentId =
  | "sentinel"
  | "correlator"
  | "diagnostician"
  | "planner"
  | "operator"
  | "verifier"
  | "liaison"
  | "guardian"
  | "scribe";

export type Domain = "RAN" | "Transport" | "Core" | "Enterprise" | "Power" | "Security" | "International";

export type StepKind = "observe" | "correlate" | "hypothesize" | "tool" | "plan" | "act" | "verify" | "learn";

export type Tone = "good" | "bad" | "warn" | "neutral";

export interface Chip {
  label: string;
  value: string;
  tone?: Tone;
}

export interface Hypothesis {
  id: string;
  label: string;
  p: number;
}

export interface ToolCall {
  system: string;
  call: string;
  result: string[];
}

export interface PlanOption {
  id: string;
  title: string;
  summary: string;
  recommended?: boolean;
  metrics: Chip[];
}

export interface StepAction {
  command: string;
  system: string;
  reversible: boolean;
  /** Why a human must approve, shown at Guardrails level. */
  approvalReason?: string;
  cost?: string;
  result: string;
}

export interface EvidenceSeries {
  name: string;
  values: (number | null)[];
  tone: "brand" | "muted" | "good" | "bad" | "warn" | "info";
  dashed?: boolean;
}

export interface Evidence {
  title: string;
  caption: string;
  unit: string;
  labels: string[];
  series: EvidenceSeries[];
  threshold?: { value: number; label: string };
  marker?: { index: number; label: string };
  kind?: "line" | "bar";
  domain?: [number, number];
}

export interface Step {
  id: string;
  /** Minute of the day (00:00 = 0). */
  t: number;
  agent: AgentId;
  kind: StepKind;
  title: string;
  body?: string;
  chips?: Chip[];
  hypotheses?: Hypothesis[];
  tools?: ToolCall[];
  options?: PlanOption[];
  action?: StepAction;
  evidence?: Evidence;
  /** One line for the agent feed. */
  feed?: string;
  /** Knowledge entries cited by this step. */
  kb?: string[];
}

export type Severity = "P1" | "P2" | "P3";

export type SiteStatus = "ok" | "down" | "degraded" | "watch" | "waiting" | "fixed";

export interface Phase {
  /** Step that starts this phase. */
  from: string;
  /** Step that ends it. */
  to?: string;
  status: SiteStatus;
  sites: string[];
  /** Subscribers affected while this phase lasts. */
  subscribers: number;
  links?: [string, string][];
}

export interface Incident {
  id: string;
  number: string;
  title: string;
  oneLiner: string;
  domain: Domain;
  /** Where the presenter tells this story. */
  lens: "Correlation" | "Prevention" | "Remediation" | "Revenue" | "Security" | "Sleeping cell";
  severity: Severity;
  siteId: string;
  place: string;
  asset: string;
  vendor?: string;
  trigger: number;
  autoOpen: boolean;
  /** Steps after this minute run in the background and are not replayed live in the room. */
  liveUntil: number;
  /** Step that closes the incident. */
  closesOn: string;
  rawAlarms: number;
  steps: Step[];
  phases: Phase[];
  impact: {
    subscribers: number;
    minutesAvoided: number;
    slaCreditsAvoided: number;
    ticketsAvoided: number;
    visitsAvoided: number;
  };
}

export interface RoutineEvent {
  id: string;
  t: number;
  durationMin: number;
  siteId: string;
  domain: Domain;
  agent: AgentId;
  kind: string;
  detected: string;
  action: string;
  proof: string;
  system: string;
  alarms: number;
  visitAvoided: boolean;
}

export interface Approval {
  at: number;
  auto: boolean;
  decision?: "approved" | "rejected";
  /** How the person decided: on the NOC screen, a phone or WhatsApp call, or a WhatsApp message. */
  via?: string;
}

export type Approvals = Record<string, Approval>;

export type AutonomyLevel = 0 | 1 | 2 | 3;

export type Levels = Record<Domain, AutonomyLevel>;
