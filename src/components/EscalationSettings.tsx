import { ArrowRight, MessageCircle, Phone, PhoneCall, Volume2 } from "lucide-react";
import { CHANNELS, type Channel } from "@/sim/escalation";
import { useEscalation } from "@/state/escalation";
import { cx } from "@/lib/format";

const ICON: Record<Channel, typeof Phone> = { "whatsapp-call": PhoneCall, phone: Phone, "whatsapp-message": MessageCircle };

export function EscalationSettings() {
  const { settings, setSettings, backend } = useEscalation();
  const liveChannels = CHANNELS.filter((c) => backend.channels[c.id]).map((c) => c.short);
  const serviceLine = !backend.online
    ? "Escalation service offline. Run npm run dev:all (or npm run server) to enable live calls."
    : backend.dryRun
      ? "Escalation service online · dry run: no call credentials in .env yet, so calls are acted out."
      : `Escalation service online · live: ${liveChannels.join(", ")}`;
  const channelName = CHANNELS.find((c) => c.id === settings.channel)!.name;
  const trialVoice = backend.online && backend.trialVoice && settings.mode === "live" && settings.channel === "phone";
  const ladder = trialVoice
    ? [
        { n: "1", t: "Shift lead · Twilio trial call", d: "Plays Twilio’s Speech Recognition sample" },
        { n: "2", t: "NOC screen", d: "Approve or reject the incident here" },
      ]
    : [
        { n: "1", t: `Shift lead · ${channelName}`, d: "Rings for 25 seconds" },
        { n: "2", t: `Backup engineer · ${channelName}`, d: "Same briefing, same choices" },
        { n: "3", t: "Shift lead · WhatsApp message", d: "Approve, Reject or Call me buttons" },
        { n: "4", t: "NOC screen", d: "Stays in the approvals inbox; safe actions already taken stay in place" },
      ];

  return (
    <div className="mt-6 card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="eyebrow">When a person is needed · escalation</p>
        <span className={cx("inline-flex items-center gap-1.5 text-[11.5px]", backend.online ? "text-good" : "text-ink-4")}>
          <span className={cx("h-1.5 w-1.5 rounded-full", backend.online ? "bg-good" : "bg-ink-4")} /> {serviceLine}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 p-5">
        <div>
          <p className="text-[13px] leading-5 text-ink-3">{trialVoice
            ? "Twilio calls the configured shift-lead number and plays its Speech Recognition sample. Record the incident decision in the NOC."
            : "When an agent stops for approval, it reaches the shift lead wherever they are. A voice agent reads the briefing and listens for “approve” or “reject”. The decision lands back here, with how it was made."}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {CHANNELS.map((c) => {
              const Icon = ICON[c.id];
              const on = settings.channel === c.id;
              const trialChannel = backend.trialVoice && settings.mode === "live" && c.id === "phone";
              return (
                <button key={c.id} type="button" onClick={() => setSettings({ channel: c.id })}
                  className={cx("rounded-xl border p-3 text-left transition", on ? "border-brand bg-brand/[0.08] shadow-[0_0_0_1px_rgb(var(--brand)/0.4)]" : "border-line hover:border-brand/50")}>
                  <Icon className={cx("h-4 w-4", on ? "text-brand" : "text-ink-3")} />
                  <p className="mt-2 text-[13px] font-semibold text-ink">{c.name}</p>
                  <p className="mt-1 text-[11.5px] leading-4 text-ink-3">{trialChannel ? "A real phone call with Twilio’s trial prompt." : c.note}</p>
                  {settings.mode === "live" && <p className={cx("mt-2 text-[10.5px] font-semibold", backend.channels[c.id] ? "text-good" : "text-ink-4")}>{backend.channels[c.id] ? (trialChannel ? "Live · Twilio trial" : "Live") : "Dry run"}</p>}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-[12.5px]">
            <div>
              <p className="text-ink-4">Mode</p>
              <div className="mt-1.5 flex rounded-full border border-line p-0.5">
                {(["simulated", "live"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setSettings({ mode: m })} disabled={m === "live" && !backend.online}
                    className={cx("flex-1 rounded-full px-2 py-1 font-semibold capitalize", settings.mode === m ? "bg-raised text-ink" : "text-ink-4", m === "live" && !backend.online && "opacity-40")}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-ink-4">Call automatically after</p>
              <div className="mt-1.5 flex rounded-full border border-line p-0.5">
                {([0, 4, 10] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setSettings({ autoAfter: s })} className={cx("flex-1 rounded-full px-2 py-1 font-semibold", settings.autoAfter === s ? "bg-raised text-ink" : "text-ink-4")}>{s ? `${s} s` : "Off"}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-ink-4">Read it aloud here</p>
              <button type="button" onClick={() => setSettings({ speak: !settings.speak })} className={cx("mt-1.5 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold", settings.speak ? "border-brand bg-brand/10 text-ink" : "border-line text-ink-4")}>
                <Volume2 className="h-3.5 w-3.5" /> {settings.speak ? "On" : "Off"}
              </button>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{trialVoice ? "Trial call flow" : "If nobody answers"}</p>
          <ol className="mt-3 space-y-2">
            {ladder.map((s, i, all) => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="grad-bg flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">{s.n}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{s.t}</p>
                  <p className="text-[11.5px] text-ink-4">{s.d}</p>
                </div>
                {i < all.length - 1 && <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 rotate-90 text-ink-4" />}
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl border border-warn/40 bg-warn/[0.06] p-3 text-[11.5px] leading-4 text-ink-2">
            Phone numbers live only in the escalation service's <span className="font-mono">.env</span>, never in the browser. WhatsApp voice calls may not connect on UAE mobile networks; test on site, and use Phone call as the live channel if they don't.
          </p>
        </div>
      </div>
    </div>
  );
}
