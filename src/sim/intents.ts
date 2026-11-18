import type { IncidentState } from "./progress";
import type { Domain } from "./types";

/**
 * Business intents: outcomes the business asks the network to hold, in plain words.
 * The agents translate each one into a metric, a target and a scope, watch it, and act when it drifts.
 * (Intent-based operations as in the TM Forum Intent Management API, TMF921. Customer-facing ones can be
 * exposed through the CAMARA Quality on Demand API.)
 */

export type IntentStatus = "met" | "at-risk" | "breached" | "watching";

export interface IntentView {
  id: string;
  title: string;
  scope: string;
  domain: Domain;
  target: string;
  current: string;
  status: IntentStatus;
  /** Incident that moved it today, if any. */
  incident?: string;
  exposed?: string;
  custom?: boolean;
}

interface Ctx {
  t: number;
  availability: number;
  incidents: Record<string, IncidentState>;
}

const done = (s: IncidentState | undefined, id: string) => Boolean(s?.steps.some((x) => x.step.id === id && x.status === "done"));
const rejected = (s: IncidentState | undefined, id: string) => Boolean(s?.steps.some((x) => x.step.id === id && x.status === "rejected"));
const waiting = (s: IncidentState | undefined, id: string) => Boolean(s?.steps.some((x) => x.step.id === id && x.status === "waiting"));

type Rule = Omit<IntentView, "current" | "status"> & { evaluate: (c: Ctx) => { current: string; status: IntentStatus } };

export const INTENTS: Rule[] = [
  {
    id: "i-availability",
    title: "Network cell availability at least 99.95%",
    scope: "All 2,512 sites",
    domain: "RAN",
    target: "≥ 99.95%",
    evaluate: ({ availability }) => ({
      current: `${(availability * 100).toFixed(2)}%`,
      status: availability >= 0.9995 ? "met" : availability >= 0.998 ? "at-risk" : "breached",
    }),
  },
  {
    id: "i-critical",
    title: "Critical sites never go off air",
    scope: "Hospitals, airports, police, civil defence",
    domain: "Power",
    target: "0 sites down",
    incident: "power",
    evaluate: ({ t, incidents }) => {
      const s = incidents.power;
      if (!done(s, "w-observe")) return { current: "0 down", status: "met" };
      if (done(s, "w-verify")) return { current: "0 down, generators on site", status: "met" };
      if ((waiting(s, "w-dispatch") || rejected(s, "w-dispatch")) && t >= 13 * 60 + 10) return { current: "Tawam Hospital site off air", status: "breached" };
      return { current: "Tawam site on battery", status: "at-risk" };
    },
  },
  {
    id: "i-gitex-pay",
    title: "Card payments at GITEX succeed at least 99.5% of the time",
    scope: "Dubai World Trade Centre, event slice",
    domain: "RAN",
    target: "≥ 99.5%",
    incident: "gitex",
    exposed: "Event slice intent",
    evaluate: ({ incidents }) => {
      const s = incidents.gitex;
      if (!done(s, "x-observe")) return { current: "99.9%", status: "met" };
      if (!done(s, "x-slice")) return { current: "99.6% and falling", status: "at-risk" };
      return { current: done(s, "x-verify") ? "99.8% at peak" : "99.9%", status: "met" };
    },
  },
  {
    id: "i-5gplus",
    title: "5G+ customers get at least 100 Mbps at events",
    scope: "Premium 5G+ subscribers",
    domain: "RAN",
    target: "≥ 100 Mbps median",
    incident: "gitex",
    exposed: "CAMARA Quality on Demand",
    evaluate: ({ incidents }) => {
      const s = incidents.gitex;
      if (!done(s, "x-observe")) return { current: "212 Mbps", status: "met" };
      if (!done(s, "x-slice")) return { current: "141 Mbps and falling", status: "at-risk" };
      return { current: done(s, "x-verify") ? "186 Mbps at peak" : "190 Mbps", status: "met" };
    },
  },
  {
    id: "i-bank",
    title: "Gold SLA banks stay under 25 ms",
    scope: "Enterprise VPNs, Gold tier",
    domain: "Enterprise",
    target: "< 25 ms one way",
    incident: "enterprise",
    exposed: "CAMARA Quality on Demand",
    evaluate: ({ incidents }) => {
      const s = incidents.enterprise;
      if (!done(s, "e-observe")) return { current: "8 ms", status: "met" };
      if (!done(s, "e-act")) return { current: "21 ms and rising", status: "at-risk" };
      return { current: "9 ms", status: "met" };
    },
  },
  {
    id: "i-iot",
    title: "Smart meters deliver at least 98% of daily reads",
    scope: "Utility IoT APN, 61,000 meters",
    domain: "Core",
    target: "≥ 98% reads",
    incident: "storm",
    evaluate: ({ incidents }) => {
      const s = incidents.storm;
      if (!done(s, "s-observe")) return { current: "99.4%", status: "met" };
      if (done(s, "s-proof")) return { current: "99.2%", status: "met" };
      if (rejected(s, "s-hold")) return { current: "Retrying under back-off", status: "at-risk" };
      return { current: done(s, "s-throttle") ? "Retrying under back-off" : "Retry storm", status: "at-risk" };
    },
  },
  {
    id: "i-europe",
    title: "Round trip to Europe stays under 125 ms",
    scope: "International transit",
    domain: "International",
    target: "< 125 ms",
    incident: "subsea",
    evaluate: ({ incidents }) => {
      const s = incidents.subsea;
      if (!done(s, "c-observe")) return { current: "112 ms", status: "met" };
      if (!done(s, "c-act")) return { current: "150 ms", status: "breached" };
      return { current: "118 ms on the alternate route", status: "met" };
    },
  },
];

export function evaluateIntents(c: Ctx): IntentView[] {
  return INTENTS.map(({ evaluate, ...rest }) => ({ ...rest, ...evaluate(c) }));
}

/* ── Plain-language intents typed by an executive ── */

export interface ParsedIntent {
  title: string;
  metric: string;
  target: string;
  scope: string;
  domain: Domain;
  guardrail: string;
}

/**
 * Turn a sentence like "Keep enterprise uplink above 50 Mbps" into a watched intent.
 * In the demo this is a deterministic parser; in production the Planner agent does it with a language model.
 */
export function parseIntent(text: string): ParsedIntent | null {
  const t = text.trim();
  if (t.length < 6) return null;
  const lower = t.toLowerCase();
  const num = lower.match(/(\d+(?:\.\d+)?)\s*(ms|mbps|gbps|%|percent|minutes|min|seconds|s)\b/);
  const below = /\b(under|below|less than|at most|no more than|within|<)\b/.test(lower);
  const op = below ? "≤" : "≥";
  const unit = num ? ({ percent: "%", minutes: "min", seconds: "s" } as Record<string, string>)[num[2]] ?? num[2].replace("mbps", "Mbps").replace("gbps", "Gbps") : "";
  const metric =
    /latency|delay|round trip|rtt/.test(lower) ? "One-way latency"
    : /uplink/.test(lower) ? "Uplink throughput"
    : /downlink|speed|throughput|bandwidth/.test(lower) ? "Downlink throughput"
    : /availability|uptime|off air|down/.test(lower) ? "Availability"
    : /payment|success|setup|cssr/.test(lower) ? "Success rate"
    : /restore|repair|mttr|fix/.test(lower) ? "Time to restore"
    : /energy|power saving|kwh/.test(lower) ? "Energy per GB"
    : "Service quality";
  const scope =
    /enterprise|business|bank|sla/.test(lower) ? "Enterprise customers"
    : /gitex|event|stadium|concert|dwtc/.test(lower) ? "Event venues"
    : /hospital|airport|critical|police/.test(lower) ? "Critical sites"
    : /iot|meter|redcap/.test(lower) ? "IoT devices"
    : /5g\+|premium/.test(lower) ? "Premium 5G+ customers"
    : /home|fwa|fixed/.test(lower) ? "Home and FWA customers"
    : /abu dhabi|dubai|sharjah|al ain|ajman|fujairah|ras al khaimah/.test(lower) ? (lower.match(/abu dhabi|dubai|sharjah|al ain|ajman|fujairah|ras al khaimah/)![0].replace(/\b\w/g, (c) => c.toUpperCase()))
    : "Whole network";
  const place = lower.match(/abu dhabi|dubai|sharjah|al ain|ajman|fujairah|ras al khaimah|yas|dwtc|etihad arena/)?.[0];
  const where = place ? place.replace(/\b\w/g, (c) => c.toUpperCase()).replace("Dwtc", "DWTC") : "";
  const domain: Domain =
    scope === "Enterprise customers" ? "Enterprise"
    : scope === "Critical sites" ? "Power"
    : scope === "IoT devices" ? "Core"
    : metric === "One-way latency" && scope === "Whole network" ? "Transport"
    : "RAN";
  const target = num ? `${op} ${num[1]} ${unit}`.replace(" %", "%") : "Hold today's level";
  const title = t.charAt(0).toUpperCase() + t.slice(1).replace(/\.$/, "");
  const guardrail = domain === "Enterprise"
    ? "Reroutes and QoS changes run on their own; contacting the customer needs approval."
    : domain === "Power"
      ? "Load shedding runs on its own; generators and field visits need approval."
      : "Reversible radio and transport changes run on their own; anything costly needs approval.";
  const fullScope = where && !scope.includes(where) ? `${scope} · ${where}` : scope;
  return { title, metric, target, scope: fullScope, domain, guardrail };
}

/* ── Domain health ── */

const PENALTY: Record<string, number> = { P1: 8, P2: 5, P3: 2 };

export function domainHealth(domain: Domain, incidents: IncidentState[], availability: number): number {
  let h = domain === "RAN" ? 100 - (1 - availability) * 900 : 99.4;
  for (const s of incidents) {
    if (s.incident.domain !== domain) continue;
    if (["investigating", "waiting", "escalated"].includes(s.status)) h -= PENALTY[s.incident.severity];
    else if (s.status === "monitoring") h -= 1.5;
  }
  return Math.max(60, Math.min(99.9, h));
}
