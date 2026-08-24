/**
 * FR-A-15 — editable cost assumptions, plus the three items the BRD leaves open
 * (D1 GST rate & HSN, D5 working-days divisor, D6 delivery policy).
 *
 * Every control here writes straight into the store on change, so the whole app
 * re-flows live: per-product margins, the ₹20.20 build-up, every invoice total,
 * the daily wage, the payroll line and the break-even tonnage. The "impact"
 * column compares against a baseline captured when the screen opened, so a
 * presenter can drag one slider and show, in one glance, what it did.
 *
 * The three open items are labelled as pending client confirmation rather than
 * quietly hardcoded — an honest prototype is a better pitch than a guess.
 */
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarClock,
  FileText,
  RotateCcw,
  Truck,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Td,
  Th,
  TextInput,
  cn,
} from "../../ui";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_COST_CONFIG,
  KG_PER_BUNDLE,
  KG_PER_LOT,
  KG_PER_TON,
  PRODUCTS,
  SELLER_REGION,
  computePnl,
  computePayroll,
  dailyWage,
  inr,
  inrPaise,
  marginPerKg,
  pct,
  quoteOrder,
  rangeFor,
  rosterMonthlyCost,
  round2,
  splitGst,
  standardCostPerKg,
  tons,
} from "../../domain";
import type { CostConfig } from "../../domain/types";
import { useDataStore } from "../../store/dataStore";
import { AdminPage, Split, TODAY, useAdminData, useAgentPulse } from "./shared";

interface CostLine {
  key: keyof CostConfig;
  label: string;
  note: string;
  max: number;
  /** Margin is a target, not a cost — it sits outside the ₹20.20 build-up. */
  inBuildUp: boolean;
}

const COST_LINES: CostLine[] = [
  { key: "rawMaterial", label: "Raw material", note: "Wastage already absorbed (BRD §6.2)", max: 30, inBuildUp: true },
  { key: "labour", label: "Labour", note: "The per-kg allowance for wages", max: 12, inBuildUp: true },
  { key: "electricity", label: "Electricity", note: "Current TSSPDCL run rate", max: 6, inBuildUp: true },
  { key: "maintenance", label: "Maintenance", note: "Includes the ~₹1,000/month machine oiling", max: 6, inBuildUp: true },
  { key: "transport", label: "Transport", note: "Local delivery and outstation freight", max: 6, inBuildUp: true },
  { key: "targetMargin", label: "Target margin", note: "What Ajay wants to earn per kg", max: 12, inBuildUp: false },
];

export function AdminSettings() {
  const { data, input } = useAdminData();
  const updateCostConfig = useDataStore((s) => s.updateCostConfig);
  const updateSettings = useDataStore((s) => s.updateSettings);
  const { say, note } = useAgentPulse();

  // Captured once, on first render — the "before" side of the comparison.
  const baseline = useRef<{ cost: CostConfig; margins: Record<string, number> }>({
    cost: { ...data.costConfig },
    margins: Object.fromEntries(
      PRODUCTS.map((p) => [p.code, marginPerKg(p.code, data.costConfig)]),
    ),
  });
  const [dirty, setDirty] = useState(false);

  const costPerKg = standardCostPerKg(data.costConfig);
  const baselineCostPerKg = standardCostPerKg(baseline.current.cost);

  const impact = useMemo(() => {
    const month = rangeFor("monthly", TODAY);
    const pnl = computePnl(input, month);
    const payroll = computePayroll(
      data.employees,
      data.attendance,
      data.bonuses,
      month,
      data.settings,
    );
    const rosterCost = rosterMonthlyCost(data.employees);

    // A sample basket, priced live, so the GST and delivery settings visibly
    // change a real invoice rather than an abstract percentage.
    const sample = quoteOrder(
      [{ productCode: "P-PT", size: 12, unit: "lot", qty: 4 }],
      { costConfig: data.costConfig, settings: data.settings, region: SELLER_REGION },
    );
    const gst = splitGst(
      round2(sample.subtotal + sample.deliveryCharge),
      data.settings.gstRate,
      true,
    );

    return {
      pnl,
      payroll,
      rosterCost,
      sample,
      gst,
      fullMonthBreakEvenKg:
        data.costConfig.labour > 0 ? round2(rosterCost / data.costConfig.labour) : 0,
    };
  }, [data, input]);

  function setCost(key: keyof CostConfig, value: number) {
    const clean = round2(Math.max(0, value));
    if (clean === data.costConfig[key]) return;
    updateCostConfig({ [key]: clean });
    setDirty(true);
  }

  /** Called when a drag or a typed value settles — one trace line, not fifty. */
  function announceCost(key: keyof CostConfig) {
    const line = COST_LINES.find((l) => l.key === key);
    if (!line) return;
    const before = baseline.current.cost[key];
    const after = data.costConfig[key];
    const worst = [...PRODUCTS]
      .map((p) => ({ product: p, margin: marginPerKg(p.code, data.costConfig) }))
      .sort((a, b) => a.margin - b.margin)[0];

    say(
      "FIN",
      `${line.label} ₹${before.toFixed(2)} → ₹${after.toFixed(2)}: ${worst.product.categoryLabel} margin now ${inrPaise(worst.margin)}/kg.`,
    );
    note(
      "PRC",
      `Standard cost re-based to ${inrPaise(standardCostPerKg(data.costConfig))}/kg; every quote, invoice and P&L line has been recomputed.`,
    );
  }

  function resetAll() {
    updateCostConfig({ ...DEFAULT_COST_CONFIG });
    updateSettings({ ...DEFAULT_BUSINESS_SETTINGS });
    setDirty(true);
    say("FIN", "Cost assumptions restored to the BRD §6.1 build-up — ₹20.20/kg standard cost.");
  }

  return (
    <AdminPage
      eyebrow="Assumptions"
      title="Cost & assumptions"
      crumb="Cost assumptions"
      subtitle="The numbers every other screen is built on. Change one and watch the margins, invoices and profit re-flow immediately."
      agentId="FIN"
      actions={
        <Button size="sm" variant="outline" iconLeft={<RotateCcw />} onClick={resetAll}>
          Restore BRD defaults
        </Button>
      }
    >
      <StatGrid columns={4}>
        <StatCell>
          <Stat
            label="Standard cost"
            value={inrPaise(costPerKg)}
            unit="/kg"
            tone={costPerKg === baselineCostPerKg ? "neutral" : "primary"}
            hint={
              costPerKg === baselineCostPerKg
                ? "BRD §6.1 build-up"
                : `was ${inrPaise(baselineCostPerKg)}/kg when this screen opened`
            }
            agentId="FIN"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Reference price"
            value={inrPaise(round2(costPerKg + data.costConfig.targetMargin))}
            unit="/kg"
            hint={`Standard cost + ₹${data.costConfig.targetMargin.toFixed(2)} target margin`}
            agentId="PRC"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Break-even, full roster"
            value={(impact.fullMonthBreakEvenKg / KG_PER_TON).toFixed(2)}
            unit="t / month"
            hint={`${inr(impact.rosterCost)} wages ÷ ₹${data.costConfig.labour.toFixed(2)}/kg labour`}
            agentId="FIN"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="This month's profit"
            value={inr(impact.pnl.actualProfit)}
            tone={impact.pnl.actualProfit >= 0 ? "success" : "danger"}
            hint="Recomputed from these assumptions"
            agentId="FIN"
          />
        </StatCell>
      </StatGrid>

      <Split ratio="1/1">
        {/* FR-A-15 — the cost build-up */}
        <Card>
          <CardHeader
            title="Cost build-up per kilogram"
            subtitle="BRD §6.1. Drag or type; everything downstream updates on the same keystroke."
            icon={<BadgeIndianRupee />}
            agentId="FIN"
            divided
            className="mb-4"
          />
          <div className="space-y-4">
            {COST_LINES.map((line) => {
              const value = data.costConfig[line.key];
              const base = baseline.current.cost[line.key];
              const delta = round2(value - base);
              return (
                <div key={line.key} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label
                      htmlFor={`cost-${line.key}`}
                      className="text-[13px] font-semibold text-j-ink"
                    >
                      {line.label}
                      {!line.inBuildUp ? (
                        <span className="ml-2 text-xs font-normal text-j-ink-3">
                          not part of cost
                        </span>
                      ) : null}
                    </label>
                    <span className="flex items-center gap-2">
                      {delta !== 0 ? (
                        <Badge tone={delta > 0 ? "warn" : "success"} size="xs">
                          {delta > 0 ? "+" : "−"}₹{Math.abs(delta).toFixed(2)}
                        </Badge>
                      ) : null}
                      <span className="num text-[13px] font-semibold tabular-nums text-j-ink">
                        ₹{value.toFixed(2)}/kg
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id={`cost-${line.key}`}
                      type="range"
                      min={0}
                      max={line.max}
                      step={0.1}
                      value={value}
                      onChange={(e) => setCost(line.key, Number(e.target.value))}
                      onPointerUp={() => announceCost(line.key)}
                      onKeyUp={() => announceCost(line.key)}
                      className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-j-ink/[0.1] accent-j-primary"
                      aria-describedby={`cost-note-${line.key}`}
                    />
                    <TextInput
                      inputSize="sm"
                      className="w-24"
                      inputMode="decimal"
                      prefix="₹"
                      mono
                      value={String(value)}
                      onChange={(e) => setCost(line.key, Number(e.target.value.replace(/[^0-9.]/g, "")))}
                      onBlur={() => announceCost(line.key)}
                      aria-label={`${line.label} rupees per kilogram`}
                    />
                  </div>
                  <p id={`cost-note-${line.key}`} className="text-xs text-j-ink-3">
                    {line.note}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-baseline justify-between border-t border-j-line pt-4">
            <span className="text-[13px] font-semibold text-j-ink">
              Standard cost (raw + labour + power + upkeep + transport)
            </span>
            <span className="num text-lg font-semibold tabular-nums text-j-ink">
              {inrPaise(costPerKg)}/kg
            </span>
          </div>
        </Card>

        {/* Live before/after on the margin table */}
        <Card stripe={dirty ? "primary" : undefined}>
          <CardHeader
            title="Impact on per-product margin"
            subtitle="Before is the build-up as this screen opened; after is what the whole app is using right now."
            agentId="PRC"
            divided
            className="mb-4"
          />
          <Table dense caption="Per-product margin before and after">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th numeric>Sell ₹/kg</Th>
                <Th numeric>Before</Th>
                <Th numeric>After</Th>
                <Th numeric>Change</Th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((product) => {
                const before = baseline.current.margins[product.code] ?? 0;
                const after = marginPerKg(product.code, data.costConfig);
                const delta = round2(after - before);
                return (
                  <tr key={product.code}>
                    <Td>
                      <span className="block truncate font-semibold">{product.categoryLabel}</span>
                      <span className="block truncate text-xs text-j-ink-3">
                        {product.patternLabel}
                      </span>
                    </Td>
                    <Td numeric muted>
                      {inrPaise(product.pricePerKg)}
                    </Td>
                    <Td numeric muted>
                      {inrPaise(before)}
                    </Td>
                    <Td
                      numeric
                      strong
                      className={cn(
                        after < 0
                          ? "text-j-danger"
                          : after < data.costConfig.targetMargin
                            ? "text-j-warn"
                            : "text-j-success",
                      )}
                    >
                      {inrPaise(after)}
                    </Td>
                    <Td numeric className={delta === 0 ? "text-j-ink-3" : delta > 0 ? "text-j-success" : "text-j-danger"}>
                      {delta === 0 ? "—" : `${delta > 0 ? "+" : "−"}${inrPaise(Math.abs(delta))}`}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <p className="mt-3 text-xs text-j-ink-3">
            Margin per bundle is 25× the per-kg figure. A product in amber is below the ₹
            {data.costConfig.targetMargin.toFixed(2)}/kg target; in red it is being sold below cost.
          </p>
        </Card>
      </Split>

      {/* The three open BRD items */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="GST rate & HSN"
            eyebrow="Open item D1"
            subtitle="Paperboard normally sits in the 4823 family at 12%. The BRD's example code is a placeholder."
            icon={<FileText />}
            agentId="GST"
            divided
            className="mb-4"
            actions={
              <Badge tone="warn" size="xs">
                Pending Ajay
              </Badge>
            }
          />
          <div className="space-y-3">
            <Field label="GST rate" hint="Applied to taxable value on every invoice.">
              <div className="flex items-center gap-2">
                {[0.05, 0.12, 0.18].map((rate) => (
                  <Button
                    key={rate}
                    size="sm"
                    variant={data.settings.gstRate === rate ? "solid" : "outline"}
                    tone={data.settings.gstRate === rate ? "primary" : "neutral"}
                    onClick={() => {
                      updateSettings({ gstRate: rate });
                      say(
                        "GST",
                        `GST rate set to ${(rate * 100).toFixed(0)}% — the sample 2 t invoice is now ${inr(
                          round2((impact.sample.subtotal + impact.sample.deliveryCharge) * (1 + rate)),
                        )} inclusive.`,
                      );
                    }}
                  >
                    {(rate * 100).toFixed(0)}%
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="Default HSN" hint="Printed on every GST invoice.">
              <TextInput
                inputSize="sm"
                mono
                value={data.settings.defaultHsn}
                onChange={(e) => updateSettings({ defaultHsn: e.target.value })}
              />
            </Field>
            <Field label="Seller GSTIN" hint="Telangana registration — intra-state sales split CGST/SGST.">
              <TextInput
                inputSize="sm"
                mono
                value={data.settings.sellerGstin}
                onChange={(e) => updateSettings({ sellerGstin: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Daily-wage basis"
            eyebrow="Open item D5"
            subtitle="How a monthly salary becomes a daily wage. 26 is the working assumption until Ajay confirms."
            icon={<CalendarClock />}
            agentId="WRK"
            divided
            className="mb-4"
            actions={
              <Badge tone="warn" size="xs">
                Pending Ajay
              </Badge>
            }
          />
          <div className="space-y-3">
            <Field label="Working-days divisor" hint="Changing this rewrites every stored daily wage.">
              <div className="flex items-center gap-2">
                {[24, 26, 30].map((divisor) => (
                  <Button
                    key={divisor}
                    size="sm"
                    variant={data.settings.workingDaysDivisor === divisor ? "solid" : "outline"}
                    tone={data.settings.workingDaysDivisor === divisor ? "primary" : "neutral"}
                    onClick={() => {
                      updateSettings({ workingDaysDivisor: divisor });
                      say(
                        "WRK",
                        `Wage divisor set to ${divisor} — an operator on ₹23,000 now earns ${inr(
                          dailyWage(23000, divisor),
                        )} a day, and this month's payroll is recomputed.`,
                      );
                    }}
                  >
                    ÷ {divisor}
                  </Button>
                ))}
              </div>
            </Field>
            <dl className="space-y-1.5 rounded-xl bg-j-surface-2 px-3 py-3 text-[13px]">
              <ImpactRow
                label="Operator (₹23,000/month)"
                value={`${inr(dailyWage(23000, data.settings.workingDaysDivisor))} / day`}
              />
              <ImpactRow
                label="Helper (₹14,000/month)"
                value={`${inr(dailyWage(14000, data.settings.workingDaysDivisor))} / day`}
              />
              <ImpactRow
                label="Payroll booked this month"
                value={inr(impact.payroll.total)}
                strong
              />
              <ImpactRow
                label="Break-even at this labour rate"
                value={tons(impact.fullMonthBreakEvenKg)}
              />
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Delivery policy"
            eyebrow="Open item D6"
            subtitle="Free above a threshold, flat below it, until Ajay decides between free, flat and by-distance."
            icon={<Truck />}
            agentId="DSP"
            divided
            className="mb-4"
            actions={
              <Badge tone="warn" size="xs">
                Pending Ajay
              </Badge>
            }
          />
          <div className="space-y-3">
            <Field label="Free delivery at or above" hint="Orders lighter than this pay the flat charge.">
              <TextInput
                inputSize="sm"
                inputMode="numeric"
                suffix="kg"
                mono
                value={String(data.settings.freeDeliveryThresholdKg)}
                onChange={(e) =>
                  updateSettings({
                    freeDeliveryThresholdKg: Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                  })
                }
              />
            </Field>
            <Field label="Flat delivery charge" hint="Added before GST on lighter orders.">
              <TextInput
                inputSize="sm"
                inputMode="numeric"
                prefix="₹"
                mono
                value={String(data.settings.deliveryChargeFlat)}
                onChange={(e) =>
                  updateSettings({
                    deliveryChargeFlat: Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                  })
                }
              />
            </Field>
            <p className="text-xs text-j-ink-3">
              {(data.settings.freeDeliveryThresholdKg / KG_PER_BUNDLE).toFixed(0)} bundles (
              {tons(data.settings.freeDeliveryThresholdKg)}) is the current cut-off.
            </p>
          </div>
        </Card>
      </div>

      {/* One live invoice, so the settings are not abstract */}
      <Card>
        <CardHeader
          title="Sample invoice, priced live"
          subtitle="4 lots of Plain Thin — 2 t — quoted through the same engine as the storefront cart, at the settings above."
          agentId="GST"
          divided
          className="mb-4"
        />
        <Split ratio="1/1">
          <dl className="space-y-2 text-sm">
            <ImpactRow
              label={`4 lots × ${KG_PER_LOT} kg`}
              value={`${tons(impact.sample.totalWeightKg)} · ${impact.sample.totalBundles} bundles`}
            />
            <ImpactRow label="Taxable value (ex-GST)" value={inr(impact.sample.subtotal)} />
            <ImpactRow
              label="Delivery"
              value={
                impact.sample.deliveryCharge > 0
                  ? inr(impact.sample.deliveryCharge)
                  : `Free — over ${tons(data.settings.freeDeliveryThresholdKg)}`
              }
            />
            <ImpactRow
              label={`CGST @ ${((data.settings.gstRate / 2) * 100).toFixed(1)}%`}
              value={inr(impact.gst.cgst)}
            />
            <ImpactRow
              label={`SGST @ ${((data.settings.gstRate / 2) * 100).toFixed(1)}%`}
              value={inr(impact.gst.sgst)}
            />
            <ImpactRow label="Invoice total" value={inr(impact.sample.total)} strong />
            <ImpactRow
              label="Standard margin on this order"
              value={`${inr(impact.sample.margin)} · ${pct(impact.sample.marginPct)}`}
            />
          </dl>

          <div className="space-y-3 rounded-xl bg-j-surface-2 px-4 py-4 text-[13px] leading-relaxed text-j-ink-2">
            <p className="flex items-center gap-1.5 font-semibold text-j-ink">
              <ArrowRight className="h-4 w-4 text-j-primary" aria-hidden="true" />
              What these assumptions are driving right now
            </p>
            <ul className="space-y-1.5">
              <li>
                Standard cost <strong className="text-j-ink">{inrPaise(costPerKg)}/kg</strong> — the
                basis for every margin figure in Sales and Profit / Loss.
              </li>
              <li>
                HSN <strong className="j-mono text-j-ink">{data.settings.defaultHsn}</strong> at{" "}
                <strong className="text-j-ink">{(data.settings.gstRate * 100).toFixed(0)}%</strong> on
                every invoice the storefront issues.
              </li>
              <li>
                Wage divisor <strong className="text-j-ink">{data.settings.workingDaysDivisor}</strong>{" "}
                — {inr(impact.payroll.total)} of payroll booked into this month's P&L.
              </li>
              <li>
                Break-even{" "}
                <strong className="text-j-ink">
                  {(impact.fullMonthBreakEvenKg / KG_PER_TON).toFixed(2)} t a month
                </strong>{" "}
                at the current roster of {inr(impact.rosterCost)}.
              </li>
            </ul>
            <p className="text-xs text-j-ink-3">
              D1, D5 and D6 are open items in the BRD. They are settings here rather than constants
              precisely because the client has not confirmed them yet.
            </p>
          </div>
        </Split>
      </Card>
    </AdminPage>
  );
}

function ImpactRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-j-ink-2">{label}</dt>
      <dd className={cn("num tabular-nums", strong ? "font-semibold text-j-ink" : "text-j-ink")}>
        {value}
      </dd>
    </div>
  );
}
