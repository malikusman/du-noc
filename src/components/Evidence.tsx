import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Evidence } from "@/sim/types";
import { token } from "@/state/theme";

const TONE: Record<string, string> = { brand: "brand", muted: "ink-4", good: "good", bad: "bad", warn: "warn", info: "info" };

export function EvidenceChart({ evidence, height = 220 }: { evidence: Evidence; height?: number }) {
  const data = evidence.labels.map((label, i) => {
    const row: Record<string, number | string | null> = { label };
    evidence.series.forEach((s) => (row[s.name] = s.values[i] ?? null));
    return row;
  });
  const markerLabel = evidence.marker ? evidence.labels[evidence.marker.index] : undefined;
  return (
    <div>
      <p className="text-[15px] font-semibold leading-5 text-ink">{evidence.title}</p>
      <p className="mt-1 text-[12.5px] leading-5 text-ink-3">{evidence.caption}</p>
      <div className="mt-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {evidence.kind === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(3)} />
              <YAxis tickLine={false} axisLine={false} width={46} />
              <Tooltip cursor={{ fill: token("ink-4", 0.1) }} />
              {evidence.series.map((s) => <Bar key={s.name} dataKey={s.name} fill={token(TONE[s.tone])} radius={[4, 4, 0, 0]} isAnimationActive />)}
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={46} domain={evidence.domain ?? ["auto", "auto"]} />
              <Tooltip />
              {evidence.threshold && (
                <ReferenceLine y={evidence.threshold.value} stroke={token("bad", 0.7)} strokeDasharray="4 4" label={{ value: evidence.threshold.label, position: "insideTopRight", fill: token("bad"), fontSize: 11 }} />
              )}
              {markerLabel && (
                <ReferenceLine x={markerLabel} stroke={token("ink-3", 0.6)} strokeDasharray="3 3" label={{ value: evidence.marker!.label, position: "insideTopLeft", fill: token("ink-3"), fontSize: 11 }} />
              )}
              {evidence.series.map((s) => (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={token(TONE[s.tone])} strokeWidth={s.tone === "muted" ? 1.6 : 2.6} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} connectNulls={false} isAnimationActive />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {evidence.series.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
          {evidence.series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: token(TONE[s.tone]) }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
