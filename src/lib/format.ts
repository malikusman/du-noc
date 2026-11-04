export const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
export const num = (value: number) => Math.round(value).toLocaleString("en-US");
export const aed = (value: number) => `AED ${Math.round(value).toLocaleString("en-US")}`;
export const compact = (value: number) => (value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}m` : value >= 10_000 ? `${Math.round(value / 1000)}k` : num(value));
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
