// Regenerates src/sim/network.ts: the UAE outline plus the simulated du radio, transport and core network.
// Run: npm run generate:network
// Everything here is simulated. Site counts, vendor regions and names are illustrative, not du's real inventory.
import fs from "fs";
import { feature } from "topojson-client";
import { geoMercator, geoPath, geoContains } from "d3-geo";

const out = process.argv[2] ?? "src/sim/network.ts";
const topo = JSON.parse(fs.readFileSync(new URL("../node_modules/world-atlas/countries-10m.json", import.meta.url)));
const countries = feature(topo, topo.objects.countries).features;
const byName = (n) => countries.find((c) => c.properties.name === n);
const uae = byName("United Arab Emirates");
const neighbours = ["Oman", "Saudi Arabia", "Qatar", "Iran"].map(byName).filter(Boolean);

const W = 1000, H = 720;
const bbox = { type: "MultiPoint", coordinates: [[51.45, 22.55], [56.65, 22.55], [56.65, 26.35], [51.45, 26.35]] };
const proj = geoMercator().fitExtent([[0, 0], [W, H]], bbox);
const path = geoPath(proj);
const cpath = geoPath(geoMercator().fitExtent([[0, 0], [W, H]], bbox).clipExtent([[-500, -400], [W + 500, H + 400]]));
const round = (d) => d.replace(/(\d+\.\d{1})\d+/g, "$1");
const xy = (lat, lon) => proj([lon, lat]).map((v) => Math.round(v * 10) / 10);

let seed = 20261015;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const onLand = (lon, lat) => geoContains(uae, [lon, lat]);
function place(lat, lon, rKm) {
  for (let i = 0; i < 500; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * rKm;
    const la = lat + (r * Math.sin(a)) / 111, lo = lon + (r * Math.cos(a)) / (111 * Math.cos((lat * Math.PI) / 180));
    if (onLand(lo, la)) return [la, lo];
  }
  for (let k = 0; k < 80; k++) { const la = lat - k * 0.003, lo = lon + k * 0.003; if (onLand(lo, la)) return [la, lo]; }
  return [lat, lon];
}

// Vendor regions are simulated for the demo.
const vendorFor = (emirate, area) => {
  if (emirate === "Dubai" && ["Trade Centre", "DIFC"].includes(area)) return "Nokia";
  if (emirate === "Dubai") return ["Deira", "Bur Dubai", "Al Qusais", "Mirdif", "Al Warqa", "Karama", "Festival City", "Silicon Oasis", "Hatta"].includes(area) ? "Huawei" : "Ericsson";
  if (emirate === "Abu Dhabi") return area === "Al Ain" ? "Ericsson" : "Huawei";
  return "Nokia";
};

// emirate, area, code, lat, lon, radius km, count, hotspot share (5G-A)
const AREAS = [
  ["Dubai", "Downtown", "DTN", 25.195, 55.276, 1.6, 70, 0.6],
  ["Dubai", "Business Bay", "BBY", 25.186, 55.262, 1.5, 55, 0.5],
  ["Dubai", "Trade Centre", "DWT", 25.222, 55.285, 1.2, 42, 0.7],
  ["Dubai", "DIFC", "DIF", 25.212, 55.281, 0.8, 30, 0.7],
  ["Dubai", "Dubai Marina", "MAR", 25.082, 55.145, 1.3, 75, 0.5],
  ["Dubai", "JLT", "JLT", 25.07, 55.15, 1.0, 40, 0.4],
  ["Dubai", "Al Barsha", "BAR", 25.11, 55.2, 2.2, 70, 0.3],
  ["Dubai", "Dubai Hills", "DHL", 25.105, 55.245, 2, 40, 0.3],
  ["Dubai", "Al Quoz", "QOZ", 25.14, 55.23, 2.4, 45, 0.15],
  ["Dubai", "Jumeirah", "JUM", 25.2, 55.245, 2, 55, 0.3],
  ["Dubai", "Palm Jumeirah", "PLM", 25.115, 55.135, 1.6, 35, 0.4],
  ["Dubai", "Deira", "DEI", 25.268, 55.318, 2.2, 90, 0.3],
  ["Dubai", "Bur Dubai", "BUR", 25.25, 55.295, 1.5, 65, 0.3],
  ["Dubai", "Karama", "KAR", 25.237, 55.305, 1, 35, 0.2],
  ["Dubai", "Al Qusais", "QUS", 25.285, 55.38, 2.2, 55, 0.2],
  ["Dubai", "Mirdif", "MRD", 25.22, 55.42, 2, 45, 0.2],
  ["Dubai", "Silicon Oasis", "DSO", 25.12, 55.38, 2, 35, 0.3],
  ["Dubai", "Al Warqa", "WRQ", 25.19, 55.41, 1.6, 30, 0.1],
  ["Dubai", "Festival City", "DFC", 25.225, 55.355, 1.2, 25, 0.4],
  ["Dubai", "JVC", "JVC", 25.058, 55.21, 1.6, 45, 0.2],
  ["Dubai", "Arabian Ranches", "ARR", 25.045, 55.255, 2.2, 30, 0.1],
  ["Dubai", "Dubai Investments Park", "DIP", 25.0, 55.165, 3, 34, 0.1],
  ["Dubai", "Jebel Ali", "JBA", 25.01, 55.09, 3.5, 38, 0.1],
  ["Dubai", "Dubai South", "DSH", 24.9, 55.16, 5, 30, 0.2],
  ["Dubai", "Airport", "DXB", 25.253, 55.365, 1.5, 30, 0.7],
  ["Dubai", "Hatta", "HTA", 24.8, 56.12, 3, 14, 0],
  ["Abu Dhabi", "Abu Dhabi City", "AUH", 24.487, 54.365, 2.6, 140, 0.4],
  ["Abu Dhabi", "Corniche", "CRN", 24.47, 54.34, 1.6, 40, 0.4],
  ["Abu Dhabi", "Al Reem Island", "REM", 24.498, 54.405, 1.3, 45, 0.4],
  ["Abu Dhabi", "Saadiyat", "SAD", 24.54, 54.43, 2, 25, 0.3],
  ["Abu Dhabi", "Yas Island", "YAS", 24.49, 54.6, 2.5, 35, 0.5],
  ["Abu Dhabi", "Khalifa City", "KHC", 24.42, 54.57, 3, 55, 0.2],
  ["Abu Dhabi", "Mussafah", "MUS", 24.35, 54.5, 4, 60, 0.1],
  ["Abu Dhabi", "Mohammed Bin Zayed City", "MBZ", 24.33, 54.55, 3, 45, 0.1],
  ["Abu Dhabi", "Al Shamkha", "SHK", 24.39, 54.71, 3, 25, 0.05],
  ["Abu Dhabi", "Al Ain", "ALN", 24.215, 55.745, 5, 120, 0.15],
  ["Abu Dhabi", "Ruwais", "RWS", 24.11, 52.73, 4, 22, 0],
  ["Abu Dhabi", "Madinat Zayed", "MZY", 23.68, 53.71, 4, 14, 0],
  ["Abu Dhabi", "Liwa", "LIW", 23.13, 53.77, 8, 16, 0],
  ["Abu Dhabi", "Ghayathi", "GHY", 23.84, 52.81, 4, 8, 0],
  ["Sharjah", "Al Majaz", "MAJ", 25.325, 55.39, 1.5, 55, 0.3],
  ["Sharjah", "Al Nahda", "NHD", 25.3, 55.375, 1.4, 50, 0.2],
  ["Sharjah", "Al Qasimia", "QSM", 25.34, 55.405, 1.4, 40, 0.2],
  ["Sharjah", "Muwaileh", "MWL", 25.29, 55.46, 2.5, 50, 0.15],
  ["Sharjah", "Al Khan", "KHN", 25.32, 55.36, 1, 25, 0.2],
  ["Sharjah", "Sharjah Industrial", "SIN", 25.31, 55.42, 2.5, 40, 0.05],
  ["Sharjah", "Aljada", "ALJ", 25.3, 55.48, 1.5, 22, 0.3],
  ["Sharjah", "Al Dhaid", "DHD", 25.29, 55.88, 3, 10, 0],
  ["Sharjah", "Khor Fakkan", "KFK", 25.34, 56.35, 2, 16, 0],
  ["Sharjah", "Kalba", "KLB", 25.07, 56.35, 2, 14, 0],
  ["Ajman", "Ajman", "AJM", 25.405, 55.47, 2.4, 70, 0.15],
  ["Umm Al Quwain", "Umm Al Quwain", "UAQ", 25.52, 55.65, 4, 30, 0.05],
  ["Ras Al Khaimah", "Ras Al Khaimah", "RAK", 25.78, 55.96, 4, 70, 0.1],
  ["Ras Al Khaimah", "Al Marjan Island", "MRJ", 25.67, 55.74, 1.5, 16, 0.3],
  ["Fujairah", "Fujairah", "FUJ", 25.13, 56.33, 3, 45, 0.05],
  ["Fujairah", "Dibba", "DIB", 25.6, 56.26, 2, 14, 0],
];
// Highways and desert corridors.
const CORRIDORS = [
  ["Abu Dhabi", "E11 Ghantoot", "E11", [[24.83, 54.9], [24.45, 54.5]], 30],
  ["Dubai", "E311 Corridor", "E31", [[25.3, 55.45], [25.05, 55.25]], 18],
  ["Abu Dhabi", "E22 Al Ain Road", "E22", [[24.35, 54.75], [24.22, 55.6]], 26],
  ["Dubai", "E44 Hatta Road", "E44", [[25.15, 55.5], [24.82, 56.05]], 16],
  ["Abu Dhabi", "E11 Western Region", "E1W", [[24.25, 54.2], [24.1, 52.8]], 22],
  ["Ras Al Khaimah", "E611 Corridor", "E61", [[25.3, 55.6], [25.65, 55.85]], 16],
];

const TYPES_HOT = ["Macro", "Rooftop", "Small cell", "Indoor"];
const TYPES_CITY = ["Macro", "Macro", "Rooftop", "Rooftop", "Small cell"];
const sites = [];
const counters = {};
const add = (s) => sites.push(s);

for (const [emirate, area, code, lat, lon, r, n, hot] of AREAS) {
  for (let i = 0; i < n; i++) {
    const [la, lo] = place(lat, lon, r);
    const [x, y] = xy(la, lo);
    counters[code] = (counters[code] ?? 0) + 1;
    const hotspot = rnd() < hot;
    const type = hotspot ? pick(TYPES_HOT) : r > 3 ? "Macro" : pick(TYPES_CITY);
    const tech = hotspot ? "5G-A" : hot > 0 || rnd() < 0.7 ? "5G" : "4G";
    add({ id: `${code}-${String(counters[code]).padStart(3, "0")}`, x, y, emirate, area, vendor: vendorFor(emirate, area), type, tech });
  }
}
for (const [emirate, area, code, [[a1, o1], [a2, o2]], n] of CORRIDORS) {
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const [la, lo] = place(a1 + (a2 - a1) * k, o1 + (o2 - o1) * k, 1.2);
    const [x, y] = xy(la, lo);
    counters[code] = (counters[code] ?? 0) + 1;
    add({ id: `${code}-${String(counters[code]).padStart(3, "0")}`, x, y, emirate, area, vendor: vendorFor(emirate, area), type: "Macro", tech: rnd() < 0.6 ? "5G" : "4G" });
  }
}

// Named sites the story uses. IDs are stable so incidents can refer to them.
const NAMED = [
  ["DWT-H01", "Dubai World Trade Centre · Halls 1–8 indoor", 25.2235, 55.2866, "Dubai", "Trade Centre", "Nokia", "Indoor", "5G-A"],
  ["DWT-H02", "Dubai World Trade Centre · Za'abeel Halls indoor", 25.2205, 55.2878, "Dubai", "Trade Centre", "Nokia", "Indoor", "5G-A"],
  ["DWT-M03", "Trade Centre roundabout macro", 25.2265, 55.2848, "Dubai", "Trade Centre", "Nokia", "Macro", "5G-A"],
  ["DML-I07", "The Dubai Mall · Fashion Avenue indoor", 25.1985, 55.2796, "Dubai", "Downtown", "Huawei", "Indoor", "5G-A"],
  ["DIF-R03", "DIFC Gate Village rooftop", 25.2135, 55.2818, "Dubai", "DIFC", "Nokia", "Rooftop", "5G-A"],
  ["CRN-MW1", "Corniche microwave hub", 24.4705, 54.3396, "Abu Dhabi", "Corniche", "Huawei", "Macro", "5G"],
  ["MAJ-C01", "Al Majaz waterfront macro", 25.3262, 55.3878, "Sharjah", "Al Majaz", "Nokia", "Macro", "5G"],
  ["HTA-D01", "Hatta Dam macro", 24.795, 56.125, "Dubai", "Hatta", "Huawei", "Macro", "4G"],
  ["ALN-H02", "Tawam Hospital macro", 24.247, 55.716, "Abu Dhabi", "Al Ain", "Ericsson", "Macro", "5G"],
];
for (const [id, name, la, lo, emirate, area, vendor, type, tech] of NAMED) {
  const [x, y] = xy(la, lo);
  add({ id, name, x, y, emirate, area, vendor, type, tech });
}

// Transport and core (simulated topology).
const HUBS = [
  ["H-JBA", "Jebel Ali aggregation", 25.0, 55.11, "agg"],
  ["H-DSH", "Dubai South aggregation", 24.9, 55.17, "agg"],
  ["H-BAR", "Al Barsha aggregation", 25.11, 55.2, "agg"],
  ["H-DTN", "Downtown aggregation", 25.2, 55.28, "agg"],
  ["H-DEI", "Deira aggregation", 25.27, 55.32, "agg"],
  ["H-DSO", "Silicon Oasis aggregation", 25.12, 55.38, "agg"],
  ["C-DXB", "Dubai core data centre", 25.285, 55.385, "core"],
  ["H-AUH", "Abu Dhabi city aggregation", 24.48, 54.37, "agg"],
  ["H-MUS", "Mussafah aggregation", 24.35, 54.5, "agg"],
  ["H-YAS", "Yas aggregation", 24.49, 54.6, "agg"],
  ["C-AUH", "Abu Dhabi core data centre", 24.43, 54.47, "core"],
  ["H-ALN", "Al Ain aggregation", 24.21, 55.74, "agg"],
  ["H-SHJ", "Sharjah aggregation", 25.33, 55.4, "agg"],
  ["H-AJM", "Ajman aggregation", 25.41, 55.47, "agg"],
  ["H-RAK", "Ras Al Khaimah aggregation", 25.78, 55.95, "agg"],
  ["H-FUJ", "Fujairah aggregation", 25.13, 56.33, "agg"],
  ["L-FUJ", "Fujairah cable landing", 25.17, 56.36, "landing"],
  ["H-HTA", "Hatta aggregation", 24.8, 56.12, "agg"],
  ["H-GHN", "Ghantoot aggregation", 24.84, 54.9, "agg"],
];
const LINKS = [
  ["H-JBA", "H-DSH"], ["H-DSH", "H-DSO"], ["H-DSO", "C-DXB"], ["C-DXB", "H-DEI"], ["H-DEI", "H-DTN"], ["H-DTN", "H-BAR"], ["H-BAR", "H-JBA"],
  ["H-DTN", "H-DSO"],
  ["H-AUH", "C-AUH"], ["C-AUH", "H-YAS"], ["H-YAS", "H-MUS"], ["H-MUS", "H-AUH"],
  ["H-JBA", "H-GHN"], ["H-GHN", "H-YAS"], ["H-DSH", "H-MUS"],
  ["H-DSO", "H-ALN"], ["H-ALN", "C-AUH"],
  ["C-DXB", "H-SHJ"], ["H-SHJ", "H-AJM"], ["H-AJM", "H-RAK"], ["H-RAK", "H-FUJ"], ["H-FUJ", "L-FUJ"],
  ["H-DSO", "H-HTA"], ["H-HTA", "H-FUJ"], ["H-SHJ", "H-FUJ"],
];
const hubs = HUBS.map(([id, name, la, lo, kind]) => { const [x, y] = xy(la, lo); return { id, name, x, y, kind }; });

const LABELS = [
  ["Dubai", 25.2, 55.27], ["Abu Dhabi", 24.47, 54.37], ["Sharjah", 25.35, 55.42], ["Ajman", 25.41, 55.5], ["Umm Al Quwain", 25.55, 55.62],
  ["Ras Al Khaimah", 25.8, 55.97], ["Fujairah", 25.12, 56.34], ["Al Ain", 24.2, 55.76], ["Ruwais", 24.1, 52.73], ["Liwa", 23.12, 53.77],
].map(([name, la, lo]) => { const [x, y] = xy(la, lo); return { name, x, y }; });

const map = { width: W, height: H, uae: round(path(uae)), neighbours: neighbours.map((n) => round(cpath(n))).filter(Boolean), labels: LABELS };

const V = { Huawei: 0, Ericsson: 1, Nokia: 2 };
const T = { Macro: 0, Rooftop: 1, "Small cell": 2, Indoor: 3 };
const G = { "4G": 0, "5G": 1, "5G-A": 2 };
const E = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];
const areaList = [...new Set(sites.map((s) => s.area))];
const rows = sites.map((s) => [s.id, s.x, s.y, E.indexOf(s.emirate), areaList.indexOf(s.area), V[s.vendor], T[s.type], G[s.tech], s.name ?? ""]);

const ts = `// Generated by scripts/generate-network.mjs. Do not edit by hand.
// Simulated network: counts, names, vendor regions and topology are illustrative.
export const MAP = ${JSON.stringify(map)} as const;
export const EMIRATES = ${JSON.stringify(E)} as const;
export const AREAS: string[] = ${JSON.stringify(areaList)};
export const HUBS: { id: string; name: string; x: number; y: number; kind: "agg" | "core" | "landing" }[] = ${JSON.stringify(hubs)};
export const LINKS: [string, string][] = ${JSON.stringify(LINKS)};
export const SITE_ROWS: [string, number, number, number, number, number, number, number, string][] = ${JSON.stringify(rows)};
`;
fs.writeFileSync(out, ts);
console.log(`wrote ${out}: ${sites.length} sites, ${hubs.length} hubs, ${LINKS.length} links, ${(ts.length / 1024).toFixed(0)} KB`);
