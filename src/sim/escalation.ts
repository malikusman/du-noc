import type { Incident, Step } from "./types";
import { shiftLead } from "./time";

export type Channel = "whatsapp-call" | "phone" | "whatsapp-message";

export const CHANNELS: { id: Channel; name: string; short: string; note: string }[] = [
  { id: "whatsapp-call", name: "WhatsApp call", short: "WhatsApp call", note: "A voice agent calls on WhatsApp, reads the briefing and listens for approve or reject." },
  { id: "phone", name: "Phone call", short: "Phone call", note: "The same voice agent on a normal mobile call. Works on any network." },
  { id: "whatsapp-message", name: "WhatsApp message", short: "WhatsApp", note: "A message with Approve, Reject and Call me buttons." },
];

export const VIA_LABEL: Record<string, string> = {
  "whatsapp-call": "on a WhatsApp call",
  phone: "by phone",
  "whatsapp-message": "on WhatsApp",
  app: "on the NOC screen",
};

export interface CallScript {
  greeting: string;
  lines: string[];
  ask: string;
  approved: string;
  rejected: string;
  /** The WhatsApp message version. */
  message: string;
}

export interface Approver {
  key: "night-lead" | "day-lead";
  name: string;
  role: string;
}

export function approverAt(t: number): Approver {
  const lead = shiftLead(t);
  return { key: lead.name === "Khalid" ? "day-lead" : "night-lead", name: lead.name, role: lead.role };
}

const ASK = "Say approve, or press 1. Say reject, or press 2. Say repeat, or press 3.";

/** What the voice agent says for each decision in the story. */
const SCRIPTS: Record<string, (who: string) => CallScript> = {
  "f-dispatch": (who) => ({
    greeting: `Hello ${who}, this is the du NOC agent with a P1 at Jebel Ali.`,
    lines: [
      "At 02:14 a contractor cut the fibre between Jebel Ali and Dubai South. 412 alarms, one cause.",
      "I've rerouted 34 of the 38 sites over the protection path. They're back on air.",
      "Four single-homed sites are still down, with two enterprise customers on them.",
      "I'd like to send splicing crew JA-2 to the break, 3.2 kilometres out, at manhole MH-JA-0412. The night call-out costs about 3,800 dirhams.",
    ],
    ask: ASK,
    approved: `Thank you ${who}. The crew is on the way, arriving around 02:58. I'll call you if the splice fails. Goodbye.`,
    rejected: "Understood. I won't dispatch. The 34 sites stay on the protection path, and the NOC engineers have the incident. Goodbye.",
    message: "P1 · INC-1015-0003 · Jebel Ali fibre cut\n412 alarms, one cause. 34 of 38 sites rerouted and back on air. 4 single-homed sites still down (2 enterprise customers).\n\nAsk: send splicing crew JA-2 to GPS 24.981, 55.121 (MH-JA-0412). Cost about AED 3,800.",
  }),
  "w-dispatch": (who) => ({
    greeting: `Hello ${who}, this is the du NOC agent with a P2 in Hatta and Al Ain.`,
    lines: [
      "A grid trip at 11:30 put 14 sites on battery. The utility expects power back around 14:30.",
      "At 38 degrees, five sites will run flat before then. One of them covers Tawam Hospital.",
      "I've switched off the capacity layers on all 14 sites to stretch the batteries. Coverage is untouched.",
      "I'd like to send two mobile generators, Tawam Hospital first, then Hatta Dam. That costs about 6,400 dirhams.",
    ],
    ask: ASK,
    approved: `Thanks ${who}. Two generators are on the way, Tawam first, arriving around 12:40. Goodbye.`,
    rejected: "Understood. No generators. I'll keep the load shedding on, and the engineers have the incident. Goodbye.",
    message: "P2 · INC-1015-0009 · 14 sites on battery (Hatta, Al Ain)\nGrid back ~14:30. At 38 °C, 5 sites run flat first, including the Tawam Hospital site. Load shedding already on.\n\nAsk: send 2 mobile generators, Tawam first, then Hatta Dam. Cost about AED 6,400.",
  }),
  "e-tell": (who) => ({
    greeting: `Hello ${who}, this is the du NOC agent about a Gold SLA customer in DIFC.`,
    lines: [
      "A bank's latency crept from 8 to 21 milliseconds. Its SLA limit is 25.",
      "Its traffic was marked best effort behind GITEX traffic. I've moved it to the spare router and it's back at 9 milliseconds. No breach.",
      "I'd like to brief the bank's account manager now, before the bank notices.",
    ],
    ask: ASK,
    approved: `Thanks ${who}. The account manager will have the timeline and the proof within a minute. Goodbye.`,
    rejected: "Understood. No customer contact. I've logged it for enterprise operations. Goodbye.",
    message: "P2 · INC-1015-0013 · Gold SLA bank, DIFC\nLatency peaked at 21 ms (SLA 25 ms). Fixed at 16:12 by moving to the spare PE. Now 9 ms, no breach.\n\nAsk: brief the bank's account manager before the bank notices.",
  }),
  "s-hold": (who) => ({
    greeting: `Hello ${who}, welcome on shift. This is the du NOC agent with a P1 from the evening peak.`,
    lines: [
      "At 18:45 attach requests to the core jumped nine times over. It looked like a signalling attack.",
      "It isn't. 96 percent come from one smart-meter model. The utility pushed new firmware at 18:30 and the meters are stuck retrying.",
      "I've slowed the meters down with a back-off. Phones register normally, and nobody is blocked.",
      "I'd like to ask the utility to pause its firmware rollout. That means contacting the customer.",
    ],
    ask: ASK,
    approved: "Thank you. I'm sending the evidence to the utility's IoT team now. Goodbye.",
    rejected: "Understood. I won't contact them. The back-off stays in place, and the core engineers have the incident. Goodbye.",
    message: "P1 · INC-1015-0016 · Signalling storm, evening peak\nNot an attack: 61,000 smart meters retrying after a firmware push at 18:30. Back-off applied, phones normal, nobody blocked.\n\nAsk: contact the utility to pause its firmware rollout.",
  }),
};

/** The briefing for any step that waits for a person. Hand-written for the story's decisions, generated otherwise. */
export function scriptFor(incident: Incident, step: Step, who: string): CallScript {
  const custom = SCRIPTS[step.id];
  if (custom) return custom(who);
  const cost = step.action?.cost ? ` It costs about ${step.action.cost.replace("AED", "").trim()} dirhams.` : "";
  return {
    greeting: `Hello ${who}, this is the du NOC agent with a ${incident.severity} at ${incident.place}.`,
    lines: [incident.oneLiner, `I'd like to go ahead with this: ${step.title.replace(/\.$/, "")}.${cost}`],
    ask: ASK,
    approved: `Thanks ${who}. Done. Goodbye.`,
    rejected: "Understood. I'll stop here and hand it to the NOC engineers. Goodbye.",
    message: `${incident.severity} · ${incident.number} · ${incident.title}\n${incident.oneLiner}\n\nAsk: ${step.title}${step.action?.cost ? ` (${step.action.cost})` : ""}.`,
  };
}
