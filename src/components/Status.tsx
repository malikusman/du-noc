import type { IncidentStatus } from "@/sim/progress";
import type { Severity } from "@/sim/types";
import { cx } from "@/lib/format";

export const STATUS_COPY: Record<IncidentStatus, { label: string; className: string }> = {
  upcoming: { label: "Not yet", className: "bg-raised text-ink-4" },
  investigating: { label: "Agents working", className: "bg-brand/15 text-brand" },
  waiting: { label: "Needs approval", className: "bg-warn/15 text-warn" },
  monitoring: { label: "Monitoring", className: "bg-info/15 text-info" },
  resolved: { label: "Resolved · proven", className: "bg-good/15 text-good" },
  escalated: { label: "With NOC engineers", className: "bg-bad/15 text-bad" },
};

export function StatusPill({ status }: { status: IncidentStatus }) {
  const copy = STATUS_COPY[status];
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", copy.className)}>{copy.label}</span>;
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const cls = severity === "P1" ? "border-bad/40 text-bad" : severity === "P2" ? "border-warn/40 text-warn" : "border-line text-ink-3";
  return <span className={cx("inline-flex rounded-md border px-1.5 py-px font-mono text-[10.5px] font-semibold", cls)}>{severity}</span>;
}
