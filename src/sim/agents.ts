import type { AgentId, AutonomyLevel, Domain, Levels, StepAction } from "./types";

export interface AgentSpec {
  id: AgentId;
  name: string;
  role: string;
  watches: string;
  tools: string[];
  never: string;
  glyph: string;
  /** Restricted agents only read and recommend. Unrestricted agents can change the network inside policy. */
  restricted: boolean;
}

export const AGENTS: Record<AgentId, AgentSpec> = {
  sentinel: {
    id: "sentinel",
    name: "Sentinel",
    role: "Watches every KPI",
    watches: "Cell, transport, core and power KPIs for 2,512 sites, compared with each cell's neighbours, last week, the weather and the event calendar. It looks for problems that raise no alarm.",
    tools: ["PM counters (15-min / 1-min)", "NCM weather", "Event calendar", "Baselines"],
    never: "Never acts. It raises an incident and hands over the evidence.",
    glyph: "Se",
    restricted: true,
  },
  correlator: {
    id: "correlator",
    name: "Correlator",
    role: "Turns alarm storms into one incident",
    watches: "Every alarm from every EMS, deduplicated and grouped by topology, time and cause, so one fault opens one ticket.",
    tools: ["Fault management (all EMS)", "Topology inventory", "Change calendar"],
    never: "Never closes an alarm it can't explain.",
    glyph: "Co",
    restricted: true,
  },
  diagnostician: {
    id: "diagnostician",
    name: "Diagnostician",
    role: "Finds the root cause",
    watches: "Keeps several explanations open and runs tests across domains to rule them out, one at a time.",
    tools: ["Huawei iMaster MAE", "Ericsson ENM", "Nokia NetAct", "WaveSuite OTDR", "Core counters", "UE traces"],
    never: "Never guesses silently. Every conclusion shows its evidence and its confidence.",
    glyph: "Di",
    restricted: true,
  },
  planner: {
    id: "planner",
    name: "Planner",
    role: "Weighs the options",
    watches: "Compares doing nothing, a remote fix and a field visit on subscribers, SLAs, risk and cost. Then it checks the plan against the guardrails for that domain.",
    tools: ["MOP library", "Guardrail policy", "SLA contracts", "Field-team roster"],
    never: "Never exceeds the autonomy level set for the domain.",
    glyph: "Pl",
    restricted: true,
  },
  operator: {
    id: "operator",
    name: "Operator",
    role: "Carries out the change",
    watches: "Runs the chosen MOP through the vendor EMS, the SMO or the IP controller, and records every command it sends.",
    tools: ["EMS / SMO APIs", "IP/MPLS controller", "Core policy", "Field service (WFM)", "ITSM"],
    never: "Never runs an irreversible or costly step without approval unless policy allows it.",
    glyph: "Op",
    restricted: false,
  },
  verifier: {
    id: "verifier",
    name: "Verifier",
    role: "Proves the fix worked",
    watches: "Closes an incident only when the KPIs prove it: traffic back, success rates back, alarms clear. If the fix did not hold, it rolls back or escalates.",
    tools: ["PM counters", "Drive-test probes", "Service probes"],
    never: "Never closes on 'command accepted'. Only the KPIs close an incident.",
    glyph: "Ve",
    restricted: true,
  },
  liaison: {
    id: "liaison",
    name: "Liaison",
    role: "Keeps people informed",
    watches: "Tells enterprise customers, account managers, care teams and change owners what is happening before they have to ask.",
    tools: ["du Business portal", "Care advisories", "Account-manager alerts", "Change owners"],
    never: "Never contacts a customer without approval at Guardrails level or below.",
    glyph: "Li",
    restricted: false,
  },
  guardian: {
    id: "guardian",
    name: "Guardian",
    role: "Separates attacks from accidents",
    watches: "Signalling, DNS, routing and access logs. It decides whether a surge is hostile or a bug, and hands security cases to the SOC.",
    tools: ["Signalling firewall", "DDoS scrubbing", "SIEM", "Fraud management"],
    never: "Never blocks a legitimate customer to stop a threat that isn't there.",
    glyph: "Gu",
    restricted: true,
  },
  scribe: {
    id: "scribe",
    name: "Scribe",
    role: "Writes the shift handover",
    watches: "Writes up every incident, decision and open action so the next shift starts informed.",
    tools: ["Incident log", "Decision log", "ITSM"],
    never: "Never leaves an open action out of the handover.",
    glyph: "Sc",
    restricted: true,
  },
};

export const AGENT_ORDER: AgentId[] = ["sentinel", "correlator", "diagnostician", "planner", "operator", "verifier", "liaison", "guardian", "scribe"];

export const DOMAINS: Domain[] = ["RAN", "Transport", "Core", "Enterprise", "Power", "Security", "International"];

export const DOMAIN_COPY: Record<Domain, string> = {
  RAN: "Radio: cells, parameters, slicing",
  Transport: "Fibre, microwave, IP/MPLS",
  Core: "4G/5G core, signalling, IMS",
  Enterprise: "Business VPNs, SD-WAN, SLAs",
  Power: "Grid, batteries, generators",
  Security: "DDoS, signalling, fraud",
  International: "Subsea and IP transit",
};

export const AUTONOMY: { level: AutonomyLevel; name: string; short: string; tmf: string; description: string }[] = [
  { level: 0, name: "Observe", short: "Observe", tmf: "L2", description: "Agents detect, diagnose and plan. Engineers carry out every action." },
  { level: 1, name: "Recommend", short: "Recommend", tmf: "L3", description: "Agents prepare each action. Engineers approve each one with a tap." },
  { level: 2, name: "Act within guardrails", short: "Guardrails", tmf: "L4", description: "Reversible changes run on their own. Field visits, costs and customer contact wait for an engineer." },
  { level: 3, name: "Autonomous", short: "Autonomous", tmf: "L4+", description: "Everything inside policy runs on its own. Engineers are informed, not asked." },
];

export const DEFAULT_LEVELS: Levels = {
  RAN: 2,
  Transport: 2,
  Core: 2,
  Enterprise: 2,
  Power: 2,
  Security: 2,
  International: 2,
};

export function needsApproval(level: AutonomyLevel, action: StepAction): boolean {
  if (level <= 1) return true;
  if (level === 2) return !action.reversible;
  return false;
}

export const GUARDRAILS: { action: string; example: string; reversible: boolean }[] = [
  { action: "Reroute traffic", example: "Ring protection switch, PE failover", reversible: true },
  { action: "Parameter rollback", example: "Restore golden config on a cluster", reversible: true },
  { action: "Cell block / unblock", example: "Recover a sleeping cell", reversible: true },
  { action: "Slice or QoS policy", example: "Event intent on the SMO", reversible: true },
  { action: "Power saving", example: "Switch off capacity carriers on battery", reversible: true },
  { action: "Signalling back-off", example: "Congestion timer on one APN", reversible: true },
  { action: "Field dispatch", example: "Splicing crew, generator, technician", reversible: false },
  { action: "Customer contact", example: "Enterprise customer or their operations team", reversible: false },
  { action: "Software or firmware rollout", example: "Upgrade, patch, vendor rollout", reversible: false },
];
