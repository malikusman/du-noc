import { memo, useEffect, useMemo, useRef, useState } from "react";
import { HUBS, LINKS, MAP } from "@/sim/network";
import { HUB_BY_ID, SITES, SITE_BY_ID, type Site } from "@/sim/sites";
import type { SiteStatus } from "@/sim/types";

type Box = [number, number, number, number];
export type MapRegion = "uae" | "wide" | "dubai" | "north";


function boxAround(pred: (s: Site) => boolean, pad = 12): Box {
  const pts = SITES.filter(pred);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const w = Math.max(x1 - x0, (y1 - y0) * (MAP.width / MAP.height));
  const h = w * (MAP.height / MAP.width);
  return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
}

const REGIONS: Record<MapRegion, Box> = {
  // Extra room on the left and bottom for the Operations overlays.
  uae: (() => {
    const [x, y, w, h] = boxAround((s) => !["Ruwais", "Madinat Zayed", "Liwa", "Ghayathi", "E11 Western Region"].includes(s.area), 24);
    return [x - w * 0.3, y - h * 0.08, w * 1.38, h * 1.38] as Box;
  })(),
  wide: boxAround((s) => !["Liwa", "Ghayathi"].includes(s.area), 20),
  dubai: boxAround((s) => s.emirate === "Dubai" && s.area !== "Hatta", 6),
  north: boxAround((s) => ["Dubai", "Sharjah", "Ajman", "Umm Al Quwain"].includes(s.emirate) && !["Hatta", "Khor Fakkan", "Kalba", "Al Dhaid"].includes(s.area), 10),
};

function focusBox(x: number, y: number, w = 170): Box {
  const h = w * (MAP.height / MAP.width);
  return [x - w * 0.45, y - h / 2, w, h];
}

function useAnimatedBox(target: Box) {
  const [box, setBox] = useState<Box>(target);
  const from = useRef<Box>(target);
  const current = useRef<Box>(target);
  useEffect(() => {
    from.current = current.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 1100);
      const e = 1 - Math.pow(1 - k, 3);
      const next = from.current.map((v, i) => v + (target[i] - v) * e) as Box;
      current.current = next;
      setBox(next);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target[0], target[1], target[2], target[3]]); // eslint-disable-line react-hooks/exhaustive-deps
  return box;
}

const STATUS_COLOR: Record<SiteStatus, string> = {
  ok: "rgb(var(--dot))",
  fixed: "rgb(var(--good))",
  watch: "rgb(var(--info))",
  degraded: "rgb(var(--warn))",
  waiting: "rgb(var(--warn))",
  down: "rgb(var(--bad))",
};
const VENDOR_COLOR: Record<string, string> = { Huawei: "rgb(var(--bad))", Ericsson: "rgb(var(--brand-2))", Nokia: "rgb(var(--brand))" };
const TECH_COLOR: Record<string, string> = { "4G": "rgb(var(--ink-4))", "5G": "rgb(var(--brand-2))", "5G-A": "rgb(var(--brand-3))" };

export interface Callout {
  siteId: string;
  text: string;
  tone: "bad" | "warn" | "good" | "brand";
}

export interface MapProps {
  statuses: Record<string, SiteStatus>;
  links?: [string, string][];
  region?: MapRegion;
  focus?: string | null;
  colorBy?: "status" | "vendor" | "tech";
  onSite?: (site: Site) => void;
  selected?: string | null;
  callouts?: Callout[];
  showTransport?: boolean;
  night?: number;
}

/** Idle network, drawn once. Colours come from CSS variables so a theme switch costs nothing. */
const IdleLayer = memo(function IdleLayer({ k, colorBy }: { k: number; colorBy: MapProps["colorBy"] }) {
  const r = 1.05 * Math.max(k, 0.18);
  return (
    <g>
      {SITES.map((s) => (
        <circle key={s.id} cx={s.x} cy={s.y} r={r} fill={colorBy === "vendor" ? VENDOR_COLOR[s.vendor] : colorBy === "tech" ? TECH_COLOR[s.tech] : "rgb(var(--dot))"} fillOpacity={colorBy === "status" ? 0.5 : 0.75} />
      ))}
    </g>
  );
});

export const NetworkMap = memo(function NetworkMap({ statuses, links = [], region = "uae", focus, colorBy = "status", onSite, selected, callouts = [], showTransport = true, night = 1 }: MapProps) {
  const focusPoint = focus ? SITE_BY_ID[focus] ?? HUB_BY_ID[focus] : undefined;
  const target = focusPoint ? focusBox(focusPoint.x, focusPoint.y) : REGIONS[region];
  const box = useAnimatedBox(target);
  const k = box[2] / MAP.width;
  const kq = Math.round(k * 20) / 20;
  const down = useMemo(() => new Set(links.map(([a, b]) => [a, b].sort().join("|"))), [links]);
  const active = useMemo(() => Object.entries(statuses).filter(([, s]) => s !== "ok"), [statuses]);

  return (
    <svg viewBox={box.join(" ")} className="h-full w-full select-none" preserveAspectRatio="xMidYMid meet" style={{ background: "rgb(var(--sea))" }}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
        </radialGradient>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgb(var(--land-line))" strokeOpacity="0.25" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect x={-500} y={-400} width={MAP.width + 1000} height={MAP.height + 800} fill="url(#grid)" />
      {MAP.neighbours.map((d, i) => <path key={i} d={d} fill="rgb(var(--neighbour))" stroke="rgb(var(--land-line))" strokeWidth={0.5 * k} />)}
      <path d={MAP.uae} fill="rgb(var(--land))" stroke="rgb(var(--land-line))" strokeWidth={0.9 * k} />
      <ellipse cx={600} cy={330} rx={320} ry={220} fill="url(#glow)" opacity={0.5 + 0.5 * night} pointerEvents="none" />
      {MAP.labels.map((label) => (
        <text key={label.name} x={label.x + 10 * k} y={label.y + 14 * k} fontSize={10.5 * k} fill="rgb(var(--ink-3))" stroke="rgb(var(--sea))" strokeWidth={3 * k} strokeOpacity={0.85} paintOrder="stroke" fontWeight={700} letterSpacing={0.8 * k} style={{ textTransform: "uppercase" }}>{label.name}</text>
      ))}

      {showTransport && (
        <g>
          {LINKS.map(([a, b]) => {
            const A = HUB_BY_ID[a], B = HUB_BY_ID[b];
            const isDown = down.has([a, b].sort().join("|"));
            return (
              <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke={isDown ? "rgb(var(--bad))" : "rgb(var(--brand))"} strokeOpacity={isDown ? 0.95 : 0.28}
                strokeWidth={(isDown ? 2.2 : 0.9) * k} strokeDasharray={isDown ? `${3 * k} ${2.5 * k}` : undefined}>
                {isDown && <animate attributeName="stroke-dashoffset" from="0" to={-11 * k} dur="0.8s" repeatCount="indefinite" />}
              </line>
            );
          })}
          {HUBS.map((h) => (
            <rect key={h.id} x={h.x - 2.2 * k} y={h.y - 2.2 * k} width={4.4 * k} height={4.4 * k} rx={h.kind === "core" ? 0.6 * k : 2.2 * k}
              fill={h.kind === "core" ? "rgb(var(--brand))" : h.kind === "landing" ? "rgb(var(--brand-2))" : "rgb(var(--panel))"}
              stroke="rgb(var(--brand))" strokeOpacity={0.8} strokeWidth={0.6 * k} transform={h.kind === "core" ? undefined : `rotate(45 ${h.x} ${h.y})`} />
          ))}
        </g>
      )}

      <IdleLayer k={kq} colorBy={colorBy} />

      {colorBy === "status" && active.map(([id, status]) => {
        const s = SITE_BY_ID[id];
        if (!s) return null;
        const r = (status === "down" ? 2.2 : status === "fixed" ? 1.7 : 2) * Math.max(k, 0.2);
        const ring = status === "down" || status === "waiting" || status === "degraded";
        return (
          <g key={id} transform={`translate(${s.x} ${s.y})`}>
            {ring && (
              <circle r={r} fill={STATUS_COLOR[status]} opacity={0.5}>
                <animate attributeName="r" from={r} to={r * 4} dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.45" to="0" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r={r} fill={STATUS_COLOR[status]} />
          </g>
        );
      })}

      {selected && SITE_BY_ID[selected] && (
        <circle cx={SITE_BY_ID[selected].x} cy={SITE_BY_ID[selected].y} r={6 * Math.max(k, 0.2)} fill="none" stroke="rgb(var(--ink))" strokeWidth={1.2 * k} />
      )}

      {onSite && (
        <g>
          {SITES.map((s) => (
            <circle key={s.id} cx={s.x} cy={s.y} r={3 * Math.max(k, 0.2)} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSite(s)} />
          ))}
        </g>
      )}

      {callouts.map((c) => {
        const p = SITE_BY_ID[c.siteId] ?? HUB_BY_ID[c.siteId];
        if (!p) return null;
        const fs = 10.5 * k;
        const w = c.text.length * fs * 0.56 + 14 * k;
        const h = fs + 10 * k;
        const x = p.x + 9 * k;
        const y = p.y - h - 6 * k;
        const fill = { bad: "rgb(var(--bad))", warn: "rgb(var(--warn))", good: "rgb(var(--good))", brand: "rgb(var(--brand))" }[c.tone];
        return (
          <g key={c.siteId + c.text} pointerEvents="none">
            <line x1={p.x} y1={p.y} x2={x + 4 * k} y2={y + h} stroke={fill} strokeWidth={0.9 * k} />
            <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />
            <text x={x + 7 * k} y={y + h / 2 + fs * 0.36} fontSize={fs} fontWeight={700} fill={c.tone === "warn" ? "#111" : "#fff"}>{c.text}</text>
          </g>
        );
      })}
    </svg>
  );
});
