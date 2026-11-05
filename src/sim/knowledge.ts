export type KbKind = "MOP" | "Policy" | "Change" | "Past incident" | "Vendor bulletin" | "Contract" | "Feed";

export interface KbEntry {
  id: string;
  kind: KbKind;
  title: string;
  summary: string;
  owner: string;
}

export const KB: KbEntry[] = [
  { id: "MOP-TX-014", kind: "MOP", title: "Fibre cut: ring protection and OTDR location", summary: "Confirm loss of light on both directions, rule out planned work and hub power, switch to the protection path, locate with OTDR, dispatch splicing with GPS.", owner: "Transport operations" },
  { id: "MOP-TX-021", kind: "MOP", title: "Microwave fade: pre-emptive reroute", summary: "When RSL margin trends below 6 dB under a fog or dust advisory, move traffic to fibre before the link drops. Revert after 30 min of stable margin.", owner: "Transport operations" },
  { id: "MOP-RAN-031", kind: "MOP", title: "Parameter rollback to golden configuration", summary: "Diff the cluster against the last golden config, roll back only the changed parameters, pause the change, notify its owner, verify CSSR and drops.", owner: "RAN optimisation" },
  { id: "MOP-RAN-044", kind: "MOP", title: "Sleeping cell recovery", summary: "Confirm no lock and no planned work, check RRC attempts and neighbour handovers, then block and unblock the cell. Reset the baseband only if that fails.", owner: "RAN operations" },
  { id: "MOP-PWR-007", kind: "MOP", title: "Grid loss: battery autonomy and load shedding", summary: "Rank sites by autonomy and criticality. Shed capacity carriers to extend battery. Send generators to critical sites first (hospitals, airports, emergency services).", owner: "Power & infrastructure" },
  { id: "MOP-CORE-022", kind: "MOP", title: "Signalling storm: back-off per APN", summary: "Find the source TAC and APN, apply a congestion back-off timer and a per-TAC rate limit. Never block a whole APN without approval.", owner: "Core operations" },
  { id: "MOP-INT-003", kind: "MOP", title: "International transit reroute", summary: "Shift affected prefixes to alternate subsea or terrestrial routes, prefer local caches, and send care an advisory.", owner: "International & IP" },
  { id: "MOP-ENT-009", kind: "MOP", title: "Enterprise latency: PE failover", summary: "Trace the customer's path, move the VPN to the alternate PE, correct QoS marking, and tell the account manager.", owner: "Enterprise operations" },
  { id: "POL-EVT-002", kind: "Policy", title: "Mass-event intent template", summary: "Guaranteed floors for payments, broadcasters and premium 5G+ users at GITEX, NYE, F1 and concerts. Best effort for everyone else, never blocked.", owner: "RAN & slicing" },
  { id: "POL-CRIT-001", kind: "Policy", title: "Critical sites list", summary: "Sites serving hospitals, airports, police and civil defence get generators first and never lose coverage for power saving.", owner: "NOC management" },
  { id: "SLA-ENT-GOLD", kind: "Contract", title: "Enterprise Gold SLA", summary: "Latency under 25 ms one way inside the UAE, 99.99% availability, service credits from the first breached interval.", owner: "du Business" },
  { id: "CHG-26-10398", kind: "Change", title: "Al Majaz handover tuning (23 cells)", summary: "Approved parameter push, 09:00: a3Offset 3→1 dB, timeToTrigger 320→80 ms, hysteresis 2→1 dB.", owner: "RAN optimisation" },
  { id: "CHG-26-10412", kind: "Change", title: "Dubai core SMF pool software upgrade", summary: "Approved maintenance window 08:00–09:30. One SMF member at a time, the pool stays at 3 of 4.", owner: "Core engineering" },
  { id: "PIR-26-031", kind: "Past incident", title: "Jebel Ali excavation cut (March)", summary: "Contractor cut the same duct. 5 h 40 min to restore. Root cause found manually after 52 minutes.", owner: "Transport operations" },
  { id: "PIR-25-118", kind: "Past incident", title: "Water-meter re-attach storm", summary: "A firmware bug made IoT modules retry every few seconds. First treated as a DDoS for 25 minutes.", owner: "Core operations" },
  { id: "PIR-26-058", kind: "Past incident", title: "Deira tuning push (June)", summary: "A handover change hurt call setup for 4 hours. Found through customer complaints, rolled back by hand." , owner: "RAN optimisation" },
  { id: "PIR-26-044", kind: "Past incident", title: "Sleeping indoor cell (May)", summary: "An indoor cell slept for 11 hours with no alarm. Found from complaints the next morning; a field visit reset it.", owner: "RAN operations" },
  { id: "VB-IDR-2609", kind: "Vendor bulletin", title: "Indoor baseband: cell sleeps after long uptime", summary: "Rare state where a cell stays unlocked and raises no alarm but answers no RRC requests. Block/unblock clears it. Fix in the next patch.", owner: "Vendor TAC" },
  { id: "FEED-NCM", kind: "Feed", title: "NCM weather and fog advisories", summary: "National Centre of Meteorology alerts for fog, dust and heat, by area.", owner: "External feed" },
  { id: "FEED-UTIL", kind: "Feed", title: "Utility outage feed", summary: "Feeder trips and estimated restore times from the electricity utilities.", owner: "External feed" },
  { id: "FEED-PERMIT", kind: "Feed", title: "Excavation permits", summary: "Road-works and excavation permits near du ducts, matched to routes.", owner: "External feed" },
];

export const KB_BY_ID: Record<string, KbEntry> = Object.fromEntries(KB.map((k) => [k.id, k]));
