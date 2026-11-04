import { SITES } from "./sites";
import { at } from "./time";
import type { AgentId, Domain, RoutineEvent } from "./types";

interface Template {
  kind: string;
  domain: Domain;
  agent: AgentId;
  detected: string;
  action: string;
  proof: string;
  system: (vendor: string) => string;
  alarms: number;
  durationMin: number;
  visitAvoided: boolean;
  weight: number;
}

const ems = (v: string) => (v === "Huawei" ? "Huawei iMaster MAE" : v === "Ericsson" ? "Ericsson ENM" : "Nokia NetAct");

const TEMPLATES: Template[] = [
  { kind: "VSWR alarm", domain: "RAN", agent: "operator", detected: "VSWR alarm on one sector after rain-free night: sensor glitch pattern", action: "Re-read the RF module and cleared the stale alarm", proof: "VSWR 1.2 on three reads, traffic normal", system: ems, alarms: 4, durationMin: 6, visitAvoided: true, weight: 3 },
  { kind: "Cell outage", domain: "RAN", agent: "operator", detected: "One cell dropped after a baseband restart", action: "Unlocked the cell and re-synced it with its neighbours", proof: "Cell carrying traffic, 0 failed handovers", system: ems, alarms: 7, durationMin: 5, visitAvoided: true, weight: 3 },
  { kind: "S1 link flap", domain: "Transport", agent: "operator", detected: "S1 link flapped 6 times in 10 minutes", action: "Moved the site to the secondary path and opened a quiet ticket for the port", proof: "No flaps for 20 minutes, KPIs normal", system: () => "IP controller", alarms: 12, durationMin: 8, visitAvoided: true, weight: 2 },
  { kind: "Door alarm", domain: "Power", agent: "correlator", detected: "Cabinet door alarm at night", action: "Matched it to a scheduled maintenance access and closed it", proof: "Access log and work order match", system: () => "Site access", alarms: 1, durationMin: 2, visitAvoided: true, weight: 2 },
  { kind: "Rectifier module", domain: "Power", agent: "operator", detected: "One rectifier module tripped, two healthy", action: "Reset the module remotely and logged it for the next visit", proof: "Output current balanced across modules", system: () => "Power telemetry", alarms: 3, durationMin: 6, visitAvoided: true, weight: 2 },
  { kind: "Licence alarm", domain: "RAN", agent: "operator", detected: "Capacity licence near its limit on a busy site", action: "Moved spare licences from a quiet site in the same pool", proof: "Licence use 71%, alarm cleared", system: ems, alarms: 2, durationMin: 4, visitAvoided: false, weight: 1 },
  { kind: "Clock sync", domain: "Transport", agent: "operator", detected: "PTP clock drift on a small cell", action: "Re-locked it to the backup grandmaster", proof: "Offset under 100 ns", system: () => "Timing", alarms: 3, durationMin: 5, visitAvoided: true, weight: 1 },
  { kind: "Duplicate alarms", domain: "RAN", agent: "correlator", detected: "Burst of duplicate alarms after an EMS reconnect", action: "Deduplicated and closed them against the original events", proof: "No new faults behind them", system: () => "Fault management", alarms: 38, durationMin: 2, visitAvoided: false, weight: 2 },
  { kind: "High temperature", domain: "Power", agent: "operator", detected: "Cabinet at 52 °C, one fan running slow", action: "Raised fan speed and lowered the power amplifier by 1 dB", proof: "Cabinet at 44 °C in 10 minutes", system: ems, alarms: 2, durationMin: 10, visitAvoided: true, weight: 2 },
  { kind: "Neighbour missing", domain: "RAN", agent: "operator", detected: "Handover failures to a new cell with no neighbour relation", action: "Added the missing neighbour relation", proof: "Handover success 99.4%", system: ems, alarms: 0, durationMin: 5, visitAvoided: false, weight: 1 },
  { kind: "Sector imbalance", domain: "RAN", agent: "operator", detected: "One sector carrying 3× its neighbours at a mall", action: "Adjusted load-balancing offsets on the busy sector", proof: "Load spread within 15%", system: ems, alarms: 0, durationMin: 8, visitAvoided: false, weight: 1 },
];

const SECURITY: Omit<RoutineEvent, "id" | "siteId">[] = [
  { t: at("03:41"), durationMin: 3, domain: "Security", agent: "guardian", kind: "DNS amplification", detected: "14 Gbps of DNS amplification aimed at a customer range", action: "Scrubbed it at the edge and kept the customer online", proof: "Clean traffic at normal levels after 52 s", system: "DDoS scrubbing", alarms: 6, visitAvoided: false },
  { t: at("10:16"), durationMin: 2, domain: "Security", agent: "guardian", kind: "Brute force", detected: "Repeated login attempts on a router management interface", action: "Blocked the source and confirmed MFA on the account", proof: "No successful logins, SOC case opened", system: "SIEM", alarms: 3, visitAvoided: false },
  { t: at("15:22"), durationMin: 12, domain: "Security", agent: "guardian", kind: "SIM-box suspicion", detected: "12 prepaid SIMs in one cell ending international calls in bulk", action: "Sent the SIMs to the fraud team with call patterns", proof: "Fraud team confirmed and barred them at 15:34", system: "Fraud management", alarms: 0, visitAvoided: false },
  { t: at("20:05"), durationMin: 3, domain: "Security", agent: "guardian", kind: "Route leak", detected: "A peer briefly announced a more specific du prefix", action: "Filtered the announcement and alerted the peer", proof: "Routes back to normal, no traffic diverted", system: "IP routing", alarms: 2, visitAvoided: false },
];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(): RoutineEvent[] {
  const rand = rng(1015);
  const pool = TEMPLATES.flatMap((t) => Array(t.weight).fill(t) as Template[]);
  const events: RoutineEvent[] = [];
  const count = 64;
  for (let i = 0; i < count; i++) {
    const t = Math.round((i + 0.2 + rand() * 0.6) * (1440 / count));
    const template = pool[Math.floor(rand() * pool.length)];
    const site = SITES[Math.floor(rand() * SITES.length)];
    events.push({
      id: `R-${String(i + 1).padStart(3, "0")}`,
      t,
      durationMin: template.durationMin,
      siteId: site.id,
      domain: template.domain,
      agent: template.agent,
      kind: template.kind,
      detected: template.detected,
      action: template.action,
      proof: template.proof,
      system: template.system(site.vendor),
      alarms: template.alarms,
      visitAvoided: template.visitAvoided,
    });
  }
  SECURITY.forEach((s, i) => {
    const site = SITES[Math.floor(rand() * SITES.length)];
    events.push({ ...s, id: `S-${String(i + 1).padStart(3, "0")}`, siteId: site.id });
  });
  return events.sort((a, b) => a.t - b.t);
}

export const ROUTINE: RoutineEvent[] = build();
