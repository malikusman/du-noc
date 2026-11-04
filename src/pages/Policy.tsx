import { Page } from "@/components/Page";
import { AUTONOMY, DOMAINS, DOMAIN_COPY } from "@/sim/agents";
import { INCIDENTS } from "@/sim/incidents";
import { KB_BY_ID } from "@/sim/knowledge";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

export default function Policy() {
  const { state, setLevel, setAllLevels } = useSim();
  return (
    <Page eyebrow="Policy" title="How much the agents may do, by domain"
      intro="Autonomy is set per domain, so the NOC can let the agents run transport reroutes on their own while every core change still needs an engineer. Levels map to the TM Forum autonomous-network scale."
      right={<div className="flex gap-2">{AUTONOMY.map((a) => <button key={a.level} type="button" onClick={() => setAllLevels(a.level)} className="btn-line px-3 py-1.5 text-[12px]">All {a.short}</button>)}</div>}>
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
    </Page>
  );
}
