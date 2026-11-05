import { at } from "./time";
import { sample, sitesIn, subscribersOf } from "./sites";
import type { Incident } from "./types";

/** Revenue per subscriber per day: du Q3 2026 revenue (AED 4,145m) ÷ 92 days ÷ 10.26m subscribers. */
export const AED_PER_SUB_DAY = 4.4;

export function aedProtected(i: Incident) {
  return Math.round((i.impact.subscribers * i.impact.minutesAvoided * AED_PER_SUB_DAY) / 1440 + i.impact.slaCreditsAvoided);
}

const times = (from: string, step: number, n: number) => Array.from({ length: n }, (_, i) => {
  const m = at(from) + i * step;
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

/* ───────────────────────────── 02:14 Fibre cut, Jebel Ali ───────────────────────────── */

const fibreSites = sitesIn(["Jebel Ali", "Dubai South", "Dubai Investments Park"], 38);
const singleHomed = fibreSites.slice(-4);
const reroutedSites = fibreSites.slice(0, -4);

const fibre: Incident = {
  id: "fibre",
  number: "INC-1015-0003",
  title: "412 alarms, one fibre cut",
  oneLiner: "A contractor cut the Jebel Ali–Dubai South span. 38 sites lost backhaul at 02:14.",
  domain: "Transport",
  lens: "Correlation",
  severity: "P1",
  siteId: fibreSites[0],
  place: "Jebel Ali · Dubai South",
  asset: "DWDM span H-JBA ↔ H-DSH",
  vendor: "Nokia WaveSuite",
  trigger: at("02:14"),
  autoOpen: true,
  liveUntil: at("02:25"),
  closesOn: "f-proof",
  rawAlarms: 412,
  impact: { subscribers: subscribersOf(reroutedSites, 0.35), minutesAvoided: 218, slaCreditsAvoided: 18000, ticketsAvoided: 37, visitsAvoided: 0 },
  phases: [
    { from: "f-storm", to: "f-reroute", status: "down", sites: fibreSites, subscribers: subscribersOf(fibreSites, 0.35), links: [["H-JBA", "H-DSH"]] },
    { from: "f-reroute", to: "f-proof", status: "down", sites: singleHomed, subscribers: subscribersOf(singleHomed, 0.35), links: [["H-JBA", "H-DSH"]] },
    { from: "f-reroute", to: "f-proof", status: "watch", sites: reroutedSites, subscribers: 0 },
    { from: "f-proof", status: "fixed", sites: fibreSites, subscribers: 0 },
  ],
  steps: [
    {
      id: "f-storm", t: at("02:14"), agent: "correlator", kind: "correlate",
      title: "412 alarms in 90 seconds. They share one cause.",
      body: "Loss-of-signal on two DWDM ports at the Jebel Ali hub, then S1 and X2 link failures from 38 sites behind it. Every site alarm follows the optical alarm by under 2 seconds, and every one of them sits downstream of the same span.",
      chips: [
        { label: "Raw alarms", value: "412", tone: "bad" },
        { label: "Duplicates removed", value: "371" },
        { label: "Sites", value: "38", tone: "bad" },
        { label: "Tickets opened", value: "1", tone: "good" },
      ],
      evidence: {
        title: "Alarms arriving, every 10 seconds",
        caption: "The optical alarm comes first. 410 site alarms follow it within 90 seconds.",
        unit: "alarms",
        kind: "bar",
        labels: ["02:14:00", "02:14:10", "02:14:20", "02:14:30", "02:14:40", "02:14:50", "02:15:00", "02:15:10", "02:15:20", "02:15:30"],
        series: [{ name: "Alarms", values: [2, 61, 118, 87, 54, 38, 22, 15, 9, 6], tone: "brand" }],
        marker: { index: 0, label: "Optical LOS" },
      },
      feed: "Correlated 412 alarms from 38 sites into one transport incident",
      kb: ["MOP-TX-014"],
    },
    {
      id: "f-hypo", t: at("02:15"), agent: "diagnostician", kind: "hypothesize",
      title: "Four things fit. A cut on the span fits best.",
      body: "Both directions lost light at the same moment, which points at the fibre. A hub failure or planned work would look similar from the alarms alone, so I'm testing all four.",
      hypotheses: [
        { id: "cut", label: "Fibre cut on the Jebel Ali–Dubai South span", p: 0.71 },
        { id: "router", label: "Aggregation router failure at Jebel Ali", p: 0.18 },
        { id: "power", label: "Power loss at the hub", p: 0.08 },
        { id: "planned", label: "Unannounced planned work", p: 0.03 },
      ],
    },
    {
      id: "f-test", t: at("02:16"), agent: "diagnostician", kind: "tool",
      title: "Ruled out three. Found the cut 3.2 km out.",
      tools: [
        { system: "ITSM", call: "changes.search(span='H-JBA↔H-DSH', window=now)", result: ["No planned work on this span tonight"] },
        { system: "Utility feed", call: "site_power('H-JBA')", result: ["Hub on mains · rectifiers normal · batteries 100%"] },
        { system: "IP controller", call: "router.health('JBA-AGG-01')", result: ["Control plane up · CPU 22% · other line cards passing traffic"] },
        { system: "WaveSuite OTDR", call: "otdr.trace(port='H-JBA/1/3', dir='to H-DSH')", result: ["Break at 3.21 km · loss > 35 dB · reflective event", "Matches excavation permit EXC-DXB-77310 (road works, opened 18:00)"] },
      ],
      kb: ["FEED-PERMIT", "PIR-26-031"],
      feed: "Located the break 3.2 km from Jebel Ali with OTDR",
    },
    {
      id: "f-locate", t: at("02:17"), agent: "diagnostician", kind: "hypothesize",
      title: "It's a cut. Same duct as the March incident.",
      body: "The OTDR break lines up with an excavation permit that opened at 18:00. In March the same duct was cut by a contractor, and it took 52 minutes to find the cause by hand.",
      hypotheses: [
        { id: "cut", label: "Fibre cut on the Jebel Ali–Dubai South span", p: 0.96 },
        { id: "router", label: "Aggregation router failure at Jebel Ali", p: 0.02 },
        { id: "power", label: "Power loss at the hub", p: 0.01 },
        { id: "planned", label: "Unannounced planned work", p: 0.01 },
      ],
      chips: [{ label: "GPS of the break", value: "24.981, 55.121" }, { label: "Nearest manhole", value: "MH-JA-0412" }],
    },
    {
      id: "f-plan", t: at("02:17"), agent: "planner", kind: "plan",
      title: "Bring 34 sites back now. Splice the fibre tonight.",
      options: [
        { id: "wait", title: "Wait for the splice", summary: "All 38 sites stay off air until the crew finishes.", metrics: [{ label: "Sites down", value: "38 for ~4 h", tone: "bad" }, { label: "Risk", value: "None" }] },
        { id: "reroute", title: "Switch to the protection path, then splice", summary: "Route over Al Barsha and Downtown. 34 dual-homed sites return in about 2 minutes. 4 single-homed sites wait for the crew.", recommended: true, metrics: [{ label: "Sites down", value: "4 for ~3 h", tone: "good" }, { label: "Ring load after", value: "61%", tone: "good" }, { label: "Reversible", value: "Yes", tone: "good" }] },
        { id: "mw", title: "Reroute plus temporary microwave", summary: "Also bridge the 4 single-homed sites with a portable link. Needs a second crew and a site survey at night.", metrics: [{ label: "Sites down", value: "4 for ~2 h", tone: "warn" }, { label: "Cost", value: "AED 9,500", tone: "warn" }] },
      ],
      kb: ["MOP-TX-014"],
    },
    {
      id: "f-reroute", t: at("02:18"), agent: "operator", kind: "act",
      title: "Switched 34 sites to the protection path",
      action: { command: "lsp.switch(group='JBA-DSH-RING', to='protect via H-BAR, H-DTN')", system: "IP controller", reversible: true, result: "34 of 38 sites back on air. Protection path at 61% load." },
      feed: "Rerouted 34 Jebel Ali sites over the protection path",
    },
    {
      id: "f-verify", t: at("02:21"), agent: "verifier", kind: "verify",
      title: "34 sites carrying traffic again",
      chips: [
        { label: "S1 links up", value: "34 / 38", tone: "good" },
        { label: "Attach success", value: "99.6%", tone: "good" },
        { label: "Still down", value: "4 single-homed", tone: "warn" },
      ],
      evidence: {
        title: "Sites carrying traffic",
        caption: "34 sites return two minutes after the protection switch.",
        unit: "sites",
        labels: times("02:12", 1, 10),
        series: [{ name: "Sites up", values: [38, 38, 0, 0, 0, 0, 0, 34, 34, 34], tone: "good" }],
        marker: { index: 6, label: "Reroute" },
        domain: [0, 40],
      },
    },
    {
      id: "f-dispatch", t: at("02:23"), agent: "operator", kind: "act",
      title: "Send the splicing crew to the exact spot",
      action: { command: "wfm.dispatch(team='Splicing-JA-2', gps='24.981,55.121', kit='48F splice', manhole='MH-JA-0412')", system: "Field service (WFM)", reversible: false, approvalReason: "Night call-out for a splicing crew. It costs money and can't be undone.", cost: "AED 3,800", result: "Crew Splicing-JA-2 on the way. ETA 02:58, with the GPS and manhole number." },
      feed: "Dispatched a splicing crew with the GPS of the cut",
    },
    {
      id: "f-tell", t: at("02:24"), agent: "liaison", kind: "act",
      title: "Told the two enterprise customers on the single-homed sites",
      action: { command: "notify(accounts=['ENT-LOG-0187','ENT-PORT-0042'], eta='05:30')", system: "du Business portal", reversible: true, result: "Both customers notified with the cause and an ETA. Their account managers are copied." },
    },
    {
      id: "f-proof", t: at("05:52"), agent: "verifier", kind: "verify",
      title: "Spliced. The original path is back and the alarms are clear.",
      chips: [{ label: "Splice loss", value: "0.3 dB", tone: "good" }, { label: "Sites up", value: "38 / 38", tone: "good" }, { label: "Protection path", value: "Released" }],
      feed: "Fibre spliced, all 38 sites on the original path",
    },
    {
      id: "f-learn", t: at("06:05"), agent: "planner", kind: "learn",
      title: "Flagged 4 single-homed sites for a second path",
      body: "This duct has been cut twice this year. I raised a planning request to dual-home the 4 sites and asked for alerts when new excavation permits open within 50 m of this route.",
    },
  ],
};

/* ───────────────────────────── 05:40 Coastal fog, Abu Dhabi ───────────────────────────── */

const fogSites = sitesIn(["Corniche", "Saadiyat", "Al Reem Island"], 11);

const fog: Incident = {
  id: "fog",
  number: "INC-1015-0005",
  title: "Fog is coming. Move the traffic first.",
  oneLiner: "Nine microwave links on the Abu Dhabi coast lose margin as fog rolls in.",
  domain: "Transport",
  lens: "Prevention",
  severity: "P3",
  siteId: "CRN-MW1",
  place: "Abu Dhabi Corniche",
  asset: "9 microwave links · 11 sites",
  vendor: "Huawei",
  trigger: at("05:40"),
  autoOpen: false,
  liveUntil: at("05:45"),
  closesOn: "g-verify",
  rawAlarms: 0,
  impact: { subscribers: subscribersOf(fogSites, 0.3), minutesAvoided: 140, slaCreditsAvoided: 0, ticketsAvoided: 3, visitsAvoided: 0 },
  phases: [
    { from: "g-observe", to: "g-act", status: "watch", sites: fogSites, subscribers: 0 },
    { from: "g-act", to: "g-revert", status: "watch", sites: fogSites, subscribers: 0 },
    { from: "g-revert", status: "fixed", sites: fogSites, subscribers: 0 },
  ],
  steps: [
    {
      id: "g-observe", t: at("05:40"), agent: "sentinel", kind: "observe",
      title: "Nine microwave links are losing margin",
      body: "The fog advisory for the Abu Dhabi coast landed at 05:31. Since then received signal has dropped 0.4 dB a minute and modulation has stepped down from 4096-QAM to 1024-QAM. No alarm yet.",
      chips: [{ label: "Links affected", value: "9", tone: "warn" }, { label: "Margin left", value: "7.2 dB", tone: "warn" }, { label: "Alarms", value: "0" }],
      evidence: {
        title: "Fade margin on the worst link",
        caption: "At this rate it crosses the outage threshold at about 06:25, in the morning rush.",
        unit: "dB",
        labels: times("05:10", 5, 16),
        series: [
          { name: "Margin", values: [18, 17.8, 17.9, 17.5, 16.2, 14.1, 11.9, 9.6, 7.2, null, null, null, null, null, null, null], tone: "brand" },
          { name: "Forecast", values: [null, null, null, null, null, null, null, null, 7.2, 5.4, 3.9, 2.4, 1.0, 0.2, -0.5, -0.8], tone: "warn", dashed: true },
        ],
        threshold: { value: 1, label: "Outage" },
        domain: [-2, 20],
      },
      feed: "Fog on the Abu Dhabi coast: 9 microwave links losing margin",
      kb: ["FEED-NCM"],
    },
    {
      id: "g-predict", t: at("05:42"), agent: "diagnostician", kind: "hypothesize",
      title: "It's the fog. Three links will drop by 06:25.",
      hypotheses: [
        { id: "fog", label: "Fog fading on the coastal hops", p: 0.88 },
        { id: "align", label: "Antenna misalignment", p: 0.07 },
        { id: "interf", label: "Interference", p: 0.05 },
      ],
      body: "All nine links run along the water, and inland links on the same radios are fine. The fade follows the advisory's timing.",
    },
    {
      id: "g-plan", t: at("05:43"), agent: "planner", kind: "plan",
      title: "Move 11 sites onto fibre before the fog peaks",
      options: [
        { id: "wait", title: "Wait", summary: "Three links drop around 06:25, just as people commute.", metrics: [{ label: "Sites at risk", value: "11", tone: "bad" }] },
        { id: "move", title: "Pre-route onto the Saadiyat fibre ring", summary: "Move the traffic now while everything still works. Move it back when the fog clears.", recommended: true, metrics: [{ label: "Customer impact", value: "None", tone: "good" }, { label: "Reversible", value: "Yes", tone: "good" }] },
      ],
      kb: ["MOP-TX-021"],
    },
    {
      id: "g-act", t: at("05:44"), agent: "operator", kind: "act",
      title: "Pre-routed 11 sites onto fibre",
      action: { command: "te.prefer(sites=11, path='SAADIYAT-FIBRE-RING', reason='fog')", system: "IP controller", reversible: true, result: "11 sites now ride the fibre ring. The microwave links stay up as backup." },
      feed: "Moved 11 coastal sites onto fibre ahead of the fog",
    },
    {
      id: "g-verify", t: at("06:30"), agent: "verifier", kind: "verify",
      title: "Two links faded out at 06:22. Nobody noticed.",
      chips: [{ label: "Links that dropped", value: "2", tone: "warn" }, { label: "Customer impact", value: "None", tone: "good" }],
    },
    {
      id: "g-revert", t: at("08:40"), agent: "operator", kind: "act",
      title: "Fog cleared. Traffic moved back to microwave.",
      action: { command: "te.prefer(sites=11, path='default')", system: "IP controller", reversible: true, result: "Margin back above 15 dB for 30 minutes. Original paths restored." },
      feed: "Fog cleared on the Corniche, traffic back on microwave",
    },
  ],
};

/* ───────────────────────────── 08:05 Planned upgrade masking as a fault ───────────────────────────── */

const planned: Incident = {
  id: "planned",
  number: "INC-1015-0006",
  title: "Twelve core alarms that aren't an outage",
  oneLiner: "An SMF upgrade inside its change window looked like a core fault.",
  domain: "Core",
  lens: "Correlation",
  severity: "P3",
  siteId: "QUS-001",
  place: "Dubai core data centre",
  asset: "SMF pool, member 2 of 4",
  trigger: at("08:05"),
  autoOpen: false,
  liveUntil: at("08:08"),
  closesOn: "p-verify",
  rawAlarms: 12,
  impact: { subscribers: 0, minutesAvoided: 0, slaCreditsAvoided: 0, ticketsAvoided: 12, visitsAvoided: 0 },
  phases: [],
  steps: [
    {
      id: "p-observe", t: at("08:05"), agent: "correlator", kind: "correlate",
      title: "Twelve core events in three minutes",
      body: "SMF member 2 went out of service, the CDR feed to billing started lagging, and two Diameter peers flapped. On their own these look like the start of a core outage.",
      chips: [{ label: "Events", value: "12", tone: "warn" }, { label: "Sessions dropped", value: "0", tone: "good" }],
    },
    {
      id: "p-match", t: at("08:06"), agent: "diagnostician", kind: "tool",
      title: "It's the planned upgrade, and it's on track",
      tools: [
        { system: "ITSM", call: "changes.active(node='DXB-SMF-02')", result: ["CHG-26-10412 · SMF pool upgrade · 08:00–09:30 · approved"] },
        { system: "Core counters", call: "smf.pool('DXB')", result: ["3 of 4 members serving · sessions rebalanced · PDU setup success 99.9%"] },
        { system: "Billing mediation", call: "cdr.lag('DXB-SMF')", result: ["Lag 4 min · buffering · no records lost"] },
      ],
      kb: ["CHG-26-10412"],
    },
    {
      id: "p-act", t: at("08:07"), agent: "operator", kind: "act",
      title: "Marked as expected and held the tickets",
      action: { command: "itsm.suppress(events=12, until='CHG-26-10412 closes', watch='PDU success < 99.5%')", system: "ITSM", reversible: true, result: "No tickets opened. The agents keep watching and will page Core if sessions start failing." },
      feed: "Matched 12 core events to change CHG-26-10412, no tickets",
    },
    {
      id: "p-verify", t: at("09:34"), agent: "verifier", kind: "verify",
      title: "Upgrade finished. All four SMF members serving.",
      chips: [{ label: "CDR backlog", value: "Drained in 6 min", tone: "good" }, { label: "Tickets raised", value: "0", tone: "good" }],
    },
  ],
};

/* ───────────────────────────── 09:40 Change gone wrong, Sharjah ───────────────────────────── */

const majazSites = ["MAJ-C01", ...sitesIn(["Al Majaz"], 22)];

const rollback: Incident = {
  id: "rollback",
  number: "INC-1015-0007",
  title: "A parameter change that made calls fail",
  oneLiner: "A handover tuning push on 23 Sharjah cells cut call setup success by 4 points. No alarm fired.",
  domain: "RAN",
  lens: "Remediation",
  severity: "P2",
  siteId: "MAJ-C01",
  place: "Al Majaz, Sharjah",
  asset: "23 cells · Nokia",
  vendor: "Nokia",
  trigger: at("09:40"),
  autoOpen: true,
  liveUntil: at("09:46"),
  closesOn: "r-verify",
  rawAlarms: 0,
  impact: { subscribers: subscribersOf(majazSites, 0.6), minutesAvoided: 130, slaCreditsAvoided: 0, ticketsAvoided: 40, visitsAvoided: 0 },
  phases: [
    { from: "r-observe", to: "r-act", status: "degraded", sites: majazSites, subscribers: subscribersOf(majazSites, 0.04) },
    { from: "r-act", to: "r-verify", status: "watch", sites: majazSites, subscribers: 0 },
    { from: "r-verify", status: "fixed", sites: majazSites, subscribers: 0 },
  ],
  steps: [
    {
      id: "r-observe", t: at("09:40"), agent: "sentinel", kind: "observe",
      title: "Call setup in Al Majaz fell 4 points in 40 minutes",
      body: "Call setup success on 23 cells dropped from 99.1% to 95.2%, and dropped calls quadrupled. Nothing raised an alarm, because nothing is broken in hardware terms. Neighbouring areas are normal.",
      chips: [{ label: "CSSR", value: "95.2%", tone: "bad" }, { label: "Drop rate", value: "1.6%", tone: "bad" }, { label: "Alarms", value: "0" }],
      evidence: {
        title: "Call setup success, Al Majaz cluster",
        caption: "The fall starts minutes after a parameter change at 09:00.",
        unit: "%",
        labels: times("08:30", 5, 15),
        series: [
          { name: "Al Majaz", values: [99.1, 99.2, 99.1, 99.0, 99.1, 99.1, 98.3, 97.4, 96.6, 96.1, 95.8, 95.4, 95.2, 95.3, 95.2], tone: "brand" },
          { name: "Neighbouring clusters", values: [99.0, 99.1, 99.0, 99.1, 99.0, 99.1, 99.0, 99.1, 99.0, 99.0, 99.1, 99.0, 99.1, 99.0, 99.1], tone: "muted" },
        ],
        marker: { index: 6, label: "CHG-26-10398" },
        domain: [94, 100],
      },
      feed: "Call setup success down 4 points on 23 Sharjah cells, no alarm",
    },
    {
      id: "r-hypo", t: at("09:41"), agent: "diagnostician", kind: "hypothesize",
      title: "A change went in at 09:00. That's my first suspect.",
      hypotheses: [
        { id: "chg", label: "Parameter change CHG-26-10398", p: 0.62 },
        { id: "interf", label: "External interference", p: 0.17 },
        { id: "tx", label: "Transport congestion", p: 0.12 },
        { id: "core", label: "Core problem in Sharjah", p: 0.09 },
      ],
      kb: ["CHG-26-10398"],
    },
    {
      id: "r-test", t: at("09:42"), agent: "diagnostician", kind: "tool",
      title: "Only the changed cells are hurting",
      tools: [
        { system: "Nokia NetAct", call: "config.diff(cluster='AL-MAJAZ', vs='golden v2026.10.08')", result: ["3 parameters changed on 23 cells", "a3Offset 3→1 dB · timeToTrigger 320→80 ms · hysteresis 2→1 dB"] },
        { system: "PM counters", call: "ho.failures(cluster='AL-MAJAZ', 60m)", result: ["Ping-pong handovers ×5.8 · too-early handovers ×4.1"] },
        { system: "Core counters", call: "attach.success(region='SHJ')", result: ["99.7% · normal"] },
        { system: "IP controller", call: "backhaul.util(cluster='AL-MAJAZ')", result: ["38% · no loss"] },
      ],
    },
    {
      id: "r-hypo2", t: at("09:43"), agent: "diagnostician", kind: "hypothesize",
      title: "The new handover settings make phones bounce between cells",
      hypotheses: [
        { id: "chg", label: "Parameter change CHG-26-10398", p: 0.94 },
        { id: "interf", label: "External interference", p: 0.03 },
        { id: "tx", label: "Transport congestion", p: 0.02 },
        { id: "core", label: "Core problem in Sharjah", p: 0.01 },
      ],
    },
    {
      id: "r-plan", t: at("09:43"), agent: "planner", kind: "plan",
      title: "Roll back the three parameters. Keep the rest of the change.",
      options: [
        { id: "tune", title: "Leave it for RAN optimisation to tune", summary: "The team is in at 10:30. Calls keep failing until then.", metrics: [{ label: "Degraded for", value: "2 h+", tone: "bad" }] },
        { id: "rollback", title: "Roll back to golden config", summary: "Restore only the three changed parameters on 23 cells. About 4 minutes, and fully reversible.", recommended: true, metrics: [{ label: "Degraded for", value: "~4 min", tone: "good" }, { label: "Reversible", value: "Yes", tone: "good" }] },
        { id: "partial", title: "Roll back the worst 8 cells", summary: "Smaller blast radius, but the cells that bounce between both sets stay bad.", metrics: [{ label: "Degraded for", value: "Partly", tone: "warn" }] },
      ],
      kb: ["MOP-RAN-031"],
    },
    {
      id: "r-act", t: at("09:44"), agent: "operator", kind: "act",
      title: "Rolled back 3 parameters on 23 cells",
      action: { command: "netact.rollback(cluster='AL-MAJAZ', params=['a3Offset','timeToTrigger','hysteresis'], to='golden v2026.10.08')", system: "Nokia NetAct", reversible: true, result: "23 cells back on the golden values. The change record is paused." },
      feed: "Rolled back the Al Majaz parameter change on 23 cells",
    },
    {
      id: "r-tell", t: at("09:45"), agent: "liaison", kind: "act",
      title: "Paused the change and told its owner",
      action: { command: "itsm.pause('CHG-26-10398', note='CSSR −3.9 pts; rolled back by Operator; evidence attached')", system: "ITSM", reversible: true, result: "The RAN optimisation team has the evidence and the before-and-after KPIs." },
    },
    {
      id: "r-verify", t: at("10:05"), agent: "verifier", kind: "verify",
      title: "Call setup back to 99.1%. Dropped calls back to normal.",
      chips: [{ label: "CSSR", value: "99.1%", tone: "good" }, { label: "Drop rate", value: "0.4%", tone: "good" }, { label: "Customer complaints", value: "0" }],
      evidence: {
        title: "Call setup success after the rollback",
        caption: "Recovered within one 15-minute counter period.",
        unit: "%",
        labels: times("09:30", 5, 8),
        series: [{ name: "Al Majaz", values: [95.3, 95.2, 95.2, 97.8, 98.9, 99.1, 99.1, 99.2], tone: "good" }],
        marker: { index: 3, label: "Rollback" },
        domain: [94, 100],
      },
      feed: "Al Majaz call setup success back to 99.1%",
    },
    {
      id: "r-learn", t: at("10:08"), agent: "planner", kind: "learn",
      title: "New guardrail: big pushes start with a canary",
      body: "Parameter pushes to more than 10 cells now go to 2 cells first and wait 15 minutes for KPIs before the rest. This one would have been caught on the canary.",
    },
  ],
};

/* ───────────────────────────── 11:30 Grid trip, Hatta and Al Ain ───────────────────────────── */

const powerSites = ["HTA-D01", ...sitesIn(["Hatta"], 5), "ALN-H02", ...sitesIn(["Al Ain"], 7)];

const power: Incident = {
  id: "power",
  number: "INC-1015-0009",
  title: "14 sites on battery, and not all will last",
  oneLiner: "A grid trip put Hatta and Al Ain sites on battery with a 3-hour restore estimate.",
  domain: "Power",
  lens: "Prevention",
  severity: "P2",
  siteId: "ALN-H02",
  place: "Hatta · Al Ain",
  asset: "14 sites on battery",
  trigger: at("11:30"),
  autoOpen: false,
  liveUntil: at("11:36"),
  closesOn: "w-verify",
  rawAlarms: 46,
  impact: { subscribers: subscribersOf(powerSites.slice(0, 5), 0.5), minutesAvoided: 85, slaCreditsAvoided: 0, ticketsAvoided: 13, visitsAvoided: 0 },
  phases: [
    { from: "w-observe", to: "w-verify", status: "watch", sites: powerSites, subscribers: 0 },
    { from: "w-verify", to: "w-restore", status: "watch", sites: powerSites, subscribers: 0 },
    { from: "w-restore", status: "fixed", sites: powerSites, subscribers: 0 },
  ],
  steps: [
    {
      id: "w-observe", t: at("11:30"), agent: "sentinel", kind: "observe",
      title: "14 sites switched to battery after a grid trip",
      body: "The utility confirms two feeder trips, one near Hatta and one in Al Ain, with an estimated restore of 14:30. It's 38 °C, which shortens battery life.",
      chips: [{ label: "Sites on battery", value: "14", tone: "warn" }, { label: "Utility ETA", value: "14:30" }, { label: "Ambient", value: "38 °C" }],
      kb: ["FEED-UTIL"],
      feed: "Grid trip: 14 Hatta and Al Ain sites on battery",
    },
    {
      id: "w-predict", t: at("11:32"), agent: "diagnostician", kind: "tool",
      title: "Five sites won't last until the grid is back",
      tools: [
        { system: "Power telemetry", call: "battery.autonomy(sites=14, temp=38)", result: ["9 sites last beyond 14:30", "5 sites run out between 13:10 and 14:05", "Includes ALN-H02, which covers Tawam Hospital"] },
      ],
      evidence: {
        title: "Battery left on the five weakest sites",
        caption: "Dashed lines: with capacity carriers switched off. The grid returns at about 14:30.",
        unit: "%",
        labels: times("11:30", 20, 9),
        series: [
          { name: "As now", values: [100, 82, 64, 45, 27, 9, 0, 0, 0], tone: "bad" },
          { name: "With load shedding", values: [100, 88, 76, 64, 52, 40, 29, 18, 8], tone: "good", dashed: true },
        ],
        threshold: { value: 5, label: "Cut-off" },
        domain: [0, 100],
      },
      kb: ["POL-CRIT-001"],
    },
    {
      id: "w-plan", t: at("11:33"), agent: "planner", kind: "plan",
      title: "Stretch every battery, and send generators to the two that matter most",
      options: [
        { id: "wait", title: "Wait for the grid", summary: "Five sites go off air from 13:10, including the hospital site.", metrics: [{ label: "Sites lost", value: "5", tone: "bad" }] },
        { id: "shed", title: "Shed capacity carriers on all 14", summary: "Keep the coverage layers on, switch off 5G-A and extra carriers. Adds about 70 minutes.", metrics: [{ label: "Sites lost", value: "2", tone: "warn" }, { label: "Reversible", value: "Yes", tone: "good" }] },
        { id: "both", title: "Shed load, and send 2 generators", summary: "Tawam Hospital first, then Hatta Dam. No site goes off air.", recommended: true, metrics: [{ label: "Sites lost", value: "0", tone: "good" }, { label: "Cost", value: "AED 6,400", tone: "warn" }] },
      ],
      kb: ["MOP-PWR-007"],
    },
    {
      id: "w-shed", t: at("11:34"), agent: "operator", kind: "act",
      title: "Switched off capacity carriers on 14 sites",
      action: { command: "power_save(sites=14, keep=['L1800','n78 anchor'], off=['5G-A','L2600'])", system: "Huawei iMaster MAE · Ericsson ENM", reversible: true, result: "Every site keeps coverage. Battery life up by about 70 minutes." },
      feed: "Load shedding on 14 battery sites, coverage kept",
    },
    {
      id: "w-dispatch", t: at("11:35"), agent: "operator", kind: "act",
      title: "Send two mobile generators: hospital first",
      action: { command: "wfm.dispatch(asset='GEN-60kVA ×2', order=['ALN-H02 Tawam Hospital','HTA-D01 Hatta Dam'])", system: "Field service (WFM)", reversible: false, approvalReason: "Two generator call-outs. They cost money and can't be undone.", cost: "AED 6,400", result: "Generators on the way. ETA 12:40 at Tawam, 12:55 at Hatta Dam." },
      feed: "Generators dispatched: Tawam Hospital first",
    },
    {
      id: "w-verify", t: at("13:05"), agent: "verifier", kind: "verify",
      title: "Both generators running. No site went off air.",
      chips: [{ label: "Lowest battery", value: "41%", tone: "good" }, { label: "Sites lost", value: "0", tone: "good" }],
    },
    {
      id: "w-restore", t: at("14:40"), agent: "operator", kind: "act",
      title: "Grid back. Full capacity restored on 14 sites.",
      action: { command: "power_save(sites=14, off=[])", system: "Huawei iMaster MAE · Ericsson ENM", reversible: true, result: "All carriers back on. Generators released." },
      feed: "Grid restored in Hatta and Al Ain, carriers back on",
    },
  ],
};

/* ───────────────────────────── 13:20 GITEX surge, DWTC ───────────────────────────── */

const gitexSites = ["DWT-H01", "DWT-H02", "DWT-M03", ...sitesIn(["Trade Centre"], 6)];

const gitex: Incident = {
  id: "gitex",
  number: "INC-1015-0011",
  title: "GITEX is about to fill every cell",
  oneLiner: "The keynote ends at 13:50 and the halls are already at 81% load.",
  domain: "RAN",
  lens: "Revenue",
  severity: "P1",
  siteId: "DWT-H01",
  place: "Dubai World Trade Centre",
  asset: "9 sites · 54 cells · Nokia",
  vendor: "Nokia",
  trigger: at("13:20"),
  autoOpen: true,
  liveUntil: at("13:56"),
  closesOn: "x-verify",
  rawAlarms: 0,
  impact: { subscribers: 41000, minutesAvoided: 95, slaCreditsAvoided: 42000, ticketsAvoided: 6, visitsAvoided: 0 },
  phases: [
    { from: "x-observe", to: "x-slice", status: "degraded", sites: gitexSites, subscribers: 0 },
    { from: "x-slice", to: "x-release", status: "watch", sites: gitexSites, subscribers: 0 },
    { from: "x-release", status: "fixed", sites: gitexSites, subscribers: 0 },
  ],
  steps: [
    {
      id: "x-observe", t: at("13:20"), agent: "sentinel", kind: "observe",
      title: "The halls are filling faster than last year",
      body: "Radio load across the Trade Centre is 81% and climbing 1.2 points a minute. When the keynote lets out at 13:50, the forecast crosses 95%. Premium 5G+ users have already lost a third of their speed.",
      chips: [{ label: "Load now", value: "81%", tone: "warn" }, { label: "Forecast 13:50", value: "97%", tone: "bad" }, { label: "People on site", value: "~41,000" }],
      evidence: {
        title: "Radio load, Trade Centre cells",
        caption: "Forecast from today's footfall, the agenda and last year's GITEX Thursday.",
        unit: "%",
        labels: times("12:40", 5, 16),
        series: [
          { name: "Load", values: [62, 65, 67, 70, 73, 77, 81, 83, null, null, null, null, null, null, null, null], tone: "brand" },
          { name: "Forecast", values: [null, null, null, null, null, null, null, 83, 86, 89, 92, 95, 97, 96, 93, 90], tone: "warn", dashed: true },
        ],
        threshold: { value: 95, label: "Congestion" },
        marker: { index: 14, label: "Keynote ends" },
        domain: [50, 100],
      },
      kb: ["POL-EVT-002"],
      feed: "GITEX: Trade Centre cells at 81% and rising",
    },
    {
      id: "x-hypo", t: at("13:21"), agent: "diagnostician", kind: "hypothesize",
      title: "What breaks first? Probably the uplink.",
      body: "At tech shows, people upload more than they download: demos, streams, video. I'm checking every layer, because the fix depends on which one fails first.",
      hypotheses: [
        { id: "ul", label: "Uplink congestion from video uploads", p: 0.48 },
        { id: "dl", label: "Downlink radio capacity", p: 0.37 },
        { id: "upf", label: "Core user-plane bottleneck", p: 0.1 },
        { id: "tx", label: "Backhaul", p: 0.05 },
      ],
    },
    {
      id: "x-test", t: at("13:22"), agent: "diagnostician", kind: "tool",
      title: "Uplink first, then downlink. Core and backhaul are fine.",
      tools: [
        { system: "Nokia MantaRay SMO", call: "prb.util(cluster='DWTC', split='ul/dl')", result: ["Uplink 88% · downlink 79%"] },
        { system: "Core counters", call: "upf.load('DXB-UPF-03')", result: ["41% · headroom fine"] },
        { system: "IP controller", call: "backhaul.util(cluster='DWTC')", result: ["52% on 2×100G"] },
        { system: "Event calendar", call: "agenda('GITEX', day=4)", result: ["Main-stage keynote ends 13:50 · 6 hall sessions end 14:00"] },
      ],
    },
    {
      id: "x-plan", t: at("13:23"), agent: "planner", kind: "plan",
      title: "Protect what matters, add capacity, block nobody",
      options: [
        { id: "nothing", title: "Do nothing", summary: "Payments at stands start timing out after 13:50 and premium users lose most of their speed.", metrics: [{ label: "Card payments failing", value: "~6%", tone: "bad" }] },
        { id: "intent", title: "Apply the GITEX intent and open standby cells", summary: "Guarantee floors for payments, broadcasters and 5G+ users. Unlock 4 standby capacity cells and move idle phones to n41.", recommended: true, metrics: [{ label: "Payments", value: "Protected", tone: "good" }, { label: "Reversible", value: "Yes", tone: "good" }] },
        { id: "block", title: "Throttle video uploads", summary: "Frees the uplink fastest, but it's a customer-facing restriction.", metrics: [{ label: "Policy", value: "Not allowed", tone: "bad" }] },
      ],
      kb: ["POL-EVT-002"],
    },
    {
      id: "x-slice", t: at("13:24"), agent: "operator", kind: "act",
      title: "Applied the GITEX intent on the Trade Centre slice",
      action: { command: "intent.apply('GITEX-DWTC', floors={payments:'2 Mbps', broadcast_ul:'50 Mbps', '5G+':'100 Mbps'}, others='best effort')", system: "Nokia MantaRay SMO", reversible: true, result: "Intent active on 54 cells. The SMO adjusts radio policy every 30 seconds to hold the floors." },
      feed: "GITEX intent applied on 54 Trade Centre cells",
    },
    {
      id: "x-cells", t: at("13:25"), agent: "operator", kind: "act",
      title: "Opened 4 standby cells and moved idle phones to n41",
      action: { command: "cells.unlock(['DWT-H01-7','DWT-H01-8','DWT-H02-7','DWT-M03-10']); load_balance(to='n41', idle=True)", system: "Nokia MantaRay SMO", reversible: true, result: "Capacity up 22%. 2,100 idle phones moved to n41." },
    },
    {
      id: "x-verify", t: at("13:55"), agent: "verifier", kind: "verify",
      title: "The keynote ended. 41,000 phones came out. Nothing broke.",
      chips: [{ label: "Peak load", value: "92%", tone: "good" }, { label: "Payment success", value: "99.8%", tone: "good" }, { label: "5G+ median", value: "186 Mbps", tone: "good" }],
      evidence: {
        title: "Radio load with the intent active",
        caption: "Forecast without action (dashed) against what happened.",
        unit: "%",
        labels: times("13:20", 5, 9),
        series: [
          { name: "Without action", values: [81, 83, 86, 89, 92, 95, 97, 96, 93], tone: "muted", dashed: true },
          { name: "Actual", values: [81, 80, 79, 82, 85, 88, 92, 90, 86], tone: "good" },
        ],
        threshold: { value: 95, label: "Congestion" },
        domain: [50, 100],
      },
      feed: "GITEX keynote rush handled: payments 99.8%",
    },
    {
      id: "x-release", t: at("19:10"), agent: "operator", kind: "act",
      title: "Halls closed. Intent released, standby cells locked.",
      action: { command: "intent.release('GITEX-DWTC'); cells.lock(standby)", system: "Nokia MantaRay SMO", reversible: true, result: "Trade Centre back on its normal policy." },
      feed: "GITEX intent released for the night",
    },
    {
      id: "x-learn", t: at("19:12"), agent: "planner", kind: "learn",
      title: "Saved today's settings for Friday's crowd",
      body: "Friday's footfall forecast is 12% lower. The same intent will start at 12:30 instead of reacting at 13:20.",
    },
  ],
};

/* ───────────────────────────── 16:10 Enterprise SLA, DIFC ───────────────────────────── */

const enterprise: Incident = {
  id: "enterprise",
  number: "INC-1015-0013",
  title: "A bank's latency is creeping toward its SLA",
  oneLiner: "A Gold SLA banking VPN in DIFC drifts from 8 ms to 21 ms. The limit is 25.",
  domain: "Enterprise",
  lens: "Revenue",
  severity: "P2",
  siteId: "DIF-R03",
  place: "DIFC",
  asset: "Gold SLA VPN · ENT-BNK-0042",
  trigger: at("16:10"),
  autoOpen: false,
  liveUntil: at("16:15"),
  closesOn: "e-verify",
  rawAlarms: 2,
  impact: { subscribers: 0, minutesAvoided: 90, slaCreditsAvoided: 25000, ticketsAvoided: 1, visitsAvoided: 0 },
  phases: [
    { from: "e-observe", to: "e-act", status: "degraded", sites: ["DIF-R03"], subscribers: 0 },
    { from: "e-act", status: "fixed", sites: ["DIF-R03"], subscribers: 0 },
  ],
  steps: [
    {
      id: "e-observe", t: at("16:10"), agent: "sentinel", kind: "observe",
      title: "A Gold SLA bank's latency is rising",
      body: "One-way latency on the bank's VPN has gone from 8 ms to 21 ms in 25 minutes. On this trend it breaches the 25 ms SLA at about 16:22. The bank hasn't noticed yet.",
      chips: [{ label: "Latency", value: "21 ms", tone: "warn" }, { label: "SLA", value: "25 ms" }, { label: "Breach in", value: "~12 min", tone: "bad" }],
      evidence: {
        title: "One-way latency, ENT-BNK-0042",
        caption: "Service probe every minute.",
        unit: "ms",
        labels: times("15:45", 5, 8),
        series: [
          { name: "Latency", values: [8, 9, 11, 13, 16, 19, 21, null], tone: "brand" },
          { name: "Trend", values: [null, null, null, null, null, null, 21, 26], tone: "warn", dashed: true },
        ],
        threshold: { value: 25, label: "SLA" },
        domain: [0, 30],
      },
      kb: ["SLA-ENT-GOLD"],
      feed: "Gold SLA bank VPN at 21 ms, breach forecast 16:22",
    },
    {
      id: "e-test", t: at("16:11"), agent: "diagnostician", kind: "tool",
      title: "Its traffic is stuck behind GITEX traffic on one router",
      tools: [
        { system: "IP controller", call: "path.trace(vpn='ENT-BNK-0042')", result: ["Congested hop: DTN-PE2 port 0/3 at 93%"] },
        { system: "IP controller", call: "qos.inspect('DTN-PE2', 0/3)", result: ["Bank traffic marked best effort (DSCP 0) after a template change", "Should be EF / AF41"] },
      ],
    },
    {
      id: "e-act", t: at("16:12"), agent: "operator", kind: "act",
      title: "Moved the bank to the spare router and fixed its marking",
      action: { command: "vpn.failover('ENT-BNK-0042', to='DTN-PE1'); qos.remark(vpn, dscp='AF41')", system: "IP controller", reversible: true, result: "Latency 9 ms within a minute. Bank traffic is marked correctly again." },
      kb: ["MOP-ENT-009"],
      feed: "Bank VPN moved to DTN-PE1, latency back to 9 ms",
    },
    {
      id: "e-tell", t: at("16:13"), agent: "liaison", kind: "act",
      title: "Brief the bank's account manager before the bank calls",
      action: { command: "notify(account_manager, customer='ENT-BNK-0042', summary='latency peaked 21 ms, no SLA breach, fixed 16:12')", system: "du Business portal", reversible: false, approvalReason: "This contacts an enterprise customer's account team.", result: "The account manager has the timeline and the proof. The bank got a proactive note." },
    },
    {
      id: "e-verify", t: at("16:30"), agent: "verifier", kind: "verify",
      title: "Stable at 9 ms for 15 minutes. No SLA breach.",
      chips: [{ label: "Latency", value: "9 ms", tone: "good" }, { label: "Service credit", value: "Avoided", tone: "good" }],
    },
  ],
};

/* ───────────────────────────── 18:45 IoT signalling storm ───────────────────────────── */

const stormSites = sample(["Dubai", "Sharjah", "Ajman"], 160, "storm");

const storm: Incident = {
  id: "storm",
  number: "INC-1015-0016",
  title: "An attack, or a bug?",
  oneLiner: "Attach requests to the core jump nine times over in four minutes.",
  domain: "Core",
  lens: "Security",
  severity: "P1",
  siteId: "QUS-002",
  place: "Dubai core · Dubai, Sharjah, Ajman",
  asset: "AMF/MME pool · IoT APN",
  trigger: at("18:45"),
  autoOpen: true,
  liveUntil: at("18:56"),
  closesOn: "s-proof",
  rawAlarms: 96,
  impact: { subscribers: 310000, minutesAvoided: 25, slaCreditsAvoided: 0, ticketsAvoided: 22, visitsAvoided: 0 },
  phases: [
    { from: "s-observe", to: "s-throttle", status: "degraded", sites: stormSites, subscribers: 18000 },
    { from: "s-throttle", to: "s-proof", status: "watch", sites: stormSites.slice(0, 40), subscribers: 0 },
  ],
  steps: [
    {
      id: "s-observe", t: at("18:45"), agent: "guardian", kind: "observe",
      title: "Attach requests jumped 9× in four minutes",
      body: "The AMF/MME pool is taking 4,200 attach requests a second against a normal 460. Control-plane CPU is at 78%. Phones in Dubai, Sharjah and Ajman are starting to see slow registration.",
      chips: [{ label: "Attach rate", value: "4,200/s", tone: "bad" }, { label: "Core CPU", value: "78%", tone: "bad" }, { label: "Alarms", value: "96" }],
      evidence: {
        title: "Attach requests per second",
        caption: "Normal Thursday evening (grey) against now.",
        unit: "req/s",
        labels: times("18:25", 2, 12),
        series: [
          { name: "Now", values: [450, 470, 460, 455, 480, 1150, 2380, 3420, 4060, 4200, 4210, 4190], tone: "bad" },
          { name: "Last Thursday", values: [440, 455, 462, 470, 466, 471, 468, 475, 470, 466, 472, 469], tone: "muted" },
        ],
        domain: [0, 4800],
      },
      feed: "Signalling surge: attach requests 9× normal",
    },
    {
      id: "s-hypo", t: at("18:46"), agent: "diagnostician", kind: "hypothesize",
      title: "Could be a signalling attack. Could be our own devices.",
      body: "Last year a firmware bug looked like a DDoS for 25 minutes. Blocking the wrong thing would hurt real customers, so I'm testing both.",
      hypotheses: [
        { id: "ddos", label: "Signalling DDoS", p: 0.41 },
        { id: "iot", label: "IoT devices stuck in a retry loop", p: 0.39 },
        { id: "core", label: "Core software fault", p: 0.12 },
        { id: "ran", label: "Radio misconfiguration", p: 0.08 },
      ],
      kb: ["PIR-25-118"],
    },
    {
      id: "s-test", t: at("18:47"), agent: "guardian", kind: "tool",
      title: "One device model, one APN, one firmware. It's a bug.",
      tools: [
        { system: "Core counters", call: "attach.by_tac(top=3, 10m)", result: ["96% from one device type (TAC 35·614·2x): a smart-meter module"] },
        { system: "Signalling firewall", call: "inspect(source='attach surge')", result: ["No spoofed IMSIs · all home subscribers · no foreign origin"] },
        { system: "IoT platform", call: "fleet.changes(apn='iot.meter.ae', 2h)", result: ["Firmware 3.2.1 pushed by the customer at 18:30 to 61,000 meters", "Modules retry every 8 s after a failed PDN connect"] },
      ],
    },
    {
      id: "s-hypo2", t: at("18:48"), agent: "diagnostician", kind: "hypothesize",
      title: "Not an attack. 61,000 meters stuck in a retry loop.",
      hypotheses: [
        { id: "ddos", label: "Signalling DDoS", p: 0.03 },
        { id: "iot", label: "IoT devices stuck in a retry loop", p: 0.93 },
        { id: "core", label: "Core software fault", p: 0.03 },
        { id: "ran", label: "Radio misconfiguration", p: 0.01 },
      ],
    },
    {
      id: "s-plan", t: at("18:48"), agent: "planner", kind: "plan",
      title: "Slow the meters down. Don't cut them off.",
      options: [
        { id: "block", title: "Block the IoT APN", summary: "Stops the storm, but 61,000 meters go dark and the utility loses readings.", metrics: [{ label: "Customer harm", value: "High", tone: "bad" }] },
        { id: "backoff", title: "Back-off timer plus rate limit on this device type", summary: "Meters wait 10–20 minutes between retries and connect in waves. Phones unaffected.", recommended: true, metrics: [{ label: "Core CPU after", value: "~40%", tone: "good" }, { label: "Reversible", value: "Yes", tone: "good" }] },
        { id: "scale", title: "Scale out the AMF/MME pool", summary: "Buys time but doesn't stop the loop.", metrics: [{ label: "Fixes cause", value: "No", tone: "warn" }] },
      ],
      kb: ["MOP-CORE-022"],
    },
    {
      id: "s-throttle", t: at("18:49"), agent: "operator", kind: "act",
      title: "Applied a back-off on the meter APN",
      action: { command: "core.congestion(apn='iot.meter.ae', t3346='10-20m random'); ratelimit(tac='35614', 300/s)", system: "Core policy (AMF/MME)", reversible: true, result: "Attach rate falling. Phones have priority again." },
      feed: "Back-off applied to 61,000 meters, phones prioritised",
    },
    {
      id: "s-verify", t: at("18:53"), agent: "verifier", kind: "verify",
      title: "Core CPU back to 41%. Phones register normally.",
      chips: [{ label: "Attach rate", value: "610/s", tone: "good" }, { label: "Core CPU", value: "41%", tone: "good" }, { label: "Registration time", value: "Normal", tone: "good" }],
    },
    {
      id: "s-hold", t: at("18:55"), agent: "liaison", kind: "act",
      title: "Ask the utility to pause its firmware rollout",
      action: { command: "notify(customer='ENT-UTL-0009', ops_team, ask='pause FW 3.2.1 rollout', evidence=attached)", system: "du Business portal", reversible: false, approvalReason: "This asks an enterprise customer to change their own operations.", result: "The utility's IoT team paused the rollout at 19:20 and opened a case with their module vendor." },
      feed: "Asked the utility to pause its meter firmware rollout",
    },
    {
      id: "s-proof", t: at("19:25"), agent: "verifier", kind: "verify",
      title: "Rollout paused. The storm is gone.",
      chips: [{ label: "Attach rate", value: "470/s", tone: "good" }, { label: "Meters reporting", value: "99.2%", tone: "good" }],
    },
    {
      id: "s-learn", t: at("19:30"), agent: "guardian", kind: "learn",
      title: "New detector: storms from one device type are bugs until proven otherwise",
      body: "Surges from a single device type on a home APN now go straight to the back-off playbook. The DDoS playbook is reserved for spoofed or foreign traffic.",
    },
  ],
};

/* ───────────────────────────── 21:20 Sleeping cell, Dubai Mall ───────────────────────────── */

const sleeping: Incident = {
  id: "sleeping",
  number: "INC-1015-0019",
  title: "A cell that says it's fine",
  oneLiner: "An indoor 5G-A cell at The Dubai Mall has carried no traffic for 47 minutes. No alarm.",
  domain: "RAN",
  lens: "Sleeping cell",
  severity: "P2",
  siteId: "DML-I07",
  place: "The Dubai Mall",
  asset: "Cell DML-I07-3 · n78 · Huawei",
  vendor: "Huawei",
  trigger: at("21:20"),
  autoOpen: true,
  liveUntil: at("21:31"),
  closesOn: "z-verify",
  rawAlarms: 0,
  impact: { subscribers: 1900, minutesAvoided: 600, slaCreditsAvoided: 0, ticketsAvoided: 1, visitsAvoided: 1 },
  phases: [
    { from: "z-observe", to: "z-act", status: "down", sites: ["DML-I07"], subscribers: 1900 },
    { from: "z-act", status: "fixed", sites: ["DML-I07"], subscribers: 0 },
  ],
  steps: [
    {
      id: "z-observe", t: at("21:20"), agent: "sentinel", kind: "observe",
      title: "No one has used this cell for 47 minutes",
      body: "Cell 3 at Fashion Avenue normally carries about 1,900 users on a Thursday night. Since 20:33 it has carried none, while the cells next to it run 38% hotter. The cell reports itself as enabled and healthy.",
      chips: [{ label: "Alarms", value: "0" }, { label: "Users now", value: "0", tone: "bad" }, { label: "Expected", value: "~1,900" }, { label: "Neighbours", value: "+38% load", tone: "warn" }],
      evidence: {
        title: "Connected users, cell DML-I07-3",
        caption: "Tonight against last Thursday, and the neighbouring cells.",
        unit: "users",
        labels: times("19:50", 10, 10),
        series: [
          { name: "Tonight", values: [1780, 1850, 1920, 1960, 1890, 0, 0, 0, 0, 0], tone: "bad" },
          { name: "Last Thursday", values: [1760, 1830, 1880, 1940, 1960, 1980, 1950, 1910, 1890, 1860], tone: "muted", dashed: true },
          { name: "Neighbours (avg)", values: [1620, 1650, 1700, 1720, 1700, 2310, 2360, 2380, 2350, 2330], tone: "warn" },
        ],
        marker: { index: 5, label: "20:33" },
        domain: [0, 2600],
      },
      feed: "Sleeping cell at The Dubai Mall: 0 users, no alarm",
    },
    {
      id: "z-hypo", t: at("21:21"), agent: "diagnostician", kind: "hypothesize",
      title: "A sleeping cell, or something ordinary?",
      hypotheses: [
        { id: "sleep", label: "Sleeping cell (baseband stuck)", p: 0.58 },
        { id: "closed", label: "That part of the mall is closed", p: 0.2 },
        { id: "counter", label: "Counters not reporting", p: 0.14 },
        { id: "lock", label: "Locked for planned work", p: 0.08 },
      ],
    },
    {
      id: "z-test", t: at("21:22"), agent: "diagnostician", kind: "tool",
      title: "Unlocked, reporting, and refusing every phone",
      tools: [
        { system: "ITSM", call: "changes.active(site='DML-I07')", result: ["No planned work · no lock"] },
        { system: "Huawei iMaster MAE", call: "cell.state('DML-I07-3')", result: ["Enabled · unlocked · no active alarms"] },
        { system: "PM counters", call: "rrc.attempts('DML-I07-3', 45m)", result: ["0 RRC attempts · other 5 cells on this baseband normal"] },
        { system: "UE traces", call: "handover.to('DML-I07-3', 45m)", result: ["212 handovers attempted · 212 failed (no response)"] },
      ],
      kb: ["VB-IDR-2609"],
    },
    {
      id: "z-hypo2", t: at("21:23"), agent: "diagnostician", kind: "hypothesize",
      title: "It's asleep. A known vendor issue matches exactly.",
      hypotheses: [
        { id: "sleep", label: "Sleeping cell (baseband stuck)", p: 0.94 },
        { id: "closed", label: "That part of the mall is closed", p: 0.01 },
        { id: "counter", label: "Counters not reporting", p: 0.03 },
        { id: "lock", label: "Locked for planned work", p: 0.02 },
      ],
    },
    {
      id: "z-plan", t: at("21:24"), agent: "planner", kind: "plan",
      title: "Block and unblock the cell. Don't touch its neighbours.",
      options: [
        { id: "wait", title: "Leave it for the morning visit", summary: "1,900 people per hour pushed onto busy neighbours until the mall closes.", metrics: [{ label: "Field visit", value: "Yes", tone: "warn" }] },
        { id: "cell", title: "Block and unblock this one cell", summary: "About 90 seconds. The other 5 cells keep serving.", recommended: true, metrics: [{ label: "Impact", value: "None", tone: "good" }, { label: "Reversible", value: "Yes", tone: "good" }] },
        { id: "bbu", title: "Reset the whole baseband", summary: "Takes all 6 cells down for about 6 minutes.", metrics: [{ label: "Impact", value: "6 cells", tone: "bad" }] },
      ],
      kb: ["MOP-RAN-044"],
    },
    {
      id: "z-act", t: at("21:25"), agent: "operator", kind: "act",
      title: "Blocked and unblocked cell DML-I07-3",
      action: { command: "mae.cell.block('DML-I07-3'); wait(30s); mae.cell.unblock('DML-I07-3')", system: "Huawei iMaster MAE", reversible: true, result: "Cell back up. RRC attempts arriving." },
      feed: "Woke the sleeping cell at The Dubai Mall",
    },
    {
      id: "z-verify", t: at("21:30"), agent: "verifier", kind: "verify",
      title: "1,240 users back on the cell in five minutes",
      chips: [{ label: "Users", value: "1,240", tone: "good" }, { label: "Neighbour load", value: "Normal", tone: "good" }, { label: "Field visit", value: "Not needed", tone: "good" }],
      feed: "Dubai Mall cell back to 1,240 users",
    },
    {
      id: "z-learn", t: at("21:31"), agent: "sentinel", kind: "learn",
      title: "Checked all 214 indoor 5G-A cells. Found one more.",
      body: "A cell at DXB Terminal 3 had the same pattern for 12 minutes. It was woken the same way at 21:33. Indoor cells with this baseband version are now checked every 5 minutes instead of every 15.",
      feed: "Found and woke a second sleeping cell at DXB T3",
    },
  ],
};

/* ───────────────────────────── 23:10 Subsea degradation ───────────────────────────── */

const subsea: Incident = {
  id: "subsea",
  number: "INC-1015-0021",
  title: "Europe just got 38 ms further away",
  oneLiner: "A fault on a Red Sea cable system pushes up latency to Europe.",
  domain: "International",
  lens: "Correlation",
  severity: "P2",
  siteId: "FUJ-001",
  place: "Fujairah cable landing",
  asset: "International transit · EU prefixes",
  trigger: at("23:10"),
  autoOpen: false,
  liveUntil: at("23:15"),
  closesOn: "c-verify",
  rawAlarms: 8,
  impact: { subscribers: 120000, minutesAvoided: 30, slaCreditsAvoided: 0, ticketsAvoided: 140, visitsAvoided: 0 },
  phases: [
    { from: "c-observe", to: "c-act", status: "watch", sites: ["FUJ-001"], subscribers: 0, links: [["H-FUJ", "L-FUJ"]] },
  ],
  steps: [
    {
      id: "c-observe", t: at("23:10"), agent: "sentinel", kind: "observe",
      title: "Latency to Europe jumped 38 ms",
      body: "Round-trip time to European prefixes went from 112 ms to 150 ms in two minutes. Asia is unaffected. One transit provider has posted a fault notice for a Red Sea segment.",
      chips: [{ label: "RTT to EU", value: "150 ms", tone: "bad" }, { label: "Normal", value: "112 ms" }, { label: "Prefixes affected", value: "3,410" }],
      feed: "Latency to Europe up 38 ms after a subsea fault",
    },
    {
      id: "c-test", t: at("23:11"), agent: "diagnostician", kind: "tool",
      title: "Only traffic on one cable system is affected",
      tools: [
        { system: "IP transit", call: "rtt.by_path(dst='EU', 10m)", result: ["Red Sea route +38 ms · alternate route +6 ms"] },
        { system: "Capacity", call: "headroom(alternates)", result: ["Alternate system 47% used · 380 Gbps free"] },
        { system: "CDN", call: "cache.hit('top EU services')", result: ["Local caches serve 61% of the affected traffic"] },
      ],
    },
    {
      id: "c-act", t: at("23:12"), agent: "operator", kind: "act",
      title: "Shifted European traffic to the alternate route",
      action: { command: "bgp.prefer(prefixes='EU', via='alternate system'); cdn.prefer_local(True)", system: "IP transit", reversible: true, result: "Latency to Europe now 118 ms." },
      kb: ["MOP-INT-003"],
      feed: "European traffic moved to the alternate subsea route",
    },
    {
      id: "c-tell", t: at("23:13"), agent: "liaison", kind: "act",
      title: "Gave care an advisory, before the calls start",
      action: { command: "care.advisory(topic='Slower access to some EU services', eta='until repair', script=attached)", system: "Care advisories", reversible: true, result: "Care has a short script. du Business accounts with EU links have a note." },
    },
    {
      id: "c-verify", t: at("23:40"), agent: "verifier", kind: "verify",
      title: "Europe at 118 ms. Holding until the cable is repaired.",
      chips: [{ label: "RTT to EU", value: "118 ms", tone: "good" }, { label: "Care calls", value: "3", tone: "good" }],
    },
  ],
};

export const INCIDENTS: Incident[] = [fibre, fog, planned, rollback, power, gitex, enterprise, storm, sleeping, subsea];
export const INCIDENT_BY_ID: Record<string, Incident> = Object.fromEntries(INCIDENTS.map((i) => [i.id, i]));

export function incidentForStep(stepId: string) {
  return INCIDENTS.find((i) => i.steps.some((s) => s.id === stepId));
}
