import { motion } from "framer-motion";
import { Check, ShieldCheck, TerminalSquare, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { KbChips } from "../KbChips";
import { AgentAvatar } from "../AgentAvatar";
import { AGENTS, AUTONOMY } from "@/sim/agents";
import type { StepState } from "@/sim/progress";
import { clock, shiftLead } from "@/sim/time";
import type { AutonomyLevel, Chip, Hypothesis, PlanOption, StepKind, ToolCall } from "@/sim/types";
import { cx } from "@/lib/format";

export const KIND_LABEL: Record<StepKind, string> = {
  observe: "Noticed",
  correlate: "Correlated",
  hypothesize: "Hypotheses",
  tool: "Tested",
  plan: "Options",
  act: "Acted",
  verify: "Proved",
  learn: "Learned",
};

const TONE: Record<string, string> = {
  good: "bg-good/12 text-good",
  bad: "bg-bad/12 text-bad",
  warn: "bg-warn/12 text-warn",
  neutral: "bg-raised text-ink-2",
};

export function Chips({ chips }: { chips: Chip[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip.label} className={cx("rounded-lg px-2.5 py-1.5 text-[12.5px]", TONE[chip.tone ?? "neutral"])}>
          <span className="opacity-75">{chip.label}</span> <span className="font-bold">{chip.value}</span>
        </span>
      ))}
    </div>
  );
}

function Hypotheses({ items, previous }: { items: Hypothesis[]; previous?: Hypothesis[] }) {
  const top = Math.max(...items.map((h) => h.p));
  return (
    <div className="mt-4 space-y-2.5">
      {items.map((h) => {
        const before = previous?.find((p) => p.id === h.id)?.p ?? 0;
        const lead = h.p === top;
        return (
          <div key={h.id}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className={lead ? "font-semibold text-ink" : "text-ink-3"}>{h.label}</span>
              <span className={cx("font-mono tabular", lead ? "font-bold text-ink" : "text-ink-4")}>{Math.round(h.p * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-raised">
              <motion.div className={cx("h-1.5 rounded-full", lead ? "grad-line" : "bg-ink-4/60")}
                initial={{ width: `${before * 100}%` }} animate={{ width: `${h.p * 100}%` }} transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tools({ tools, fresh }: { tools: ToolCall[]; fresh: boolean }) {
  const lines = tools.reduce((n, t) => n + 1 + t.result.length, 0);
  const [shown, setShown] = useState(fresh ? 0 : lines);
  useEffect(() => {
    if (!fresh) return;
    const timers = Array.from({ length: lines }, (_, i) => window.setTimeout(() => setShown(i + 1), 250 + i * 300));
    return () => timers.forEach(clearTimeout);
  }, [fresh, lines]);
  let index = 0;
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-line bg-[#05070d] p-4 font-mono text-[12px] leading-5 text-white/90">
      {tools.map((tool) => {
        const head = index++;
        return (
          <div key={tool.call}>
            {shown > head && (
              <div className="flex items-start gap-2">
                <TerminalSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[rgb(var(--brand-2))]" />
                <span><span className="rounded bg-white/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">{tool.system}</span> <span className="text-white/60">{tool.call}</span></span>
              </div>
            )}
            {tool.result.map((line) => {
              const i = index++;
              return shown > i ? (
                <motion.div key={line} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="ml-5 flex gap-2 text-white">
                  <span className="text-emerald-400">→</span>{line}
                </motion.div>
              ) : null;
            })}
          </div>
        );
      })}
      {shown < lines && <div className="ml-5 h-4 w-2 animate-pulse bg-white/60" />}
    </div>
  );
}

function Options({ options }: { options: PlanOption[] }) {
  return (
    <div className={cx("mt-4 grid gap-3", options.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
      {options.map((option) => (
        <div key={option.id} className={cx("relative rounded-xl border p-4", option.recommended ? "border-brand bg-brand/[0.06] shadow-[0_0_0_1px_rgb(var(--brand)/0.4)]" : "border-line bg-raised/60")}>
          {option.recommended && <span className="grad-bg absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Chosen</span>}
          <p className={cx("text-[13.5px] font-bold leading-5", option.recommended ? "text-ink" : "text-ink-2")}>{option.title}</p>
          <p className="mt-1 text-[12.5px] leading-5 text-ink-3">{option.summary}</p>
          <dl className="mt-3 space-y-1">
            {option.metrics.map((m) => (
              <div key={m.label} className="flex justify-between gap-2 text-[12px]">
                <dt className="text-ink-4">{m.label}</dt>
                <dd className={cx("font-semibold", m.tone === "good" ? "text-good" : m.tone === "bad" ? "text-bad" : m.tone === "warn" ? "text-warn" : "text-ink-2")}>{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function StepCard({ state, previous, fresh, level, onApprove, onReject }: {
  state: StepState;
  previous?: Hypothesis[];
  fresh: boolean;
  level: AutonomyLevel;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { step, status } = state;
  const agent = AGENTS[step.agent];
  const waiting = status === "waiting";
  const rejected = status === "rejected";
  return (
    <motion.article initial={fresh ? { opacity: 0, y: 14 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="relative pl-14">
      <div className="absolute left-0 top-0"><AgentAvatar id={step.agent} size="lg" done={!waiting} active={waiting} /></div>
      <div className={cx("rounded-2xl border bg-panel p-5", waiting ? "border-warn shadow-[0_12px_40px_rgb(var(--warn)/0.18)]" : rejected ? "border-bad/60" : "border-line")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          <span className="font-bold text-ink">{agent.name}</span>
          <span className="text-ink-4">·</span>
          <span className={cx("font-semibold uppercase tracking-[0.12em]", waiting ? "text-warn" : rejected ? "text-bad" : "text-brand")}>{rejected ? "Rejected" : waiting ? "Needs approval" : KIND_LABEL[step.kind]}</span>
          <span className="ml-auto font-mono text-ink-4 tabular">{clock(state.at)}</span>
        </div>
        <h3 className="mt-2 text-[18px] font-bold leading-6 tracking-tight text-ink">{step.title}</h3>
        {step.body && <p className="mt-2 text-[14px] leading-6 text-ink-2">{step.body}</p>}
        {step.hypotheses && <Hypotheses items={step.hypotheses} previous={previous} />}
        {step.tools && <Tools tools={step.tools} fresh={fresh} />}
        {step.options && <Options options={step.options} />}
        {step.chips && <Chips chips={step.chips} />}
        {step.kb && <KbChips ids={step.kb} />}
        {step.action && (
          <div className="mt-4 rounded-xl border border-line bg-raised p-4">
            <p className="font-mono text-[12px] leading-5 text-ink-2"><span className="mr-2 font-sans text-[10.5px] font-bold uppercase tracking-wider text-ink-4">{step.action.system}</span>{step.action.command}</p>
            {waiting ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-md">
                  <p className="text-[14px] font-bold text-ink">Needs your approval{step.action.cost ? ` · ${step.action.cost}` : ""}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-ink-3">
                    {level <= 1 ? `${AUTONOMY[level].name} mode: agents prepare the action and wait for you.` : step.action.approvalReason} Sent to {shiftLead(state.at).name}, {shiftLead(state.at).role}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onReject} className="btn-line"><X className="h-4 w-4" /> Reject</button>
                  <button type="button" onClick={onApprove} className="btn-primary px-6 text-[15px]"><Zap className="h-4 w-4" /> Approve</button>
                </div>
              </div>
            ) : rejected ? (
              <div className="mt-3 flex items-start gap-2 text-[13.5px] leading-5">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                <div>
                  <p className="text-ink">Rejected by {shiftLead(state.at).name} at {clock(state.at)}. The agents stopped here and handed the incident to the NOC engineers with their full reasoning.</p>
                  <p className="mt-1 text-[12px] text-ink-4">Reversible actions already taken stay in place.</p>
                </div>
              </div>
            ) : status === "done" ? (
              <div className="mt-3 flex items-start gap-2 text-[13.5px] leading-5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <div>
                  <p className="text-ink">{step.action.result}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-4">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {state.approval && !state.approval.auto
                      ? `Approved by ${shiftLead(state.approval.at).name}, ${shiftLead(state.approval.at).role}, at ${clock(state.approval.at)}`
                      : state.policyApproved
                        ? "Cleared by policy in Autonomous mode"
                        : step.action.reversible ? "Ran on its own. Reversible and inside guardrails." : "Approved earlier"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </motion.article>
  );
}
