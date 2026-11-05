import { at } from "./time";

export interface Chapter {
  t: number;
  act: string;
  kicker: string;
  text: string;
  incident?: string;
  link?: { to: string; label: string };
}

export const ACTS = [
  { id: "1", name: "Act 1 · Night", theme: "Turning noise into signal", from: at("00:00"), to: at("07:00") },
  { id: "2", name: "Act 2 · Day", theme: "Prevent, don't react", from: at("07:00"), to: at("18:40") },
  { id: "3", name: "Act 3 · Evening", theme: "Judgement calls", from: at("18:40"), to: at("23:50") },
  { id: "E", name: "Epilogue", theme: "The morning brief", from: at("23:50"), to: at("24:00") },
];

/** Captions for presenting. Each appears when the clock reaches it. */
export const CHAPTERS: Chapter[] = [
  { t: at("00:00"), act: "Act 1 · Night", kicker: "00:00 · Thursday, GITEX week", text: "Mariam leads the night shift with one engineer and nine agents. 2,512 sites are hers until 07:00." },
  { t: at("02:10"), act: "Act 1 · Night", kicker: "Jebel Ali · 02:14", text: "A contractor's digger finds a fibre duct. 412 alarms are about to arrive at once." },
  { t: at("03:40"), act: "Act 1 · Night", kicker: "Quiet hours", text: "A DNS flood, a flapping link, a stuck cell. The agents fix the small things without opening a ticket." },
  { t: at("05:38"), act: "Act 1 · Night", kicker: "Abu Dhabi coast · fog", text: "No alarm yet. The agents act on the forecast, not the failure.", incident: "fog" },
  { t: at("07:00"), act: "Act 2 · Day", kicker: "07:00 · handover", text: "Khalid takes over. The Scribe hands him the night in one page.", link: { to: "/reports", label: "Read the handover →" } },
  { t: at("08:05"), act: "Act 2 · Day", kicker: "Dubai core", text: "Twelve core alarms that are really a planned upgrade. Nobody gets paged.", incident: "planned" },
  { t: at("09:36"), act: "Act 2 · Day", kicker: "Al Majaz, Sharjah", text: "A change at 09:00 is quietly making calls fail. No alarm will ever fire." },
  { t: at("11:30"), act: "Act 2 · Day", kicker: "Hatta · Al Ain", text: "A grid trip. Five sites won't last on battery, and one serves a hospital.", incident: "power" },
  { t: at("13:16"), act: "Act 2 · Day", kicker: "Dubai World Trade Centre", text: "The GITEX keynote ends at 13:50. The agents get ready before the crowd moves." },
  { t: at("16:10"), act: "Act 2 · Day", kicker: "DIFC", text: "A bank's link is drifting toward its SLA limit. The bank doesn't know yet.", incident: "enterprise" },
  { t: at("18:41"), act: "Act 3 · Evening", kicker: "Dubai core · evening peak", text: "Attach requests jump 9×. Is it an attack, or a bug? Getting it wrong blocks real customers." },
  { t: at("19:00"), act: "Act 3 · Evening", kicker: "19:00 · handover", text: "Mariam is back. Everything still open is on one page.", link: { to: "/reports", label: "Read the handover →" } },
  { t: at("21:16"), act: "Act 3 · Evening", kicker: "The Dubai Mall", text: "A cell that says it's healthy. Nobody has used it for 47 minutes." },
  { t: at("23:10"), act: "Act 3 · Evening", kicker: "Fujairah · international", text: "A subsea fault pushes Europe 38 ms further away.", incident: "subsea" },
  { t: at("23:50"), act: "Epilogue", kicker: "Friday 06:00 · the CTO's brief", text: "One page for the CTO: what happened, what the agents did alone, and the four decisions people made.", link: { to: "/executive", label: "Open the brief →" } },
];

export function chapterAt(t: number): Chapter {
  let current = CHAPTERS[0];
  for (const chapter of CHAPTERS) if (chapter.t <= t) current = chapter;
  return current;
}
