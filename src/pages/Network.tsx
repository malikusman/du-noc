import { useMemo, useState } from "react";
import { Big, Page } from "@/components/Page";
import { NetworkMap } from "@/components/NetworkMap";
import { INCIDENTS } from "@/sim/incidents";
import { ROUTINE } from "@/sim/routine";
import { SITES, SITE_BY_ID, TOTAL_CELLS, type Site } from "@/sim/sites";
import { clock } from "@/sim/time";
import type { SiteStatus } from "@/sim/types";
import { useSim } from "@/state/sim";
import { cx, num } from "@/lib/format";

const STATUS_LABEL: Record<SiteStatus, { label: string; cls: string }> = {
  ok: { label: "Healthy", cls: "text-ink-3" },
  fixed: { label: "Fixed", cls: "text-good" },
  watch: { label: "Watched", cls: "text-info" },
  degraded: { label: "Degraded", cls: "text-warn" },
  waiting: { label: "Waiting", cls: "text-warn" },
  down: { label: "Off air", cls: "text-bad" },
};

export default function Network() {
  const { state, sites, links, kpi } = useSim();
  const [colorBy, setColorBy] = useState<"status" | "vendor" | "tech">("status");
  const [selected, setSelected] = useState<Site | null>(SITE_BY_ID["DML-I07"]);

  const vendors = useMemo(() => ["Huawei", "Ericsson", "Nokia"].map((v) => ({ v, n: SITES.filter((s) => s.vendor === v).length })), []);
  const techs = useMemo(() => ["5G-A", "5G", "4G"].map((t) => ({ t, n: SITES.filter((s) => s.tech === t).length })), []);
  const counts = Object.values(sites).reduce<Record<string, number>>((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {});

  const watchlist = [
    { site: "DML-I07", what: "Indoor 5G-A cells with the sleeping-cell baseband version", rule: "Checked every 5 min after 21:31", from: "sleeping" },
    { site: "JBA-001", what: "4 single-homed sites behind the Jebel Ali duct", rule: "Dual-homing request raised", from: "fibre" },
    { site: "CRN-MW1", what: "Coastal microwave hops under fog advisories", rule: "Pre-route when margin < 6 dB", from: "fog" },
    { site: "ALN-H02", what: "Critical sites with under 2 h of battery at 38 °C", rule: "Generator first on any grid trip", from: "power" },
    { site: "MAJ-C01", what: "Clusters with a parameter change in the last 24 h", rule: "Canary on 2 cells for pushes over 10 cells", from: "rollback" },
  ].filter((w) => state.t >= (INCIDENTS.find((i) => i.id === w.from)?.trigger ?? 0));

  const history = selected ? [
    ...INCIDENTS.filter((i) => i.phases.some((p) => p.sites.includes(selected.id)) || i.siteId === selected.id).filter((i) => i.trigger <= state.t).map((i) => ({ t: i.trigger, text: `${i.number} · ${i.title}` })),
    ...ROUTINE.filter((r) => r.siteId === selected.id && r.t <= state.t).map((r) => ({ t: r.t, text: `${r.kind}: ${r.action}` })),
  ].sort((a, b) => b.t - a.t) : [];

  return (
    <Page eyebrow="Cell site management" title="The network" intro="Every site, cell and transport link in the simulated du network, with what the agents are watching before it fails.">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Big label="Sites" value={num(SITES.length)} sub={`${num(TOTAL_CELLS)} cells · 3 RAN vendors`} />
        <Big label="Cell availability now" value={`${(kpi.availability * 100).toFixed(2)}%`} tone={kpi.availability < 0.999 ? "warn" : "good"} sub="Across all cells" />
        <Big label="Sites with something happening" value={String(Object.keys(sites).length)} sub={`${counts.down ?? 0} off air · ${counts.degraded ?? 0} degraded · ${counts.watch ?? 0} watched`} />
        <Big label="5G-A sites" value={num(techs[0].n)} sub={`${num(techs[1].n)} 5G · ${num(techs[2].n)} 4G only`} tone="grad" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="card relative h-[560px] overflow-hidden">
          <NetworkMap statuses={sites} links={links} region="wide" colorBy={colorBy} onSite={setSelected} selected={selected?.id} />
          <div className="absolute left-4 top-4 flex rounded-full border border-line bg-panel/85 p-1 backdrop-blur">
            {(["status", "vendor", "tech"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setColorBy(c)} className={cx("rounded-full px-3 py-1 text-[12px] font-semibold capitalize", colorBy === c ? "bg-raised text-ink" : "text-ink-4 hover:text-ink-2")}>{c}</button>
            ))}
          </div>
          <div className="absolute bottom-4 left-4 flex gap-4 rounded-xl border border-line bg-panel/85 px-3 py-2 text-[11.5px] text-ink-3 backdrop-blur">
            {colorBy === "vendor" && vendors.map(({ v, n }) => <Legend key={v} color={v === "Huawei" ? "bad" : v === "Ericsson" ? "brand-2" : "brand"} label={`${v} · ${num(n)}`} />)}
            {colorBy === "tech" && techs.map(({ t, n }) => <Legend key={t} color={t === "5G-A" ? "brand-3" : t === "5G" ? "brand-2" : "ink-4"} label={`${t} · ${num(n)}`} />)}
            {colorBy === "status" && (["down", "degraded", "watch", "fixed"] as SiteStatus[]).map((s) => <Legend key={s} color={s === "down" ? "bad" : s === "degraded" ? "warn" : s === "watch" ? "info" : "good"} label={STATUS_LABEL[s].label} />)}
          </div>
        </div>

        <div className="card p-5">
          {selected ? (
            <>
              <p className="font-mono text-[11.5px] text-ink-4">{selected.id}</p>
              <p className="mt-1 text-[18px] font-bold leading-6 text-ink">{selected.name}</p>
              <p className={cx("mt-1 text-[13px] font-semibold", STATUS_LABEL[sites[selected.id] ?? "ok"].cls)}>{STATUS_LABEL[sites[selected.id] ?? "ok"].label}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                <Field k="Emirate" v={selected.emirate} />
                <Field k="Area" v={selected.area} />
                <Field k="Vendor" v={selected.vendor} />
                <Field k="Type" v={selected.type} />
                <Field k="Technology" v={selected.tech} />
                <Field k="Cells" v={String(selected.cells)} />
                <Field k="Busy-hour users" v={num(selected.subscribers)} />
                <Field k="EMS" v={selected.vendor === "Huawei" ? "iMaster MAE" : selected.vendor === "Ericsson" ? "ENM" : "NetAct / MantaRay"} />
              </dl>
              <p className="eyebrow mb-2 mt-6">Today at this site</p>
              {history.length ? (
                <ul className="space-y-2">
                  {history.map((h) => <li key={h.t + h.text} className="flex gap-3 text-[12.5px]"><span className="font-mono text-ink-4">{clock(h.t)}</span><span className="text-ink-2">{h.text}</span></li>)}
                </ul>
              ) : <p className="text-[12.5px] text-ink-4">Nothing today. Click any site on the map.</p>}
            </>
          ) : <p className="text-ink-4">Click a site on the map.</p>}
        </div>
      </div>

      <div className="mt-6 card p-5">
        <p className="eyebrow">Downtime prevention · Sentinel watchlist</p>
        <p className="mt-1 text-[13px] text-ink-3">Patterns the agents learned today and now check across the whole network.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
          {watchlist.length ? watchlist.map((w) => (
            <div key={w.what} className="rounded-xl border border-line bg-raised p-4">
              <p className="text-[13.5px] font-semibold text-ink">{w.what}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">{w.rule}</p>
              <p className="mt-2 font-mono text-[11px] text-ink-4">from {INCIDENTS.find((i) => i.id === w.from)?.number}</p>
            </div>
          )) : <p className="text-[13px] text-ink-4">The watchlist fills up as the agents learn during the day.</p>}
        </div>
      </div>
    </Page>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: `rgb(var(--${color}))` }} />{label}</span>;
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-ink-4">{k}</dt>
      <dd className="mt-0.5 font-medium text-ink">{v}</dd>
    </div>
  );
}
