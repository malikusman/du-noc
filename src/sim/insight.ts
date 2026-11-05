/**
 * Extra story data per incident and for the Intelligence pages.
 * Everything here is simulated, written to fit du's network and the UAE.
 */

export interface AlarmGroup {
  source: string;
  type: string;
  count: number;
}

export interface Check {
  label: string;
  result: string;
  verdict: "rules out" | "points to" | "neutral";
}

export interface ThenNow {
  source: string;
  rows: { label: string; then: string; now: string }[];
}

/** How the raw alarms of each incident break down, for the correlation view. */
export const ALARM_GROUPS: Record<string, AlarmGroup[]> = {
  fibre: [
    { source: "Nokia WaveSuite", type: "Loss of signal (OTU)", count: 2 },
    { source: "Ericsson ENM", type: "S1 link failure", count: 152 },
    { source: "Ericsson ENM", type: "X2 link failure", count: 118 },
    { source: "Ericsson ENM", type: "Cell unavailable", count: 88 },
    { source: "IP controller", type: "BFD session down", count: 52 },
  ],
  power: [
    { source: "Power telemetry", type: "Mains failure", count: 14 },
    { source: "Power telemetry", type: "Battery discharging", count: 14 },
    { source: "Power telemetry", type: "Rectifier alarm", count: 12 },
    { source: "Huawei iMaster MAE", type: "Cabinet high temperature", count: 6 },
  ],
  planned: [
    { source: "Core counters", type: "SMF member out of service", count: 3 },
    { source: "Billing mediation", type: "CDR feed lag", count: 4 },
    { source: "Core counters", type: "Diameter peer flap", count: 5 },
  ],
  storm: [
    { source: "Core counters", type: "AMF overload", count: 34 },
    { source: "Core counters", type: "MME overload", count: 28 },
    { source: "Core counters", type: "Attach reject (congestion)", count: 22 },
    { source: "Signalling firewall", type: "Rate threshold crossed", count: 12 },
  ],
  enterprise: [{ source: "Service probes", type: "SLA latency warning", count: 2 }],
  subsea: [
    { source: "IP transit", type: "BGP path change", count: 5 },
    { source: "Service probes", type: "Latency threshold", count: 3 },
  ],
};

/** The questions the Correlator asks before it calls something an outage. */
export const CHECKS: Record<string, Check[]> = {
  fibre: [
    { label: "Change calendar", result: "No planned work on the span", verdict: "rules out" },
    { label: "Hub power", result: "Mains on, rectifiers normal", verdict: "rules out" },
    { label: "Topology", result: "All 38 sites sit behind one DWDM span", verdict: "points to" },
    { label: "Excavation permits", result: "EXC-DXB-77310 opened at 18:00 on this route", verdict: "points to" },
  ],
  planned: [
    { label: "Change calendar", result: "CHG-26-10412 active, 08:00–09:30", verdict: "points to" },
    { label: "Maintenance window", result: "Inside the approved window", verdict: "points to" },
    { label: "Customer impact", result: "0 sessions dropped, pool at 3 of 4", verdict: "rules out" },
    { label: "Billing", result: "CDRs buffered, none lost", verdict: "rules out" },
  ],
  rollback: [
    { label: "Alarms", result: "None. Only the KPIs moved", verdict: "neutral" },
    { label: "Change calendar", result: "CHG-26-10398 pushed at 09:00", verdict: "points to" },
    { label: "Neighbouring clusters", result: "Normal, without the change", verdict: "points to" },
    { label: "Transport and core", result: "No loss, attach normal", verdict: "rules out" },
  ],
  power: [
    { label: "Utility feed", result: "Two feeder trips, ETA 14:30", verdict: "points to" },
    { label: "Change calendar", result: "No planned power work", verdict: "rules out" },
    { label: "Weather", result: "38 °C, no storm", verdict: "neutral" },
  ],
  storm: [
    { label: "Identities", result: "No spoofed or foreign IMSIs", verdict: "rules out" },
    { label: "Device mix", result: "96% one smart-meter model", verdict: "points to" },
    { label: "Customer changes", result: "Firmware 3.2.1 pushed at 18:30", verdict: "points to" },
    { label: "Change calendar", result: "No core changes today", verdict: "rules out" },
  ],
  sleeping: [
    { label: "Alarms", result: "None. The cell says it is healthy", verdict: "neutral" },
    { label: "Change calendar", result: "No lock, no planned work", verdict: "rules out" },
    { label: "Neighbour handovers", result: "212 attempted, 212 failed", verdict: "points to" },
    { label: "Vendor bulletins", result: "VB-IDR-2609 matches exactly", verdict: "points to" },
  ],
  gitex: [
    { label: "Event calendar", result: "Keynote ends 13:50, halls close 18:00", verdict: "points to" },
    { label: "Core user plane", result: "41%, headroom fine", verdict: "rules out" },
    { label: "Backhaul", result: "52% on 2×100G", verdict: "rules out" },
  ],
  fog: [
    { label: "Weather", result: "NCM fog advisory, 05:31", verdict: "points to" },
    { label: "Inland links on same radios", result: "Normal", verdict: "points to" },
  ],
  enterprise: [
    { label: "Path trace", result: "Congested at DTN-PE2 port 0/3", verdict: "points to" },
    { label: "QoS marking", result: "Bank traffic marked best effort", verdict: "points to" },
  ],
  subsea: [
    { label: "Transit notice", result: "Fault notice for a Red Sea segment", verdict: "points to" },
    { label: "Asia routes", result: "Unaffected", verdict: "points to" },
  ],
};

/** The last time something like this happened, from past incident reviews, against today. */
export const THEN_NOW: Record<string, ThenNow> = {
  fibre: {
    source: "PIR-26-031 · same duct, March 2026",
    rows: [
      { label: "Tickets opened", then: "37", now: "1" },
      { label: "Root cause found", then: "52 min", now: "3 min" },
      { label: "First sites back", then: "1 h 35 min", now: "4 min" },
      { label: "Crew sent to", then: "The hub, then searched", now: "GPS of the break" },
    ],
  },
  rollback: {
    source: "PIR-26-058 · Deira tuning push, June 2026",
    rows: [
      { label: "How it was found", then: "Customer complaints", now: "KPI drift, no alarm" },
      { label: "Time to find", then: "3 h 10 min", now: "40 min after the push" },
      { label: "Time to roll back", then: "4 h 05 min", now: "4 min" },
    ],
  },
  storm: {
    source: "PIR-25-118 · water-meter storm, 2025",
    rows: [
      { label: "First verdict", then: "DDoS (wrong)", now: "Device bug (right)" },
      { label: "Time to verdict", then: "25 min", now: "3 min" },
      { label: "Customers blocked", then: "Whole IoT APN for 40 min", now: "Nobody" },
    ],
  },
  sleeping: {
    source: "PIR-26-044 · indoor cell, Mall of the Emirates, May 2026",
    rows: [
      { label: "How it was found", then: "Next-day complaints", now: "Traffic gap vs neighbours" },
      { label: "Time asleep", then: "11 h", now: "52 min" },
      { label: "Field visit", then: "Yes", now: "No" },
    ],
  },
  gitex: {
    source: "Post-event review · GITEX 2025",
    rows: [
      { label: "Peak radio load", then: "99%", now: "92%" },
      { label: "Card payments failing", then: "6% for 20 min", now: "0.2%" },
      { label: "How the NOC knew", then: "Exhibitor complaints", now: "Forecast, 30 min ahead" },
    ],
  },
};

export interface Prediction {
  id: string;
  siteId: string;
  place: string;
  risk: number;
  factor: string;
  window: string;
  action: string;
  confidence: number;
  status: "Scheduled" | "Needs approval" | "Watching";
  learnedFrom?: string;
  /** Minute the prediction appears (some are learned during the day). */
  from: number;
}

export const PREDICTIONS: Prediction[] = [
  { id: "P1", siteId: "ALN-H02", place: "Tawam Hospital macro, Al Ain", risk: 91, factor: "Battery bank at 61% health. Lasted 1 h 40 min at 38 °C today", window: "Next grid trip", action: "Replace battery bank in Sunday's window", confidence: 92, status: "Needs approval", learnedFrom: "power", from: 13 * 60 + 5 },
  { id: "P2", siteId: "JBA-001", place: "4 single-homed sites, Jebel Ali", risk: 88, factor: "Duct cut twice this year. No second path", window: "Next excavation", action: "Dual-home the 4 sites; alert on permits within 50 m", confidence: 89, status: "Needs approval", learnedFrom: "fibre", from: 6 * 60 + 5 },
  { id: "P3", siteId: "DWT-H01", place: "Dubai World Trade Centre", risk: 84, factor: "Friday footfall forecast 88% of Thursday's", window: "Fri 12:30–15:00", action: "GITEX intent pre-scheduled for 12:30", confidence: 87, status: "Scheduled", learnedFrom: "gitex", from: 19 * 60 + 12 },
  { id: "P4", siteId: "DXB-001", place: "31 indoor cells on the sleeping-cell baseband version", risk: 79, factor: "Vendor bulletin VB-IDR-2609; 2 cells slept today", window: "Until patched", action: "Patch in Sunday's maintenance window; 5-min checks until then", confidence: 85, status: "Scheduled", learnedFrom: "sleeping", from: 21 * 60 + 31 },
  { id: "P5", siteId: "CRN-MW1", place: "Corniche microwave hops, Abu Dhabi", risk: 76, factor: "NCM fog outlook for Saturday 05:00–08:00", window: "Sat 05:00", action: "Pre-route onto fibre at 04:45", confidence: 81, status: "Scheduled", learnedFrom: "fog", from: 5 * 60 + 40 },
  { id: "P6", siteId: "MUS-001", place: "Mussafah macro, Abu Dhabi", risk: 71, factor: "VSWR on sector 2 rose from 1.4 to 1.9 in 10 days", window: "~2 weeks", action: "Inspect the feeder on the next planned visit", confidence: 77, status: "Watching", from: 0 },
  { id: "P7", siteId: "RWS-001", place: "Ruwais and E11 western sites", risk: 64, factor: "Dust advisory for Sunday; filters last cleaned 9 weeks ago", window: "Sun", action: "Raise fan profile; bundle filter cleaning with a visit", confidence: 72, status: "Watching", from: 0 },
  { id: "P8", siteId: "MWL-001", place: "Muwaileh, Sharjah", risk: 62, factor: "Backhaul at 87% every evening, growing 2% a month", window: "~6 weeks", action: "Capacity upgrade request to transport planning", confidence: 80, status: "Watching", from: 0 },
];

export const OUTLOOK = [
  { day: "Fri", items: ["GITEX final day at DWTC", "Friday prayers: traffic shifts to mosques 12:00–13:30"] },
  { day: "Sat", items: ["Fog outlook on the Abu Dhabi coast, 05:00–08:00"] },
  { day: "Sun", items: ["Dust advisory, western region", "Maintenance window 01:00–05:00"] },
  { day: "Mon", items: ["No events"] },
  { day: "Tue", items: ["Concert at Etihad Arena, Yas Island, 20:00"] },
];

export interface EnterpriseCustomer {
  id: string;
  name: string;
  tier: "Gold" | "Silver";
  service: string;
  sla: string;
  incident?: string;
  creditAtRisk: number;
}

export const CUSTOMERS: EnterpriseCustomer[] = [
  { id: "ENT-BNK-0042", name: "A bank in DIFC", tier: "Gold", service: "MPLS VPN · 12 branches", sla: "< 25 ms · 99.99%", incident: "enterprise", creditAtRisk: 25000 },
  { id: "ENT-LOG-0187", name: "A logistics firm, Jebel Ali", tier: "Gold", service: "Dedicated internet + SD-WAN", sla: "99.95%", incident: "fibre", creditAtRisk: 11000 },
  { id: "ENT-PORT-0042", name: "A port operator, Jebel Ali", tier: "Gold", service: "Private 5G + fibre", sla: "99.99%", incident: "fibre", creditAtRisk: 7000 },
  { id: "ENT-UTL-0009", name: "A utility (smart meters)", tier: "Silver", service: "IoT APN · 61,000 meters", sla: "98% daily reads", incident: "storm", creditAtRisk: 0 },
  { id: "ENT-HTL-0311", name: "A hotel group", tier: "Silver", service: "SD-WAN · 9 hotels", sla: "99.9%", creditAtRisk: 0 },
  { id: "ENT-GOV-0120", name: "A government entity", tier: "Gold", service: "Sovereign cloud link", sla: "99.99%", creditAtRisk: 0 },
  { id: "ENT-EVT-0007", name: "GITEX exhibitors and broadcasters", tier: "Gold", service: "Event slice · DWTC", sla: "Floors per POL-EVT-002", incident: "gitex", creditAtRisk: 42000 },
];

/** Fictional NOC team for the story. */
export const TEAM = [
  { name: "Mariam", role: "Shift lead", shift: "Night", channel: "Mobile + NOC wall" },
  { name: "Omar", role: "Transport engineer", shift: "Night", channel: "Mobile" },
  { name: "Khalid", role: "Shift lead", shift: "Day", channel: "Mobile + NOC wall" },
  { name: "Aisha", role: "RAN engineer", shift: "Day", channel: "Teams" },
  { name: "Faisal", role: "Core engineer", shift: "Day", channel: "Teams + mobile" },
  { name: "Layla", role: "SOC analyst", shift: "Day", channel: "SIEM + Teams" },
  { name: "Rahul", role: "Enterprise operations", shift: "Day", channel: "Email + Teams" },
];

export const INTEGRATIONS = [
  { name: "Huawei iMaster MAE", kind: "RAN EMS", scope: "Read + act" },
  { name: "Ericsson ENM", kind: "RAN EMS", scope: "Read + act" },
  { name: "Nokia NetAct", kind: "RAN EMS", scope: "Read + act" },
  { name: "Nokia MantaRay SMO", kind: "SMO / slicing", scope: "Read + act" },
  { name: "Nokia WaveSuite", kind: "Optical", scope: "Read" },
  { name: "IP/MPLS controller", kind: "Transport", scope: "Read + act" },
  { name: "4G/5G core counters and policy", kind: "Core", scope: "Read + act" },
  { name: "Power telemetry", kind: "Infrastructure", scope: "Read + act" },
  { name: "ITSM (tickets and changes)", kind: "Process", scope: "Read + write" },
  { name: "Field service (WFM)", kind: "Process", scope: "Write, with approval" },
  { name: "du Business portal", kind: "Customers", scope: "Write, with approval" },
  { name: "Signalling firewall and SIEM", kind: "Security", scope: "Read + act" },
  { name: "NCM weather", kind: "External feed", scope: "Read" },
  { name: "Utility outage feed", kind: "External feed", scope: "Read" },
  { name: "Excavation permits", kind: "External feed", scope: "Read" },
];
