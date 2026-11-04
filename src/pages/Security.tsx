import { ShieldAlert, ShieldCheck, Bug } from "lucide-react";
import { Big, Page } from "@/components/Page";
import { AgentAvatar } from "@/components/AgentAvatar";
import { StatusPill } from "@/components/Status";
import { ROUTINE } from "@/sim/routine";
import { siteLabel } from "@/sim/sites";
import { clock } from "@/sim/time";
import { useSim } from "@/state/sim";
import { cx } from "@/lib/format";

export default function Security() {
  const { state, incidents, openRoom } = useSim();
  const events = ROUTINE.filter((r) => r.domain === "Security" && r.t <= state.t);
  const storm = incidents.find((s) => s.incident.id === "storm")!;
  const stormSeen = storm.status !== "upcoming";
  const verdictKnown = storm.steps.some((s) => s.step.id === "s-hypo2" && s.status === "done");

  return (
    <Page eyebrow="Security operations" title="Attack, or accident?" intro="Guardian watches signalling, DNS, routing and fraud signals. Its first job is to tell a hostile surge from a bug, so real customers are never blocked by mistake.">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Big label="Threats handled today" value={String(events.length)} sub="Mitigated in seconds, SOC informed" tone="good" />
        <Big label="Surges that were not attacks" value={verdictKnown ? "1" : "0"} sub="Kept off the DDoS playbook" tone="grad" />
        <Big label="Customers blocked by mistake" value="0" sub="Back-off, never block, by policy" />
        <Big label="Fraud cases raised" value={String(events.filter((e) => e.kind === "SIM-box suspicion").length)} sub="Sent to the fraud team" />
      </div>

      {stormSeen && (
        <button type="button" onClick={() => openRoom("storm")} className="card mb-6 block w-full overflow-hidden text-left transition hover:border-brand/60">
          <div className="grid grid-cols-[1fr_auto_1fr]">
            <div className={cx("p-6", verdictKnown ? "opacity-50" : "")}>
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-bad"><ShieldAlert className="h-4 w-4" /> Signalling DDoS?</p>
              <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
                <li>Attach requests 9× normal</li>
                <li>Core CPU at 78%</li>
                <li>Hit three emirates at once</li>
              </ul>
            </div>
            <div className="flex flex-col items-center justify-center border-x border-line px-8">
              <p className="font-mono text-[11px] text-ink-4">{storm.incident.number} · {clock(storm.incident.trigger)}</p>
              <p className="mt-1 text-[17px] font-bold text-ink">Guardian's verdict</p>
              <div className="mt-2"><StatusPill status={storm.status} /></div>
            </div>
            <div className={cx("p-6", verdictKnown ? "" : "opacity-50")}>
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-good"><Bug className="h-4 w-4" /> Our own devices, stuck in a loop</p>
              <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
                <li>96% from one smart-meter model</li>
                <li>No spoofed or foreign identities</li>
                <li>Started 15 min after a customer firmware push</li>
              </ul>
            </div>
          </div>
        </button>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3"><p className="eyebrow">Today's security events</p></div>
        <ul>
          {[...events].reverse().map((e) => (
            <li key={e.id} className="flex items-start gap-4 border-b border-line/70 px-5 py-4 last:border-0">
              <span className="w-12 font-mono text-[12px] text-ink-4">{clock(e.t)}</span>
              <AgentAvatar id={e.agent} size="sm" done />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink">{e.kind}</p>
                <p className="text-[13px] text-ink-2">{e.detected}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-good"><ShieldCheck className="h-3.5 w-3.5" /> {e.action}. {e.proof}.</p>
              </div>
              <span className="shrink-0 rounded-md border border-line px-2 py-0.5 text-[11px] text-ink-3">{e.system}</span>
              <span className="hidden w-40 shrink-0 truncate text-right text-[11.5px] text-ink-4 xl:block">{siteLabel(e.siteId)}</span>
            </li>
          ))}
          {events.length === 0 && <li className="px-5 py-10 text-center text-[13px] text-ink-4">No security events yet today.</li>}
        </ul>
      </div>
    </Page>
  );
}
