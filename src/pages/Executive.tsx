import { AnimatePresence, motion } from "framer-motion";
import { FileText, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentAvatar, Thinking } from "@/components/AgentAvatar";
import { Page } from "@/components/Page";
import { AUTONOMY, DOMAINS } from "@/sim/agents";
import { rawAlarms } from "@/sim/alarms";
import { INCIDENT_BY_ID, aedProtected } from "@/sim/incidents";
import { PREDICTIONS } from "@/sim/insight";
import { rootCauseMinutes, routineDone, type IncidentState } from "@/sim/progress";
import { ROUTINE } from "@/sim/routine";
import { DAY_LENGTH, at, clock, duration } from "@/sim/time";
import type { Domain, Levels } from "@/sim/types";
import { useSim, type Decision } from "@/state/sim";
import { aed, compact, cx, num } from "@/lib/format";

interface Answer {
  title: string;
  lines: string[];
  cites: string[];
}

const QUESTIONS = [
  "What happened overnight?",
  "What needs a decision right now?",
  "Which sites are most at risk this week?",
  "How much revenue did we protect today?",
  "Why did calls fail in Al Majaz?",
  "Was the evening surge an attack?",
  "How autonomous were we today?",
] as const;

const KEYWORDS: [RegExp, (typeof QUESTIONS)[number]][] = [
  [/night|overnight|last night|handover/i, QUESTIONS[0]],
  [/decision|approv|waiting|need/i, QUESTIONS[1]],
  [/risk|predict|week|fail next|prevent/i, QUESTIONS[2]],
  [/revenue|aed|money|sla|protect/i, QUESTIONS[3]],
  [/majaz|sharjah|call|cssr|rollback|change/i, QUESTIONS[4]],
  [/attack|ddos|surge|storm|security|meter/i, QUESTIONS[5]],
  [/autonom|level|tm ?forum|l4|automat/i, QUESTIONS[6]],
];

function autonomyByDomain(incidents: IncidentState[], t: number) {
  const out: Record<string, { auto: number; human: number }> = {};
  for (const d of DOMAINS) out[d] = { auto: 0, human: 0 };
  for (const s of incidents) for (const x of s.steps) {
    if (!x.step.action || x.status === "pending") continue;
    const human = x.status === "waiting" || x.status === "rejected" || Boolean(x.approval && !x.approval.auto);
    out[s.incident.domain][human ? "human" : "auto"]++;
  }
  for (const r of ROUTINE) if (r.t + r.durationMin <= t) out[r.domain].auto++;
  return out as Record<Domain, { auto: number; human: number }>;
}

function answer(q: (typeof QUESTIONS)[number], incidents: IncidentState[], t: number, decisions: Decision[], levels: Levels): Answer {
  const by = Object.fromEntries(incidents.map((s) => [s.incident.id, s]));
  const opened = incidents.filter((s) => s.status !== "upcoming");
  switch (q) {
    case "What happened overnight?": {
      const night = opened.filter((s) => s.incident.trigger < at("07:00"));
      const until = Math.min(t, at("07:00"));
      if (!night.length) return { title: "Overnight so far", lines: [`${num(rawAlarms(until))} raw alarms, no incidents. ${routineDone(until).length} small faults fixed without a ticket.`], cites: [] };
      return {
        title: "The night shift, 00:00–07:00",
        lines: [
          `${num(rawAlarms(until))} raw alarms became ${night.length} incident${night.length > 1 ? "s" : ""}. ${routineDone(until).length} small faults were fixed without a ticket.`,
          ...night.map((s) => `${clock(s.incident.trigger)} · ${s.incident.title}. ${s.lastDone ? s.lastDone.step.title + "." : ""}`),
          `${decisions.filter((d) => d.kind !== "autonomy" && d.t < at("07:00")).length} decision${decisions.filter((d) => d.kind !== "autonomy" && d.t < at("07:00")).length === 1 ? "" : "s"} by Mariam, the night shift lead.`,
        ],
        cites: night.map((s) => s.incident.id),
      };
    }
    case "What needs a decision right now?": {
      const waiting = incidents.flatMap((s) => s.steps.filter((x) => x.status === "waiting").map((x) => ({ s, x })));
      const recs = PREDICTIONS.filter((p) => p.status === "Needs approval" && p.from <= t);
      if (!waiting.length && !recs.length) return { title: "Nothing is waiting", lines: ["No action is waiting for approval. The agents are handling everything inside policy."], cites: [] };
      return {
        title: `${waiting.length} action${waiting.length === 1 ? "" : "s"} waiting, ${recs.length} recommendation${recs.length === 1 ? "" : "s"}`,
        lines: [
          ...waiting.map(({ s, x }) => `Now: ${x.step.title}${x.step.action?.cost ? ` (${x.step.action.cost})` : ""}. ${s.incident.number}, waiting ${Math.round(t - x.at)} min.`),
          ...recs.map((r) => `This week: ${r.action}. ${r.place}, risk ${r.risk}.`),
        ],
        cites: waiting.map(({ s }) => s.incident.id),
      };
    }
    case "Which sites are most at risk this week?": {
      const risks = PREDICTIONS.filter((p) => p.from <= t).sort((a, b) => b.risk - a.risk).slice(0, 5);
      return { title: "Top risks for the next 7 days", lines: risks.map((r) => `${r.risk} · ${r.place}: ${r.factor}. Proposed: ${r.action}.`), cites: risks.map((r) => r.learnedFrom).filter(Boolean) as string[] };
    }
    case "How much revenue did we protect today?": {
      const resolved = opened.filter((s) => s.status === "resolved" && aedProtected(s.incident) > 0).sort((a, b) => aedProtected(b.incident) - aedProtected(a.incident));
      const total = resolved.reduce((n, s) => n + aedProtected(s.incident), 0);
      if (!resolved.length) return { title: "Nothing resolved yet", lines: ["Revenue protected is counted when an incident is closed and proven."], cites: [] };
      return { title: `${aed(total)} protected so far`, lines: [...resolved.map((s) => `${aed(aedProtected(s.incident))} · ${s.incident.title}`), "Subscriber revenue at AED 4.4 per subscriber per day, plus SLA credits avoided."], cites: resolved.map((s) => s.incident.id) };
    }
    case "Why did calls fail in Al Majaz?": {
      const s = by.rollback;
      if (s.status === "upcoming") return { title: "Nothing in Al Majaz yet", lines: ["No incident in Al Majaz so far today."], cites: [] };
      return {
        title: "A parameter change made phones bounce between cells",
        lines: [
          "Change CHG-26-10398 at 09:00 lowered the handover offset and trigger time on 23 Nokia cells. Phones started ping-ponging, and call setup success fell from 99.1% to 95.2%.",
          "No alarm fired. Sentinel saw the KPI drift against neighbouring clusters at 09:40.",
          s.closedAt ? `The three parameters were rolled back at 09:44, and call setup was back to 99.1% by ${clock(s.closedAt)}.` : "Rollback is under way.",
          "New guardrail: pushes to more than 10 cells now start with a 2-cell canary.",
        ],
        cites: ["rollback"],
      };
    }
    case "Was the evening surge an attack?": {
      const s = by.storm;
      if (s.status === "upcoming") return { title: "No surge yet", lines: ["The evening peak hasn't started."], cites: [] };
      return {
        title: "No. It was 61,000 smart meters stuck in a retry loop",
        lines: [
          "96% of the attach requests came from one smart-meter model on one IoT APN. There were no spoofed or foreign identities.",
          "The meters' owner pushed firmware 3.2.1 at 18:30. It retries every 8 seconds after a failed connection.",
          "Guardian kept it off the DDoS playbook. A back-off timer slowed the meters down and phones were prioritised. Nobody was blocked.",
          s.status === "escalated" ? "The request to the customer was rejected by the shift, so the incident is with the core engineers." : "",
        ].filter(Boolean),
        cites: ["storm"],
      };
    }
    case "How autonomous were we today?": {
      const byDomain = autonomyByDomain(incidents, t);
      return {
        title: "Share of actions that ran without a person",
        lines: DOMAINS.filter((d) => byDomain[d].auto + byDomain[d].human > 0).map((d) => `${d}: ${Math.round((byDomain[d].auto / (byDomain[d].auto + byDomain[d].human)) * 100)}% of ${byDomain[d].auto + byDomain[d].human} actions ran on their own. Set to ${AUTONOMY[levels[d]].name} (TM Forum ${AUTONOMY[levels[d]].tmf}).`),
        cites: [],
      };
    }
  }
}

export default function Executive() {
  const { state, incidents, openRoom } = useSim();
  const [q, setQ] = useState<(typeof QUESTIONS)[number] | null>("What needs a decision right now?");
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const result = useMemo(() => (q ? answer(q, incidents, state.t, state.decisions, state.levels) : null), [q, incidents, state.t, state.decisions, state.levels]);

  const ask = (question: (typeof QUESTIONS)[number]) => {
    setQ(question);
    setThinking(true);
    window.setTimeout(() => setThinking(false), 900);
  };
  const submit = () => {
    const match = KEYWORDS.find(([re]) => re.test(text));
    ask(match ? match[1] : QUESTIONS[0]);
  };

  const opened = incidents.filter((s) => s.status !== "upcoming");
  const resolved = opened.filter((s) => s.status === "resolved");
  const protectedAed = resolved.reduce((n, s) => n + aedProtected(s.incident), 0);
  const subHours = resolved.reduce((n, s) => n + (s.incident.impact.subscribers * s.incident.impact.minutesAvoided) / 60, 0);
  const people = state.decisions.filter((d) => d.kind !== "autonomy");
  const routine = routineDone(state.t);
  const auto = opened.reduce((n, s) => n + s.steps.filter((x) => x.step.action && x.status === "done" && !(x.approval && !x.approval.auto)).length, 0) + routine.length;
  const rcs = opened.map((s) => rootCauseMinutes(s) ?? 0).filter(Boolean).sort((a, b) => a - b);
  const final = state.t >= DAY_LENGTH;
  const stories = ["fibre", "gitex", "storm", "sleeping"].map((id) => incidents.find((s) => s.incident.id === id)!).filter((s) => s.status !== "upcoming");
  const recs = PREDICTIONS.filter((p) => p.status === "Needs approval" && p.from <= state.t);
  const domains = autonomyByDomain(incidents, state.t);

  return (
    <Page eyebrow="Operations · Executive intelligence" title="The CTO's morning brief"
      intro="Written by the Scribe agent from the day's record: every alarm, action, proof and decision. Ask the NOC anything about today and the answer comes from the same record, with the incidents it used.">
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(380px,1fr)] gap-6">
        <article className="card overflow-hidden">
          <div className="grad-line h-1" />
          <header className="flex items-center gap-3 border-b border-line px-7 py-5">
            <AgentAvatar id="scribe" done />
            <div className="flex-1">
              <p className="text-[12px] text-ink-4">To: CTO · From: du NOC · Prepared by the Scribe agent</p>
              <p className="text-[17px] font-bold text-ink">Friday 06:00 brief · Thursday of GITEX week</p>
            </div>
            <span className={cx("rounded-full px-3 py-1 text-[11.5px] font-semibold", final ? "bg-good/12 text-good" : "bg-warn/12 text-warn")}>{final ? "Final" : `Draft · as of ${clock(state.t)}`}</span>
          </header>
          <div className="px-7 py-6">
            <p className="text-[19px] font-semibold leading-8 tracking-tight text-ink">
              {num(rawAlarms(state.t))} alarms became {opened.length} incidents. The agents carried out {num(auto)} actions on their own and proved {resolved.length} fixes with live KPIs. People made {people.length} decision{people.length === 1 ? "" : "s"}.
            </p>
            <div className="mt-6 grid grid-cols-4 gap-4">
              <Kpi label="Revenue protected" value={aed(protectedAed)} grad />
              <Kpi label="Subscriber-hours protected" value={compact(subHours)} />
              <Kpi label="Median time to root cause" value={rcs.length ? `${rcs[Math.floor(rcs.length / 2)]} min` : "–"} />
              <Kpi label="Field visits avoided" value={String(ROUTINE.filter((r) => r.visitAvoided && r.t + r.durationMin <= state.t).length + resolved.reduce((n, s) => n + s.incident.impact.visitsAvoided, 0))} />
            </div>

            <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">The stories worth telling</h3>
            <ul className="mt-3 space-y-3">
              {stories.map((s) => (
                <li key={s.incident.id}>
                  <button type="button" onClick={() => openRoom(s.incident.id)} className="block text-left">
                    <p className="text-[14.5px] font-semibold text-ink hover:text-brand">{clock(s.incident.trigger)} · {s.incident.title}</p>
                    <p className="text-[13px] leading-5 text-ink-3">{s.incident.oneLiner} {s.closedAt ? `Resolved and proven in ${duration(s.closedAt - s.incident.trigger)}.` : s.status === "waiting" ? "Waiting for a decision." : s.status === "escalated" ? "Handed to engineers." : ""}</p>
                  </button>
                </li>
              ))}
              {stories.length === 0 && <li className="text-[13px] text-ink-4">The day hasn't produced a story yet.</li>}
            </ul>

            <div className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Decisions made by people</h3>
                <ul className="mt-3 space-y-2 text-[12.5px]">
                  {people.map((d, i) => (
                    <li key={i} className="flex gap-2"><span className="font-mono text-ink-4">{clock(d.t)}</span><span className={d.kind === "approved" ? "text-good" : "text-bad"}>{d.kind === "approved" ? "Approved" : "Rejected"}</span><span className="text-ink-2">{d.detail}</span></li>
                  ))}
                  {people.length === 0 && <li className="text-ink-4">None yet.</li>}
                </ul>
              </div>
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">For your sign-off</h3>
                <ul className="mt-3 space-y-2 text-[12.5px]">
                  {recs.map((r) => <li key={r.id} className="text-ink-2"><span className="font-semibold text-ink">{r.action}.</span> {r.place} · risk {r.risk}{r.learnedFrom ? ` · from ${INCIDENT_BY_ID[r.learnedFrom].number}` : ""}</li>)}
                  {state.t >= at("10:08") && <li className="text-ink-2"><span className="font-semibold text-ink">Make the 2-cell canary standard for parameter pushes.</span> Learned from INC-1015-0007.</li>}
                  {recs.length === 0 && state.t < at("10:08") && <li className="text-ink-4">Nothing yet.</li>}
                </ul>
              </div>
            </div>

            <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">How autonomous the NOC was, by domain</h3>
            <div className="mt-3 space-y-2">
              {DOMAINS.filter((d) => domains[d].auto + domains[d].human > 0).map((d) => {
                const total = domains[d].auto + domains[d].human;
                const share = domains[d].auto / total;
                return (
                  <div key={d} className="flex items-center gap-3 text-[12.5px]">
                    <span className="w-28 text-ink-2">{d}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="grad-line h-2 rounded-full" style={{ width: `${share * 100}%` }} /></div>
                    <span className="w-28 text-right font-mono text-ink-3">{Math.round(share * 100)}% of {total}</span>
                    <span className="w-28 text-right text-[11px] text-ink-4">set to {AUTONOMY[state.levels[d]].short} · {AUTONOMY[state.levels[d]].tmf}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <div className="card flex h-fit flex-col p-5">
          <p className="flex items-center gap-2 text-[15px] font-bold text-ink"><Sparkles className="h-4 w-4 text-brand" /> Ask the NOC</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Answers come from today's record, with the incidents they used.</p>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-4 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Why did calls fail in Sharjah?"
              className="h-10 flex-1 rounded-xl border border-line bg-raised px-3 text-[13.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" />
            <button type="submit" className="btn-primary h-10 px-3"><Send className="h-4 w-4" /></button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUESTIONS.map((x) => (
              <button key={x} type="button" onClick={() => ask(x)} className={cx("rounded-full border px-2.5 py-1 text-[11.5px] transition", q === x ? "border-brand bg-brand/10 text-ink" : "border-line text-ink-3 hover:text-ink")}>{x}</button>
            ))}
          </div>
          <div className="mt-5 min-h-[220px] border-t border-line pt-4">
            <AnimatePresence mode="wait">
              {thinking ? (
                <motion.p key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[13px] text-ink-3"><AgentAvatar id="scribe" size="sm" active /> Reading today's record <Thinking /></motion.p>
              ) : result ? (
                <motion.div key={q} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <p className="text-[11.5px] text-ink-4">{q}</p>
                  <p className="mt-1 text-[16px] font-bold leading-6 text-ink">{result.title}</p>
                  <ul className="mt-3 space-y-2">
                    {result.lines.map((l) => <li key={l} className="text-[13px] leading-5 text-ink-2">{l}</li>)}
                  </ul>
                  {result.cites.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-ink-4"><FileText className="h-3 w-3" /> Sources:</span>
                      {[...new Set(result.cites)].map((id) => (
                        <button key={id} type="button" onClick={() => openRoom(id)} className="rounded-md border border-line bg-raised px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2 hover:border-brand">{INCIDENT_BY_ID[id].number}</button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <p className="text-[13px] text-ink-4">Pick a question or type your own.</p>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-4 text-ink-4">In this demo, questions are matched to answers built live from the simulated day. In production this is a grounded LLM over the NOC's own data, with the same sources shown.</p>
        </div>
      </div>
      <p className="mt-4 text-[11.5px] text-ink-4">{compact(9_500_000)} mobile and 756k fixed subscribers (du, Q3 2026). Everything else on this page is from the simulated day.</p>
    </Page>
  );
}

function Kpi({ label, value, grad }: { label: string; value: string; grad?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-raised/60 p-3.5">
      <p className="text-[11px] text-ink-4">{label}</p>
      <p className={cx("mt-1 font-mono text-[18px] font-semibold leading-tight", grad ? "grad-text" : "text-ink")}>{value}</p>
    </div>
  );
}
