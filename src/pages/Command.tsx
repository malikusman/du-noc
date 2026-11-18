import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CornerDownLeft, Hand, Phone, Plus, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useFeed } from "@/components/Feed";
import { SeverityTag } from "@/components/Status";
import { AUTONOMY, DOMAINS } from "@/sim/agents";
import { AED_PER_SUB_DAY, INCIDENT_BY_ID, aedProtected } from "@/sim/incidents";
import { PREDICTIONS } from "@/sim/insight";
import { domainHealth, evaluateIntents, parseIntent, type IntentStatus, type ParsedIntent } from "@/sim/intents";
import { routineDone, type IncidentState } from "@/sim/progress";
import { ROUTINE } from "@/sim/routine";
import { at, clock, duration, shiftLead } from "@/sim/time";
import type { Domain } from "@/sim/types";
import { useEscalation } from "@/state/escalation";
import { useSim } from "@/state/sim";
import { aed, compact, cx } from "@/lib/format";

/** du's daily revenue: Q3 2026 revenue (AED 4,145m) over 92 days. */
const DAILY_REVENUE = 4145e6 / 92;

const STATUS_STYLE: Record<IntentStatus, string> = {
  met: "bg-good/12 text-good",
  "at-risk": "bg-warn/15 text-warn",
  breached: "bg-bad/15 text-bad",
  watching: "bg-info/12 text-info",
};
const STATUS_WORD: Record<IntentStatus, string> = { met: "Met", "at-risk": "At risk", breached: "Breached", watching: "Watching" };

const SUGGESTIONS = ["Keep enterprise uplink above 50 Mbps", "Restore any hospital site within 15 minutes", "Keep 5G+ latency under 20 ms at Etihad Arena"];

interface CustomIntent extends ParsedIntent {
  id: string;
  addedAt: number;
}

export default function Command() {
  const { state, incidents, kpi, approve, reject, openRoom } = useSim();
  const { escalations } = useEscalation();
  const feed = useFeed(7);
  const byId = useMemo(() => Object.fromEntries(incidents.map((s) => [s.incident.id, s])), [incidents]);
  const intents = useMemo(() => evaluateIntents({ t: state.t, availability: kpi.availability, incidents: byId }), [state.t, kpi.availability, byId]);
  const [custom, setCustom] = useState<CustomIntent[]>([]);
  const [draft, setDraft] = useState("");
  const [signoff, setSignoff] = useState<Record<string, "approved" | "held">>({});

  /* ── headline numbers ── */
  const routine = routineDone(state.t);
  const humanSteps = incidents.flatMap((s) => s.steps.filter((x) => x.step.action && (x.status === "waiting" || x.status === "rejected" || (x.approval && !x.approval.auto))));
  const autoSteps = incidents.reduce((n, s) => n + s.steps.filter((x) => x.step.action && x.status === "done" && !(x.approval && !x.approval.auto)).length, 0);
  const autoShare = autoSteps + routine.length ? (autoSteps + routine.length) / (autoSteps + routine.length + humanSteps.length) : 1;
  const repairs = [...routine.map((r) => r.durationMin), ...incidents.filter((s) => s.closedAt).map((s) => s.closedAt! - s.incident.trigger)];
  const mttr = repairs.length ? repairs.reduce((a, b) => a + b, 0) / repairs.length : 0;
  const metCount = intents.filter((i) => i.status === "met").length;
  const lostAed = useMemo(() => lostRevenue(incidents, state.t), [incidents, state.t]);
  const leakage = state.t > 0 ? lostAed / (DAILY_REVENUE * (state.t / 1440)) : 0;
  const waitingSteps = incidents.flatMap((s) => s.steps.filter((x) => x.status === "waiting").map((x) => ({ s, x })));
  const oldestWait = waitingSteps.length ? Math.max(...waitingSteps.map(({ x }) => state.t - x.at)) : 0;
  const levels = DOMAINS.map((d) => state.levels[d]);
  const common = levels.sort((a, b) => levels.filter((v) => v === b).length - levels.filter((v) => v === a).length)[0];
  const sameLevel = DOMAINS.filter((d) => state.levels[d] === common).length;

  /* ── decisions for an executive ── */
  const recs = [
    ...PREDICTIONS.filter((p) => p.status === "Needs approval" && p.from <= state.t).map((p) => ({ id: p.id, title: p.action, sub: `${p.place} · risk ${p.risk} · confidence ${p.confidence}%`, kind: "Investment" })),
    ...(state.t >= at("10:08") ? [{ id: "canary", title: "Make a 2-cell canary standard for parameter pushes over 10 cells", sub: `Learned from ${INCIDENT_BY_ID.rollback.number} · confidence 94%`, kind: "Policy" }] : []),
  ];

  const resolved = incidents.filter((s) => s.status === "resolved");
  const protectedAed = resolved.reduce((n, s) => n + aedProtected(s.incident), 0);
  const subHours = resolved.reduce((n, s) => n + (s.incident.impact.subscribers * s.incident.impact.minutesAvoided) / 60, 0);
  const visits = ROUTINE.filter((r) => r.visitAvoided && r.t + r.durationMin <= state.t).length + resolved.reduce((n, s) => n + s.incident.impact.visitsAvoided, 0);
  const tickets = resolved.reduce((n, s) => n + s.incident.impact.ticketsAvoided, 0) + routine.length;

  const addIntent = (text: string) => {
    const parsed = parseIntent(text);
    if (!parsed) return;
    setCustom((c) => [{ ...parsed, id: `c-${Date.now()}`, addedAt: state.t }, ...c]);
    setDraft("");
  };

  return (
    <main className="mx-auto w-full max-w-[1480px] flex-1 px-8 pb-16 pt-8">
      <div className="mb-6 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Admin · Executive command center</p>
          <h1 className="mt-2 text-[32px] font-extrabold leading-9 tracking-tight text-ink">Autonomous operations center</h1>
          <p className="mt-2 max-w-3xl text-[14.5px] leading-6 text-ink-3">The whole NOC on one screen, for the people who set its goals: are the business intents being met, what did the agents do on their own, and which decisions need you.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="grad-bg rounded-full px-3 py-1 text-[12px] font-semibold text-white">Autonomy · TM Forum {AUTONOMY[common].tmf}</span>
          <span className="text-[11.5px] text-ink-4">{AUTONOMY[common].name} in {sameLevel} of {DOMAINS.length} domains · <Link to="/settings" className="text-brand hover:underline">change</Link></span>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-5 gap-4">
        <Tile label="Auto-resolved" value={`${Math.round(autoShare * 100)}%`} sub={`${autoSteps + routine.length} actions without a person`} tone="grad" />
        <Tile label="Mean time to repair" value={duration(mttr)} sub={`across ${repairs.length} faults fixed today`} />
        <Tile label="Intents met" value={`${metCount} of ${intents.length}`} sub={metCount === intents.length ? "Every business outcome on target" : `${intents.length - metCount} need attention`} tone={metCount === intents.length ? "good" : "warn"} />
        <Tile label="Revenue leakage" value={`${(leakage * 100).toFixed(3)}%`} sub={`${aed(lostAed)} lost so far today`} tone={leakage < 0.001 ? "good" : "warn"} />
        <Tile label="Decisions waiting" value={String(waitingSteps.length + recs.filter((r) => !signoff[r.id]).length)} sub={waitingSteps.length ? `oldest ${duration(oldestWait)}` : "Nothing urgent"} tone={waitingSteps.length ? "warn" : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* Business intents */}
        <section className="card col-span-7 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink"><Target className="h-4 w-4 text-brand" /> Business intents</p>
            <span className="text-[11.5px] text-ink-4">Outcomes the agents hold the network to</span>
          </div>
          <ul className="mt-3 divide-y divide-line/70">
            <AnimatePresence initial={false}>
              {custom.map((c) => (
                <motion.li key={c.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink">{c.title}</p>
                      <p className="text-[12px] text-ink-4">{c.scope} · added {clock(c.addedAt)}</p>
                    </div>
                    <span className={cx("shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold", STATUS_STYLE.watching)}>Watching</span>
                  </div>
                  <div className="mt-2 rounded-xl border border-brand/30 bg-brand/[0.05] p-3 text-[12px] leading-5">
                    <p className="flex items-center gap-1.5 font-semibold text-ink-2"><AgentAvatar id="planner" size="sm" done /> The Planner translated it into</p>
                    <dl className="mt-2 grid grid-cols-4 gap-2">
                      <Kv k="Metric" v={c.metric} />
                      <Kv k="Target" v={c.target} />
                      <Kv k="Scope" v={c.scope} />
                      <Kv k="Domain" v={c.domain} />
                    </dl>
                    <p className="mt-2 text-ink-3">{c.guardrail}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            {intents.map((i) => (
              <li key={i.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{i.title}</p>
                  <p className="text-[12px] text-ink-4">{i.scope} · target {i.target}{i.exposed ? <> · <span className="text-ink-3">{i.exposed}</span></> : null}</p>
                </div>
                {i.incident && byId[i.incident]?.status !== "upcoming" && (
                  <button type="button" onClick={() => openRoom(i.incident!)} className="shrink-0 font-mono text-[10.5px] text-ink-4 hover:text-brand">{INCIDENT_BY_ID[i.incident].number}</button>
                )}
                <span className={cx("shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold", STATUS_STYLE[i.status])}>{STATUS_WORD[i.status]}, {i.current}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); addIntent(draft); }} className="mt-3 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Say what the network should achieve, e.g. keep enterprise uplink above 50 Mbps"
              className="h-10 flex-1 rounded-xl border border-line bg-raised px-3 text-[13.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
            <button type="submit" disabled={!parseIntent(draft)} className="btn-primary h-10 px-4 disabled:opacity-40"><Plus className="h-4 w-4" /> Add intent</button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => addIntent(s)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-3 hover:border-brand hover:text-ink">
                <Sparkles className="h-3 w-3 text-brand" /> {s}
              </button>
            ))}
          </div>
        </section>

        {/* Agent activity */}
        <section className="card col-span-5 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-ink">Agent activity</p>
            <Link to="/operations" className="text-[12px] font-semibold text-brand hover:underline">Live view →</Link>
          </div>
          <ul className="mt-3 space-y-1">
            {feed.map((f) => (
              <li key={f.key}>
                <button type="button" disabled={!f.incident} onClick={() => f.incident && openRoom(f.incident)} className={cx("flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left", f.incident && "hover:bg-raised")}>
                  <AgentAvatar id={f.agent} size="sm" done={!f.routine} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-[18px] text-ink"><span className="font-semibold">{f.domain}:</span> {f.text}</span>
                    <span className="block truncate text-[11px] text-ink-4">{f.sub}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-4">{clock(f.t)}</span>
                </button>
              </li>
            ))}
            {feed.length === 0 && <li className="py-6 text-center text-[12.5px] text-ink-4">Quiet so far. Start the day from the Overview.</li>}
          </ul>
        </section>

        {/* Needs human approval */}
        <section className="card col-span-7 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink"><Hand className="h-4 w-4 text-warn" /> Needs human approval</p>
            <span className="text-[11.5px] text-ink-4">Hold stops the agents and hands it to an engineer</span>
          </div>
          <p className="eyebrow mt-4">Right now</p>
          <ul className="mt-1 divide-y divide-line/70">
            {waitingSteps.map(({ s, x }) => {
              const e = escalations[x.step.id];
              const conf = confidence(s);
              return (
                <li key={x.step.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-ink"><SeverityTag severity={s.incident.severity} /> {x.step.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-4">{s.incident.title} · {conf ? `confidence ${conf}% · ` : ""}{x.step.action?.cost ?? "customer-facing"} · waiting {duration(state.t - x.at)}</p>
                    {e && !["canceled", "failed", "unanswered"].includes(e.status) && (
                      <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-good"><Phone className="h-3 w-3" /> {e.decision ? "Decided on the call" : `${e.channel === "whatsapp-message" ? "Sent to" : "On a call with"} ${e.approver.name}`}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => approve(x.step.id)} className="btn-line px-3 py-1.5 text-[12.5px]"><Check className="h-3.5 w-3.5 text-good" /> Approve</button>
                  <button type="button" onClick={() => reject(x.step.id)} className="btn-line px-3 py-1.5 text-[12.5px]">Hold</button>
                </li>
              );
            })}
            {waitingSteps.length === 0 && <li className="py-3 text-[12.5px] text-ink-4">No action is waiting. On-shift lead: {shiftLead(state.t).name}.</li>}
          </ul>
          <p className="eyebrow mt-5">For sign-off this week</p>
          <ul className="mt-1 divide-y divide-line/70">
            {recs.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink"><span className="mr-2 rounded bg-raised px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{r.kind}</span>{r.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-4">{r.sub}</p>
                </div>
                {signoff[r.id] ? (
                  <span className={cx("rounded-md px-2 py-0.5 text-[11.5px] font-semibold", signoff[r.id] === "approved" ? "bg-good/12 text-good" : "bg-raised text-ink-3")}>{signoff[r.id] === "approved" ? "Approved" : "Held"}</span>
                ) : (
                  <>
                    <button type="button" onClick={() => setSignoff({ ...signoff, [r.id]: "approved" })} className="btn-line px-3 py-1.5 text-[12.5px]"><Check className="h-3.5 w-3.5 text-good" /> Approve</button>
                    <button type="button" onClick={() => setSignoff({ ...signoff, [r.id]: "held" })} className="btn-line px-3 py-1.5 text-[12.5px]">Hold</button>
                  </>
                )}
              </li>
            ))}
            {recs.length === 0 && <li className="py-3 text-[12.5px] text-ink-4">Nothing yet. Recommendations appear as the agents learn during the day.</li>}
          </ul>
        </section>

        {/* Domain health */}
        <section className="card col-span-5 p-5">
          <p className="text-[15px] font-bold text-ink">Domain health</p>
          <div className="mt-4 space-y-3.5">
            {DOMAINS.map((d) => <HealthBar key={d} domain={d} value={domainHealth(d, incidents, kpi.availability)} level={AUTONOMY[state.levels[d]].short} />)}
          </div>
          <p className="mt-4 text-[11.5px] text-ink-4">Drops while an incident in that domain is open, then recovers once the KPIs prove the fix.</p>
        </section>
      </div>

      {/* Value today */}
      <section className="card mt-6 flex items-center gap-8 p-5">
        <p className="w-40 shrink-0 text-[15px] font-bold leading-5 text-ink">Value delivered today</p>
        <div className="grid flex-1 grid-cols-4 gap-6">
          <Mini label="Revenue protected" value={aed(protectedAed)} grad />
          <Mini label="Subscriber-hours protected" value={compact(subHours)} />
          <Mini label="Tickets the agents didn't need" value={String(tickets)} />
          <Mini label="Field visits avoided" value={String(visits)} />
        </div>
        <Link to="/executive" className="btn-line shrink-0">Read the CTO brief <ArrowRight className="h-4 w-4" /></Link>
      </section>
      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-4"><CornerDownLeft className="h-3 w-3" /> Revenue at AED {AED_PER_SUB_DAY} per subscriber per day (du Q3 2026). Network, intents and incidents are simulated.</p>
    </main>
  );
}

/** Subscriber-minutes lost while sites were actually down or degraded, priced per subscriber per day. */
function lostRevenue(incidents: IncidentState[], t: number) {
  let subMinutes = 0;
  for (const s of incidents) {
    const stepAt = (id: string) => s.steps.find((x) => x.step.id === id);
    for (const p of s.incident.phases) {
      if (!p.subscribers) continue;
      const from = stepAt(p.from);
      if (!from || from.status !== "done") continue;
      const to = p.to ? stepAt(p.to) : undefined;
      const end = to && to.status === "done" ? Math.min(to.at, t) : t;
      subMinutes += p.subscribers * Math.max(0, end - from.at);
    }
  }
  return (subMinutes * AED_PER_SUB_DAY) / 1440;
}

function confidence(s: IncidentState) {
  const h = [...s.steps].reverse().find((x) => x.status === "done" && x.step.hypotheses)?.step.hypotheses;
  return h ? Math.round(Math.max(...h.map((x) => x.p)) * 100) : null;
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "grad" | "good" | "warn" }) {
  return (
    <div className="card p-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <motion.p key={value} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
        className={cx("mt-2 font-mono text-[28px] font-semibold leading-none tracking-tight tabular", tone === "grad" ? "grad-text" : tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-ink")}>{value}</motion.p>
      <p className="mt-2 text-[11.5px] text-ink-4">{sub}</p>
    </div>
  );
}

function HealthBar({ domain, value, level }: { domain: Domain; value: number; level: string }) {
  const tone = value >= 97 ? "bg-good" : value >= 90 ? "bg-warn" : "bg-bad";
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium text-ink">{domain} <span className="ml-1 text-[11px] font-normal text-ink-4">{level}</span></span>
        <span className="font-mono text-ink-2">{value.toFixed(1)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised">
        <motion.div className={cx("h-2 rounded-full", tone)} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }} />
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wider text-ink-4">{k}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
    </div>
  );
}

function Mini({ label, value, grad }: { label: string; value: string; grad?: boolean }) {
  return (
    <div>
      <p className="text-[11.5px] text-ink-4">{label}</p>
      <p className={cx("mt-1 font-mono text-[22px] font-semibold leading-none", grad ? "grad-text" : "text-ink")}>{value}</p>
    </div>
  );
}
