/**
 * Shared plumbing for Ajay's portal.
 *
 * Three rules hold across every admin screen and live here so they cannot drift:
 *
 *   1. **Every figure is derived.** Screens read one memoised snapshot of the
 *      business record and push it through the `domain/` engines. Nothing in
 *      `features/admin` retypes a rupee.
 *   2. **Every panel is attributable.** Layout components take an `agentId` so
 *      the provenance chip is never forgotten.
 *   3. **Every mutation is narrated.** `useAgentPulse` gives each screen one way
 *      to make the responsible agent react to what Ajay just did.
 */
import { useCallback, useMemo } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { TooltipContentProps } from "recharts";
import { Check, TriangleAlert } from "lucide-react";
import {
  Badge,
  Card,
  ChartTooltip,
  GUTTER,
  PageHeader,
  SegmentedControl,
  cn,
  type ChartTooltipRow,
} from "../../ui";
import type { Crumb } from "../../ui";
import type { AgentId, AgentState } from "../../contracts/agents";
import type { AnalyticsInput } from "../../contracts/engines";
import type { DataState } from "../../contracts/stores";
import type { CategoryKey, PeriodKey, SalesByProduct } from "../../domain/types";
import {
  DEMO_TODAY,
  KG_PER_LOT,
  PERIOD_LABELS,
  PRODUCTS,
  PRODUCT_BY_CODE,
  SEED_WINDOW,
  computePnl,
  endOfMonth,
  inrPaise,
  monthShort,
  rangeFor,
  round2,
  startOfMonth,
} from "../../domain";
import { selectAnalyticsInput, useDataStore } from "../../store/dataStore";
import { useAgentStore } from "../../store/agentStore";

/* ── The snapshot every screen reads ───────────────────────────────────── */

export interface AdminSnapshot {
  data: DataState;
  input: AnalyticsInput;
}

/**
 * One subscription per screen, keyed on `revision`.
 *
 * Selecting a freshly-built object out of Zustand on every render would make
 * `useSyncExternalStore` loop; the store bumps a single integer on every
 * mutation precisely so consumers can memoise against it instead.
 */
export function useAdminData(): AdminSnapshot {
  const revision = useDataStore((s) => s.revision);
  return useMemo(() => {
    const data = useDataStore.getState();
    return { data, input: selectAnalyticsInput(data) };
  }, [revision]);
}

/** The pinned demo clock. Business data never asks the wall clock for "now". */
export const TODAY = DEMO_TODAY;

/* ── Agent narration ───────────────────────────────────────────────────── */

export interface AgentPulse {
  /** Drives the agent's node animation and writes one trace line. */
  say: (agentId: AgentId, message: string, state?: AgentState) => void;
  /** A quiet follow-up line — the result of the work the pulse announced. */
  note: (agentId: AgentId, message: string) => void;
}

/**
 * The admin portal is where a prospect decides whether the agents are real. An
 * edit that moves a number must be *claimed* by the agent that owns it, in
 * plain language, with the figure in it.
 */
export function useAgentPulse(): AgentPulse {
  const pulse = useAgentStore((s) => s.pulse);
  const emit = useAgentStore((s) => s.emit);

  const say = useCallback(
    (agentId: AgentId, message: string, state: AgentState = "tool") => {
      pulse(agentId, state, message);
    },
    [pulse],
  );

  const note = useCallback(
    (agentId: AgentId, message: string) => {
      emit({ agentId, kind: "tool-result", level: "success", message });
    },
    [emit],
  );

  return useMemo(() => ({ say, note }), [say, note]);
}

/* ── Page furniture ────────────────────────────────────────────────────── */

export const PRINT_AREA_ID = "jsmb-print-area";

/**
 * Print support for FR-A-08's "PDF" half. The app shell is a fixed-height
 * flexbox with its own scroll container, which browsers print as a single
 * clipped screen — so printing lifts the report out of the layout instead.
 */
export function PrintStyles() {
  return (
    <style>{`@media print {
      body * { visibility: hidden !important; }
      #${PRINT_AREA_ID}, #${PRINT_AREA_ID} * { visibility: visible !important; }
      #${PRINT_AREA_ID} { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
      .j-no-print { display: none !important; }
      .j-print-break { break-inside: avoid; }
    }`}</style>
  );
}

export function printReport(): void {
  if (typeof window !== "undefined") window.print();
}

export interface AdminPageProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  agentId: AgentId;
  actions?: ReactNode;
  below?: ReactNode;
  crumb?: string;
  children: ReactNode;
}

/** Every admin route renders through this so the chrome is identical. */
export function AdminPage({
  title,
  subtitle,
  eyebrow,
  agentId,
  actions,
  below,
  crumb,
  children,
}: AdminPageProps) {
  const breadcrumbs: Crumb[] = crumb
    ? [{ label: "Admin", href: "#/admin" }, { label: crumb }]
    : [{ label: "Admin" }];
  return (
    <div className="pb-20">
      <PrintStyles />
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        agentId={agentId}
        actions={actions}
        below={below}
        breadcrumbs={breadcrumbs}
        className="j-no-print"
      />
      <div className={cn(GUTTER, "mx-auto mt-6 max-w-[1600px] space-y-6")}>{children}</div>
    </div>
  );
}

/** Two-column split that collapses to one on narrow screens. */
export function Split({
  children,
  className,
  ratio = "2/1",
}: {
  children: ReactNode;
  className?: string;
  ratio?: "2/1" | "1/1" | "1/2";
}) {
  const cols =
    ratio === "1/1"
      ? "xl:grid-cols-2"
      : ratio === "1/2"
        ? "xl:grid-cols-[1fr_2fr]"
        : "xl:grid-cols-[2fr_1fr]";
  return <div className={cn("grid grid-cols-1 gap-5", cols, className)}>{children}</div>;
}

/* ── Period control (FR-A-06, FR-A-14) ─────────────────────────────────── */

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = (
  ["daily", "weekly", "monthly", "yearly"] as PeriodKey[]
).map((key) => ({ value: key, label: PERIOD_LABELS[key] }));

export function PeriodSwitch({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
}) {
  return (
    <SegmentedControl<PeriodKey>
      label="Reporting period"
      options={PERIOD_OPTIONS}
      value={value}
      onChange={onChange}
      size="sm"
    />
  );
}

/** Every month the seed covers, oldest first, as `YYYY-MM`. */
export function monthsInWindow(): string[] {
  const out: string[] = [];
  let cursor = startOfMonth(SEED_WINDOW.from);
  const last = startOfMonth(SEED_WINDOW.to);
  while (cursor <= last) {
    out.push(cursor.slice(0, 7));
    const [y, m] = cursor.split("-").map(Number);
    cursor = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }
  return out;
}

export function monthLabel(monthISO: string): string {
  return monthShort(`${monthISO}-01`);
}

export function monthRangeOf(monthISO: string): { from: string; to: string } {
  const anchor = `${monthISO}-01`;
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

/* ── Reconciliation ────────────────────────────────────────────────────── */

/**
 * The spot-check a prospect performs, performed on screen first. Two figures
 * that must agree, and a badge that says whether they do — to the paisa.
 */
export function ReconcileNote({
  label,
  left,
  right,
  leftLabel,
  rightLabel,
  format = (n) => inrPaise(n),
  className,
}: {
  label: string;
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
  format?: (n: number) => string;
  className?: string;
}) {
  const delta = round2(left - right);
  const ok = Math.abs(delta) < 0.01;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-xs",
        ok ? "border-j-success/30 bg-j-success-soft" : "border-j-danger/30 bg-j-danger-soft",
        className,
      )}
    >
      <Badge tone={ok ? "success" : "danger"} size="xs" icon={ok ? <Check /> : <TriangleAlert />}>
        {ok ? "Reconciled" : "Mismatch"}
      </Badge>
      <span className="text-j-ink-2">{label}</span>
      <span className="num text-j-ink">
        {leftLabel} <strong className="font-semibold">{format(left)}</strong>
      </span>
      <span aria-hidden="true" className="text-j-ink-3">
        =
      </span>
      <span className="num text-j-ink">
        {rightLabel} <strong className="font-semibold">{format(right)}</strong>
      </span>
      {ok ? null : <span className="num text-j-danger">Δ {format(delta)}</span>}
    </div>
  );
}

/* ── CSV export (FR-A-08) ──────────────────────────────────────────────── */

export type CsvCell = string | number;

export function toCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = typeof cell === "number" ? String(cell) : cell;
          return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

/**
 * A real client-side download — no server, no library. The BOM keeps Excel from
 * mangling the rupee sign when Ajay opens the file.
 */
export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([`﻿${toCsv(rows)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ── Charts ────────────────────────────────────────────────────────────── */

export interface TooltipBody {
  title?: ReactNode;
  rows: ChartTooltipRow[];
}

/**
 * Adapter between recharts' payload and the house tooltip, so every chart in
 * the portal shows figures formatted by `domain/format.ts`.
 */
export function chartTooltip<T>(render: (row: T) => TooltipBody | null) {
  return function Content(props: TooltipContentProps): ReactNode {
    if (!props.active || !props.payload || props.payload.length === 0) return null;
    const raw: unknown = props.payload[0].payload;
    const body = render(raw as T);
    if (!body) return null;
    return <ChartTooltip title={body.title} rows={body.rows} />;
  };
}

/** Recharts writes SVG presentation attributes, so charts never animate here. */
export const NO_ANIM = { isAnimationActive: false } as const;

/** House bar geometry: thin marks, rounded data-end, square baseline. */
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const BAR_RADIUS_H: [number, number, number, number] = [0, 4, 4, 0];
export const MAX_BAR = 24;

/** Panel that carries a chart plus its table-view twin below the fold. */
export function ChartCard({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <Card className={cn("j-print-break", className)} {...rest}>
      {children}
    </Card>
  );
}

/* ── Cross-module rollups ──────────────────────────────────────────────── */

export interface MonthRow {
  month: string;
  label: string;
  revenue: number;
  weightKg: number;
  actualCost: number;
  actualProfit: number;
  standardProfit: number;
  payroll: number;
  /** True for the month the demo clock sits inside — it is only part-booked. */
  partial: boolean;
}

/**
 * Revenue and cost per calendar month across the seeded window. Used by the
 * dashboard trend, the P&L trend and the variance narrative, so all three read
 * the same numbers by construction.
 */
export function monthlyRows(input: AnalyticsInput): MonthRow[] {
  const currentMonth = TODAY.slice(0, 7);
  return monthsInWindow().map((month) => {
    const pnl = computePnl(input, rangeFor("monthly", `${month}-01`));
    return {
      month,
      label: monthLabel(month),
      revenue: pnl.revenue,
      weightKg: pnl.weightKg,
      actualCost: pnl.actualCosts.total,
      actualProfit: pnl.actualProfit,
      standardProfit: pnl.standardProfit,
      payroll: pnl.actualCosts.payroll,
      partial: month === currentMonth,
    };
  });
}

export interface CategoryRow {
  key: CategoryKey;
  label: string;
  bundles: number;
  lots: number;
  weightKg: number;
  revenue: number;
  margin: number;
}

/** FR-A-06 asks for bundles and lots by product *category*, not by SKU. */
export function categoryRollup(byProduct: SalesByProduct[]): CategoryRow[] {
  const rows = new Map<CategoryKey, CategoryRow>();
  for (const product of PRODUCTS) {
    if (!rows.has(product.category)) {
      rows.set(product.category, {
        key: product.category,
        label: product.categoryLabel,
        bundles: 0,
        lots: 0,
        weightKg: 0,
        revenue: 0,
        margin: 0,
      });
    }
  }
  for (const line of byProduct) {
    const product = PRODUCT_BY_CODE[line.productCode];
    const row = rows.get(product.category);
    if (!row) continue;
    row.bundles += line.bundles;
    row.weightKg += line.weightKg;
    row.revenue = round2(row.revenue + line.revenue);
    row.margin = round2(row.margin + line.margin);
  }
  return [...rows.values()]
    .map((row) => ({ ...row, lots: round2(row.weightKg / KG_PER_LOT) }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Simple client-side pagination — the seeded book is ~260 orders. */
export function paginate<T>(rows: T[], page: number, size: number): T[] {
  return rows.slice(page * size, page * size + size);
}
