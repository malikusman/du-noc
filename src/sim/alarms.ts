import { INCIDENTS } from "./incidents";
import { ROUTINE } from "./routine";
import { DAY_LENGTH } from "./time";

/**
 * The alarm river. Raw alarms per minute across every EMS, then what is left after
 * deduplication and correlation. Deterministic, so a run always shows the same numbers.
 */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Traffic-shaped background noise: quiet at 04:00, busiest in the evening. */
function baseline(minute: number) {
  const h = minute / 60;
  const shape = 0.55 + 0.45 * Math.sin(((h - 10) / 24) * 2 * Math.PI) + (h > 18 && h < 23 ? 0.15 : 0);
  return 18 + 16 * shape;
}

const rand = rng(77);
const perMinute = new Float64Array(DAY_LENGTH + 1);
for (let m = 0; m <= DAY_LENGTH; m++) perMinute[m] = baseline(m) * (0.75 + rand() * 0.5);
for (const i of INCIDENTS) {
  // An incident's raw alarms arrive over its first few minutes.
  const spread = [0.55, 0.25, 0.12, 0.08];
  spread.forEach((k, d) => {
    if (i.trigger + d <= DAY_LENGTH) perMinute[i.trigger + d] += i.rawAlarms * k;
  });
}
for (const r of ROUTINE) if (r.t <= DAY_LENGTH) perMinute[r.t] += r.alarms;

const cumulative = new Float64Array(DAY_LENGTH + 2);
for (let m = 0; m <= DAY_LENGTH; m++) cumulative[m + 1] = cumulative[m] + perMinute[m];

export function rawAlarms(t: number) {
  const m = Math.max(0, Math.min(DAY_LENGTH, t));
  const whole = Math.floor(m);
  return Math.round(cumulative[whole] + perMinute[whole] * (m - whole));
}

export function alarmRate(t: number) {
  return perMinute[Math.max(0, Math.min(DAY_LENGTH, Math.floor(t)))];
}

/** After deduplication: roughly 1 in 11 alarms is unique. */
export function uniqueEvents(t: number) {
  return Math.round(rawAlarms(t) / 11.4);
}

/** Alarms per hour for charts. */
export function alarmsByHour(upTo: number) {
  return Array.from({ length: 24 }, (_, h) => {
    const from = h * 60;
    const to = Math.min((h + 1) * 60, upTo);
    if (to <= from) return 0;
    return rawAlarms(to) - rawAlarms(from);
  });
}
