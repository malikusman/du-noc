import { AGENTS } from "@/sim/agents";
import type { AgentId } from "@/sim/types";
import { cx } from "@/lib/format";

export function AgentAvatar({ id, size = "md", active = false, done = false }: { id: AgentId; size?: "sm" | "md" | "lg"; active?: boolean; done?: boolean }) {
  const agent = AGENTS[id];
  const dims = size === "sm" ? "h-6 w-6 text-[9.5px]" : size === "lg" ? "h-11 w-11 text-[13px]" : "h-8 w-8 text-[11px]";
  return (
    <span
      className={cx(
        "relative isolate inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight",
        dims,
        active ? "grad-bg text-white" : done ? "bg-ink text-bg" : "border border-line bg-raised text-ink-3",
      )}
      title={`${agent.name} · ${agent.role}`}
    >
      {agent.glyph}
      {active && <span className="grad-bg absolute inset-0 -z-10 animate-ping2 rounded-full" />}
    </span>
  );
}

export function Thinking() {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 animate-dots rounded-full bg-current" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}
