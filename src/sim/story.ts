import { at } from "./time";

export interface Chapter {
  t: number;
  kicker: string;
  text: string;
  incident?: string;
}

/** Captions for presenting. Each appears when the clock reaches it. */
export const CHAPTERS: Chapter[] = [
  { t: at("00:00"), kicker: "00:00 · Thursday, GITEX week", text: "2,512 sites, three vendors, nine agents and one night shift. Press Space to start the day." },
  { t: at("02:10"), kicker: "Jebel Ali · 02:14", text: "A contractor's digger finds a fibre duct. 412 alarms are about to arrive at once." },
  { t: at("05:38"), kicker: "Abu Dhabi coast · fog", text: "No alarm yet. The agents act on the forecast, not the failure.", incident: "fog" },
  { t: at("07:00"), kicker: "Shift handover", text: "The night shift hands over in one page. Open Reports to read it." },
  { t: at("08:05"), kicker: "Dubai core", text: "Twelve core alarms that are really a planned upgrade. Nobody gets paged.", incident: "planned" },
  { t: at("09:36"), kicker: "Al Majaz, Sharjah", text: "A change at 09:00 is quietly making calls fail. No alarm will ever fire." },
  { t: at("11:30"), kicker: "Hatta · Al Ain", text: "A grid trip. Five sites won't last on battery, and one serves a hospital.", incident: "power" },
  { t: at("13:16"), kicker: "Dubai World Trade Centre", text: "The GITEX keynote ends at 13:50. The agents get ready before the crowd moves." },
  { t: at("16:10"), kicker: "DIFC", text: "A bank's link is drifting toward its SLA limit. The bank doesn't know yet.", incident: "enterprise" },
  { t: at("18:41"), kicker: "Dubai core · evening peak", text: "Attach requests jump 9×. Is it an attack, or a bug?" },
  { t: at("19:00"), kicker: "Shift handover", text: "Day shift hands over to nights. Everything open is on one page." },
  { t: at("21:16"), kicker: "The Dubai Mall", text: "A cell that says it's healthy. Nobody has used it for 47 minutes." },
  { t: at("23:10"), kicker: "Fujairah · international", text: "A subsea fault pushes Europe 38 ms further away.", incident: "subsea" },
];

export function chapterAt(t: number): Chapter {
  let current = CHAPTERS[0];
  for (const chapter of CHAPTERS) if (chapter.t <= t) current = chapter;
  return current;
}
