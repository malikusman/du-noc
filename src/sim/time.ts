/** The simulated day is Thursday of GITEX week, 00:00 to 24:00 Gulf Standard Time. */
export const DAY_LENGTH = 24 * 60;
export const DAY_LABEL = "Thursday · GITEX week";

/** Minute of the day for "HH:MM". */
export function at(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

export function clock(t: number, seconds = false): string {
  const total = Math.max(0, Math.min(DAY_LENGTH, t));
  const h = Math.floor(total / 60) % 24;
  const m = Math.floor(total % 60);
  const base = total >= DAY_LENGTH ? "24:00" : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  if (!seconds) return base;
  const s = Math.floor((total * 60) % 60);
  return `${base}:${String(s).padStart(2, "0")}`;
}

export function duration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** 0 at night, 1 at midday (October in the UAE: sunrise ~06:15, sunset ~17:50). */
export function daylight(t: number): number {
  const h = t / 60;
  const rise = 6.25;
  const set = 17.85;
  const fade = 0.7;
  if (h < rise - fade || h > set + fade) return 0;
  if (h < rise + fade) return (h - (rise - fade)) / (2 * fade);
  if (h > set - fade) return 1 - (h - (set - fade)) / (2 * fade);
  return 1;
}

/** NOC shifts: night 19:00–07:00, day 07:00–19:00. */
export const SHIFTS = [
  { id: "night", name: "Night shift", from: 0, to: at("07:00"), handover: at("07:00"), lead: "Shift lead (night)" },
  { id: "day", name: "Day shift", from: at("07:00"), to: at("19:00"), handover: at("19:00"), lead: "Shift lead (day)" },
  { id: "evening", name: "Night shift", from: at("19:00"), to: DAY_LENGTH, handover: DAY_LENGTH, lead: "Shift lead (night)" },
] as const;

export function shiftAt(t: number) {
  return SHIFTS.find((s) => t >= s.from && t < s.to) ?? SHIFTS[2];
}
