import { useState } from "react";
import { Page } from "@/components/Page";
import { EscalationSettings } from "@/components/EscalationSettings";
import { INTEGRATIONS, TEAM } from "@/sim/insight";
import { shiftLead } from "@/sim/time";
import { AUTONOMY, DOMAINS, DOMAIN_COPY } from "@/sim/agents";
import { INCIDENTS } from "@/sim/incidents";
import { KB_BY_ID } from "@/sim/knowledge";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

const CHANNELS = ["NOC video wall", "Shift lead mobile", "ITSM ticket", "Microsoft Teams", "Email digest"];

export default function Policy() {
  const { state, setLevel, setAllLevels } = useSim();
  const [confidence, setConfidence] = useState(90);
  const [on, setOn] = useState<Record<string, boolean>>({ "NOC video wall": true, "Shift lead mobile": true, "ITSM ticket": true, "Microsoft Teams": true, "Email digest": false });
  return (
    <Page eyebrow="Operations · Settings" title="How much the agents may do, by domain"
      intro="Autonomy is set per domain, so the NOC can let the agents run transport reroutes on their own while every core change still needs an engineer. Levels map to the TM Forum autonomous-network scale."
      right={<div className="flex gap-2">{AUTONOMY.map((a) => <button key={a.level} type="button" onClick={() => setAllLevels(a.level)} className="btn-line whitespace-nowrap px-3 py-1.5 text-[12px]">All {a.short}</button>)}</div>}>
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-4">
              <th className="px-5 py-3 font-semibold">Domain</th>
              {AUTONOMY.map((a) => (
                <th key={a.level} className="px-3 py-3 text-center font-semibold">
                  {a.name}
                  <span className="mt-0.5 block font-mono text-[10px] normal-case tracking-normal text-ink-4">TM Forum {a.tmf}</span>
                </th>
              ))}
              <th className="px-5 py-3 font-semibold">Incidents today</th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d) => (
              <tr key={d} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-4"><p className="font-semibold text-ink">{d}</p><p className="text-[12px] text-ink-4">{DOMAIN_COPY[d]}</p></td>
                {AUTONOMY.map((a) => {
                  const on = state.levels[d] === a.level;
                  return (
                    <td key={a.level} className="px-3 py-4 text-center">
                      <button type="button" onClick={() => setLevel(d, a.level)} aria-label={`${d} ${a.name}`}
                        className={cx("mx-auto flex h-8 w-8 items-center justify-center rounded-full border transition", on ? "grad-bg border-transparent shadow-[0_4px_16px_rgb(var(--brand)/0.45)]" : "border-line hover:border-brand/60")}>
                        {on && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                      </button>
                    </td>
                  );
                })}
                <td className="px-5 py-4 text-[12px] text-ink-3">{INCIDENTS.filter((i) => i.domain === d).map((i) => i.number.slice(-4)).join(" · ") || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EscalationSettings />

      <div className="mt-6 grid grid-cols-2 gap-4">
        {AUTONOMY.map((a) => (
          <div key={a.level} className="card p-5">
            <p className="text-[15px] font-bold text-ink">{a.name} <span className="ml-1 font-mono text-[11px] font-normal text-ink-4">TM Forum {a.tmf}</span></p>
            <p className="mt-1 text-[13px] leading-5 text-ink-3">{a.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {["POL-CRIT-001", "POL-EVT-002"].map((id) => (
          <div key={id} className="card p-5">
            <p className="font-mono text-[11.5px] text-ink-4">{id}</p>
            <p className="mt-1 text-[15px] font-semibold text-ink">{KB_BY_ID[id].title}</p>
            <p className="mt-1 text-[13px] leading-5 text-ink-3">{KB_BY_ID[id].summary}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="eyebrow">Act only when confident</p>
          <p className="mt-2 text-[13px] leading-5 text-ink-3">Below this confidence the agents recommend instead of acting, at any autonomy level.</p>
          <div className="mt-4 flex items-center gap-3">
            <input type="range" min={70} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="flex-1 accent-[rgb(var(--brand))]" />
            <span className="w-12 text-right font-mono text-[18px] font-semibold text-ink">{confidence}%</span>
          </div>
          <p className="mt-3 text-[12px] text-ink-4">Today's lowest confidence before an action: 88% (fog).</p>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Who hears about what</p>
          <ul className="mt-3 space-y-2.5">
            {CHANNELS.map((c) => (
              <li key={c} className="flex items-center justify-between text-[13px]">
                <span className="text-ink-2">{c}</span>
                <button type="button" onClick={() => setOn({ ...on, [c]: !on[c] })} aria-label={c} className={cx("relative h-5 w-9 rounded-full transition", on[c] ? "grad-bg" : "bg-line")}>
                  <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on[c] ? "left-[18px]" : "left-0.5")} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-4">Approvals always go to the shift lead's mobile and the wall.</p>
        </div>
        <div className="card p-5">
          <p className="eyebrow">On shift now</p>
          <ul className="mt-3 space-y-2">
            {TEAM.filter((m) => (shiftLead(state.t).name === "Khalid" ? m.shift === "Day" : m.shift === "Night")).map((m) => (
              <li key={m.name} className="flex items-center justify-between text-[13px]">
                <span><span className="font-semibold text-ink">{m.name}</span> <span className="text-ink-3">· {m.role}</span></span>
                <span className="text-[11.5px] text-ink-4">{m.channel}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-4">Plus nine agents. Names are fictional.</p>
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-line px-5 py-3"><p className="eyebrow">Connected systems · what the agents may do in each</p></div>
        <div className="grid grid-cols-3">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="flex items-center justify-between border-b border-r border-line/70 px-5 py-3">
              <div>
                <p className="text-[13px] font-semibold text-ink">{i.name}</p>
                <p className="text-[11.5px] text-ink-4">{i.kind}</p>
              </div>
              <span className={cx("rounded-md px-2 py-0.5 text-[11px] font-semibold", i.scope === "Read" ? "bg-raised text-ink-3" : i.scope.includes("approval") ? "bg-warn/12 text-warn" : "bg-brand/12 text-brand")}>{i.scope}</span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
