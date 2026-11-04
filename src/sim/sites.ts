import { AREAS, EMIRATES, HUBS, SITE_ROWS } from "./network";

export type Vendor = "Huawei" | "Ericsson" | "Nokia";
export type SiteType = "Macro" | "Rooftop" | "Small cell" | "Indoor";
export type Tech = "4G" | "5G" | "5G-A";

export interface Site {
  id: string;
  name: string;
  x: number;
  y: number;
  emirate: string;
  area: string;
  vendor: Vendor;
  type: SiteType;
  tech: Tech;
  cells: number;
  /** Typical attached subscribers at busy hour (simulated). */
  subscribers: number;
}

const VENDORS: Vendor[] = ["Huawei", "Ericsson", "Nokia"];
const TYPES: SiteType[] = ["Macro", "Rooftop", "Small cell", "Indoor"];
const TECHS: Tech[] = ["4G", "5G", "5G-A"];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export const SITES: Site[] = SITE_ROWS.map(([id, x, y, e, a, v, ty, g, name]) => {
  const type = TYPES[ty];
  const tech = TECHS[g];
  const cells = type === "Small cell" ? 2 : type === "Indoor" ? 6 : tech === "5G-A" ? 12 : tech === "5G" ? 9 : 6;
  const base = type === "Indoor" ? 2600 : type === "Small cell" ? 600 : type === "Rooftop" ? 1500 : 1900;
  return {
    id,
    name: name || `${AREAS[a]} ${type.toLowerCase()} ${id.split("-")[1]}`,
    x,
    y,
    emirate: EMIRATES[e],
    area: AREAS[a],
    vendor: VENDORS[v],
    type,
    tech,
    cells,
    subscribers: Math.round(base * (0.6 + hash(id) * 0.8)),
  };
});

export const SITE_BY_ID: Record<string, Site> = Object.fromEntries(SITES.map((s) => [s.id, s]));
export const HUB_BY_ID = Object.fromEntries(HUBS.map((h) => [h.id, h]));

export const TOTAL_SITES = SITES.length;
export const TOTAL_CELLS = SITES.reduce((n, s) => n + s.cells, 0);

/** First `n` sites in the given areas, ordered by id (deterministic). */
export function sitesIn(areas: string[], n = Infinity, filter?: (s: Site) => boolean): string[] {
  return SITES.filter((s) => areas.includes(s.area) && (!filter || filter(s)))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, n)
    .map((s) => s.id);
}

/** Deterministic spread of `n` sites from the given emirates. */
export function sample(emirates: string[], n: number, salt: string): string[] {
  return SITES.filter((s) => emirates.includes(s.emirate))
    .map((s) => ({ id: s.id, k: hash(s.id + salt) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((s) => s.id);
}

export function subscribersOf(ids: string[], share = 1) {
  return Math.round(ids.reduce((n, id) => n + (SITE_BY_ID[id]?.subscribers ?? 0), 0) * share);
}

export function siteLabel(id: string) {
  const site = SITE_BY_ID[id];
  return site ? `${site.name}` : HUB_BY_ID[id]?.name ?? id;
}
