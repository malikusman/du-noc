import { Check, Clock, Minus, X } from "lucide-react";
import { Approvals } from "@/components/Feed";
import { Big, Page } from "@/components/Page";
import { SeverityTag } from "@/components/Status";
import { AGENTS, AUTONOMY } from "@/sim/agents";
import type { IncidentState, StepState } from "@/sim/progress";
import { routineDone } from "@/sim/progress";
import { clock, shiftLead } from "@/sim/time";
import { useSim } from "@/state/sim";
import { cx, num } from "@/lib/format";

type Stage = "done" | "active" | "waiting" | "skipped" | "pending" | "stopped";
const STAGES = ["Detect", "Diagnose", "Plan", "Approve", "Execute", "Verify"] as const;

function stages(s: IncidentState): Stage[] {
  const done = (kinds: string[]) => s.steps.some((x) => x.status === "done" && kinds.includes(x.step.kind));
  const actions = s.steps.filter((x) => x.step.action);
  const needed = actions.some((x) => x.needsApproval || (x.approval && !x.approval.auto) || x.status === "waiting" || x.status === "rejected");
  const waiting = s.steps.some((x) => x.status === "waiting");
  const rejected = s.steps.some((x) => x.status === "rejected");
  const human = s.steps.some((x) => x.approval && !x.approval.auto && x.approval.decision === "approved");
  const detect: Stage = done(["observe", "correlate"]) ? "done" : "pending";
  const diagnose: Stage = done(["hypothesize", "tool"]) ? "done" : detect === "done" ? "active" : "pending";
  const hasPlan = s.incident.steps.some((x) => x.kind === "plan");
  const plan: Stage = done(["plan"]) ? "done" : !hasPlan ? (done(["act"]) ? "skipped" : diagnose === "done" ? "active" : "pending") : diagnose === "done" ? "active" : "pending";
  const approve: Stage = rejected ? "stopped" : waiting ? "waiting" : human ? "done" : needed ? "pending" : "skipped";
  const execute: Stage = done(["act"]) ? "done" : rejected ? "stopped" : plan === "done" || plan === "skipped" ? "active" : "pending";
  const verify: Stage = done(["verify"]) ? "done" : execute === "done" ? "active" : "pending";
  return [detect, diagnose, plan, approve, execute, verify];
}

function how(x: StepState, level: number) {
  if (x.status === "waiting") return { text: level <= 1 ? `Waiting · ${AUTONOMY[level].short} mode` : "Waiting for approval", cls: "text-warn" };
  if (x.status === "rejected") return { text: `Rejected by ${shiftLead(x.at).name}`, cls: "text-bad" };
  if (x.approval && !x.approval.auto) return { text: `Approved by ${shiftLead(x.approval.at).name}`, cls: "text-good" };
  if (x.policyApproved) return { text: "Cleared by policy", cls: "text-info" };
  return { text: "Ran on its own", cls: "text-ink-2" };
}

export default function Remediation() {
  const { state, incidents, openRoom } = useSim();
  const opened = incidents.filter((s) => s.status !== "upcoming");
  const actions = opened.flatMap((s) => s.steps.filter((x) => x.step.action && x.status !== "pending").map((x) => ({ s, x }))).sort((a, b) => b.x.at - a.x.at);
  const routine = routineDone(state.t);
  const auto = actions.filter(({ x }) => x.status === "done" && !(x.approval && !x.approval.auto)).length + routine.length;
  const asked = actions.filter(({ x }) => x.status === "waiting" || x.status === "rejected" || (x.approval && !x.approval.auto)).length;
  const reverted = actions.filter(({ x }) => x.status === "done" && ["g-revert", "w-restore", "x-release"].includes(x.step.id)).length;
  const proven = opened.filter((s) => s.status === "resolved").length;

  return (
    <Page eyebrow="Operations · Autonomous remediation" title="Detect, decide, act, prove"
      intro="Every fix the agents made today, where each incident is in the loop, and who said yes. Reversible changes run on their own inside guardrails; anything costly or customer-facing waits for the shift lead.">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Big label="Actions today" value={num(actions.filter(({ x }) => x.status === "done").length + routine.length)} sub={`${routine.length} small fixes + ${actions.filter(({ x }) => x.status === "done").length} incident actions`} />
        <Big label="Ran on their own" value={num(auto)} tone="grad" sub="Reversible, inside guardrails" />
        <Big label="Asked a person" value={String(asked)} tone={asked ? "warn" : undefined} sub="Field visits, costs, customer contact" />
        <Big label="Proven by KPIs" value={String(proven)} tone="good" sub={`${reverted} temporary changes reverted afterwards`} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-3"><p className="eyebrow">The loop, per incident</p></div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-4">
                <th className="px-5 py-2.5 font-semibold">Incident</th>
                {STAGES.map((st) => <th key={st} className="px-2 py-2.5 text-center font-semibold">{st}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...opened].reverse().map((s) => (
                <tr key={s.incident.id} onClick={() => openRoom(s.incident.id)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-raised">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2"><SeverityTag severity={s.incident.severity} /><span className="font-mono text-[11px] text-ink-4">{clock(s.incident.trigger)}</span></div>
                    <p className="mt-1 font-semibold text-ink">{s.incident.title}</p>
                    <p className="text-[11.5px] text-ink-4">{s.incident.domain} · autonomy {AUTONOMY[state.levels[s.incident.domain]].short}</p>
                  </td>
                  {stages(s).map((st, i) => <td key={i} className="px-2 py-3 text-center"><StageDot stage={st} /></td>)}
                </tr>
              ))}
              {opened.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-4">Nothing yet today.</td></tr>}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-4 border-t border-line px-5 py-3 text-[11.5px] text-ink-4">
            <Legend stage="done" label="Done" /><Legend stage="active" label="In progress" /><Legend stage="waiting" label="Waiting for a person" /><Legend stage="skipped" label="Not needed" /><Legend stage="stopped" label="Stopped by a person" />
          </div>
        </div>
        <div className="card h-fit p-4">
          <p className="eyebrow mb-3">Waiting for the shift lead</p>
          <Approvals />
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-line px-5 py-3"><p className="eyebrow">Every action, newest first</p></div>
        <ul>
          {actions.map(({ s, x }) => {
            const h = how(x, state.levels[s.incident.domain]);
            return (
              <li key={x.step.id} onClick={() => openRoom(s.incident.id)} className="flex cursor-pointer items-start gap-4 border-b border-line/70 px-5 py-3.5 last:border-0 hover:bg-raised">
                <span className="w-11 shrink-0 font-mono text-[12px] text-ink-4">{clock(x.at)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">{x.step.title}</p>
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-ink-3">{x.step.action!.system} · {x.step.action!.command}</p>
                  {x.status === "done" && <p className="mt-1 text-[12px] text-ink-2">{x.step.action!.result}</p>}
                </div>
                <span className={cx("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold", x.step.action!.reversible ? "bg-raised text-ink-3" : "bg-warn/12 text-warn")}>{x.step.action!.reversible ? "Reversible" : x.step.action!.cost ?? "Needs approval"}</span>
                <span className={cx("w-40 shrink-0 text-right text-[12px] font-semibold", h.cls)}>{h.text}</span>
                <span className="w-24 shrink-0 text-right text-[11px] text-ink-4">{AGENTS[x.step.agent].name}</span>
              </li>
            );
          })}
          {actions.length === 0 && <li className="px-5 py-10 text-center text-[13px] text-ink-4">No actions yet.</li>}
        </ul>
      </div>
    </Page>
  );
}

function StageDot({ stage }: { stage: Stage }) {
  const base = "mx-auto flex h-6 w-6 items-center justify-center rounded-full";
  if (stage === "done") return <span className={cx(base, "bg-good/15 text-good")}><Check className="h-3.5 w-3.5" /></span>;
  if (stage === "active") return <span className={cx(base, "grad-bg animate-pulse")} />;
  if (stage === "waiting") return <span className={cx(base, "bg-warn text-black")}><Clock className="h-3.5 w-3.5" /></span>;
  if (stage === "skipped") return <span className={cx(base, "text-ink-4")}><Minus className="h-3.5 w-3.5" /></span>;
  if (stage === "stopped") return <span className={cx(base, "bg-bad/15 text-bad")}><X className="h-3.5 w-3.5" /></span>;
  return <span className={cx(base, "border border-line")} />;
}

function Legend({ stage, label }: { stage: Stage; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="scale-75"><StageDot stage={stage} /></span>{label}</span>;
}

