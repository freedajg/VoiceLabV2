/**
 * Module 4 — Profit / Loss (FR-A-13, FR-A-14, FR-A-15's consequences).
 *
 * The BRD asks for two different profit views and they are kept visibly apart,
 * because conflating them is exactly how a mill fools itself:
 *
 *   View 1 — per product and per order at the standard ₹20.20/kg build-up. A
 *            pricing tool. It answers "should I sell this at this price?".
 *   View 2 — the period P&L: real revenue against real bills, with payroll
 *            taken from the Employees module rather than the cost ledger.
 *
 * The gap between them is the variance, and the reason the variance exists is
 * the break-even tonnage: the standard model charges ₹4/kg for labour, but the
 * wage bill is fixed at ₹1,29,000/month, so below ~32 t a month the ₹4 never
 * covers it. That finding is written out in words, not left as a number.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { AlertTriangle, Calculator, Gauge, Scale, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Button,
  Card,
  CardHeader,
  ChartFrame,
  ChartLegend,
  DataGridToolbar,
  EmptyState,
  Pill,
  ProgressMeter,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Tabs,
  TabPanel,
  Td,
  Th,
  chartAxisProps,
  chartGridProps,
  cn,
  useChartTheme,
  type SortDirection,
} from "../../ui";
import {
  KG_PER_BUNDLE,
  KG_PER_TON,
  PRODUCTS,
  PRODUCT_BY_CODE,
  computePnl,
  dateShort,
  inr,
  inrCompact,
  inrPaise,
  kg,
  marginPerBundle,
  marginPerKg,
  orderMarginPerKg,
  pct,
  rangeFor,
  rosterMonthlyCost,
  round2,
  standardCostPerKg,
  tons,
} from "../../domain";
import { useUiStore } from "../../store/uiStore";
import {
  AdminPage,
  BAR_RADIUS,
  MAX_BAR,
  NO_ANIM,
  PRINT_AREA_ID,
  PeriodSwitch,
  ReconcileNote,
  Split,
  TODAY,
  chartTooltip,
  monthlyRows,
  paginate,
  useAdminData,
  type MonthRow,
} from "./shared";

type ViewId = "orders" | "period";
type OrderSort = "date" | "revenue" | "profit" | "perKg";

const PAGE_SIZE = 12;

export function AdminPnl() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<ViewId>(() =>
    params.get("view") === "orders" ? "orders" : "period",
  );

  function switchView(next: ViewId) {
    setView(next);
    const p = new URLSearchParams(params);
    p.set("view", next);
    setParams(p, { replace: true });
  }

  return (
    <AdminPage
      eyebrow="Module 4"
      title="Profit / Loss"
      crumb="Profit / Loss"
      subtitle="Two views, deliberately separate: the modelled margin on any order, and the real profit for a period."
      agentId="FIN"
      below={
        <Tabs<ViewId>
          label="Profit views"
          value={view}
          onChange={switchView}
          items={[
            { id: "period", label: "Period P&L (actual)", icon: <Scale /> },
            { id: "orders", label: "Per-order margin (standard)", icon: <Calculator /> },
          ]}
        />
      }
    >
      <div id={PRINT_AREA_ID} className="space-y-6">
        <TabPanel tabId="period" active={view === "period"}>
          <PeriodView />
        </TabPanel>
        <TabPanel tabId="orders" active={view === "orders"}>
          <OrderView />
        </TabPanel>
      </div>
    </AdminPage>
  );
}

/* ── View 1 — per product and per order, at standard cost (FR-A-13) ────── */

function OrderView() {
  const { data, input } = useAdminData();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [onlyLow, setOnlyLow] = useState(params.get("filter") === "low-margin");
  const [sort, setSort] = useState<{ key: OrderSort; dir: SortDirection }>({
    key: "date",
    dir: "desc",
  });
  const [page, setPage] = useState(0);

  const costPerKg = standardCostPerKg(input.costConfig);
  const target = input.costConfig.targetMargin;

  const rows = useMemo(() => {
    const nameById = new Map(data.customers.map((c) => [c.id, c.name]));
    return data.orders
      .filter((o) => o.status !== "cancelled")
      .map((order) => ({
        order,
        customer: nameById.get(order.customerId) ?? order.customerId,
        cost: round2(order.totalWeightKg * costPerKg),
        perKg: orderMarginPerKg(order),
      }));
  }, [data, costPerKg]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = rows.filter((row) => {
      if (onlyLow && row.perKg >= target) return false;
      if (!q) return true;
      return `${row.order.orderNo} ${row.customer}`.toLowerCase().includes(q);
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      switch (sort.key) {
        case "date":
          return (a.order.placedAt < b.order.placedAt ? -1 : 1) * dir;
        case "revenue":
          return (a.order.subtotal - b.order.subtotal) * dir;
        case "profit":
          return (a.order.margin - b.order.margin) * dir;
        case "perKg":
          return (a.perKg - b.perKg) * dir;
      }
    });
  }, [rows, query, onlyLow, sort, target]);

  const totals = useMemo(
    () => ({
      revenue: round2(filtered.reduce((s, r) => s + r.order.subtotal, 0)),
      cost: round2(filtered.reduce((s, r) => s + r.cost, 0)),
      profit: round2(filtered.reduce((s, r) => s + r.order.margin, 0)),
      weightKg: filtered.reduce((s, r) => s + r.order.totalWeightKg, 0),
    }),
    [filtered],
  );

  const pageRows = paginate(filtered, page, PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  function toggleSort(key: OrderSort) {
    setPage(0);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  function toggleLow(next: boolean) {
    setOnlyLow(next);
    setPage(0);
    const p = new URLSearchParams(params);
    if (next) p.set("filter", "low-margin");
    else p.delete("filter");
    setParams(p, { replace: true });
  }

  return (
    <div className="space-y-6">
      {/* The BRD §6.3 table, recomputed live from the cost config. */}
      <Card>
        <CardHeader
          title="Margin per product at standard cost"
          subtitle={`BRD §6.3, recomputed from the live cost build-up — ${inrPaise(costPerKg)}/kg today. Change a line in Cost assumptions and this table moves.`}
          agentId="PRC"
          divided
          className="mb-4"
        />
        <Table caption="Per-product margin at standard cost">
          <thead>
            <tr>
              <Th>Product</Th>
              <Th numeric>Sell ₹/kg</Th>
              <Th numeric>Standard cost ₹/kg</Th>
              <Th numeric>Margin ₹/kg</Th>
              <Th numeric>Margin ₹/bundle (25 kg)</Th>
              <Th numeric>Margin %</Th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((product) => {
              const perKg = marginPerKg(product.code, input.costConfig);
              const good = perKg >= target;
              return (
                <tr key={product.code}>
                  <Td strong>
                    <span className="block">{product.name}</span>
                    <span className="block text-xs font-normal text-j-ink-3">
                      {product.categoryLabel} · {product.patternLabel}
                    </span>
                  </Td>
                  <Td numeric>{inrPaise(product.pricePerKg)}</Td>
                  <Td numeric muted>
                    {inrPaise(costPerKg)}
                  </Td>
                  <Td numeric strong className={perKg < 0 ? "text-j-danger" : good ? "text-j-success" : "text-j-warn"}>
                    {perKg >= 0 ? "+" : ""}
                    {inrPaise(perKg)}
                  </Td>
                  <Td numeric className={perKg < 0 ? "text-j-danger" : undefined}>
                    {perKg >= 0 ? "+" : ""}
                    {inrPaise(marginPerBundle(product.code, input.costConfig))}
                  </Td>
                  <Td numeric muted>
                    {pct(perKg / product.pricePerKg)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <p className="mt-3 text-xs text-j-ink-3">
          Pattern charge is treated as pure additional revenue (BRD assumption 3). A product below
          the ₹{target.toFixed(2)}/kg target is amber; below zero it is sold at a loss.
        </p>
      </Card>

      <StatGrid columns={4}>
        <StatCell>
          <Stat label="Orders shown" value={filtered.length} unit={`of ${rows.length}`} agentId="FIN" />
        </StatCell>
        <StatCell>
          <Stat label="Selling price" value={inrCompact(totals.revenue)} hint="Ex-GST" agentId="PRC" />
        </StatCell>
        <StatCell>
          <Stat
            label="Cost price at standard"
            value={inrCompact(totals.cost)}
            hint={`${tons(totals.weightKg)} × ${inrPaise(costPerKg)}/kg`}
            agentId="FIN"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Profit at standard"
            value={inrCompact(totals.profit)}
            tone={totals.profit >= 0 ? "success" : "danger"}
            hint={`${totals.weightKg > 0 ? inrPaise(totals.profit / totals.weightKg) : "—"} per kg`}
            agentId="FIN"
          />
        </StatCell>
      </StatGrid>

      <ReconcileNote
        label="FR-A-13 check —"
        leftLabel="selling − cost"
        rightLabel="profit column"
        left={round2(totals.revenue - totals.cost)}
        right={totals.profit}
      />

      <Card>
        <CardHeader
          title="Profit per order"
          subtitle="Cost price, selling price and profit for every live order, at the standard build-up."
          agentId="FIN"
          divided
          className="mb-4"
        />
        <DataGridToolbar
          search={{
            value: query,
            onChange: (v) => {
              setQuery(v);
              setPage(0);
            },
            placeholder: "Order number or customer",
            label: "Search orders",
          }}
          count={{ shown: filtered.length, total: rows.length, noun: "orders" }}
          filters={
            <>
              <Pill selected={!onlyLow} onClick={() => toggleLow(false)}>
                All orders
              </Pill>
              <Pill selected={onlyLow} tone="warn" onClick={() => toggleLow(true)}>
                Below ₹{target.toFixed(2)}/kg target
              </Pill>
            </>
          }
        />

        <div className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState size="sm" title="No orders match" />
          ) : (
            <Table dense striped caption="Per-order margin">
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th sortable sortDirection={sort.key === "date" ? sort.dir : null} onSort={() => toggleSort("date")}>
                    Date
                  </Th>
                  <Th>Customer</Th>
                  <Th numeric>Weight</Th>
                  <Th numeric sortable sortDirection={sort.key === "revenue" ? sort.dir : null} onSort={() => toggleSort("revenue")}>
                    Selling price
                  </Th>
                  <Th numeric>Cost price</Th>
                  <Th numeric sortable sortDirection={sort.key === "profit" ? sort.dir : null} onSort={() => toggleSort("profit")}>
                    Profit
                  </Th>
                  <Th numeric sortable sortDirection={sort.key === "perKg" ? sort.dir : null} onSort={() => toggleSort("perKg")}>
                    ₹/kg
                  </Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.order.id}>
                    <Td mono nowrap>
                      {row.order.orderNo}
                    </Td>
                    <Td muted nowrap>
                      {dateShort(row.order.placedAt)}
                    </Td>
                    <Td>
                      <span className="block max-w-[14rem] truncate">{row.customer}</span>
                      <span className="block text-xs text-j-ink-3">
                        {row.order.lines
                          .map((l) => `${PRODUCT_BY_CODE[l.productCode].categoryLabel} ${l.qty}${l.unit === "lot" ? "L" : "B"}`)
                          .join(" · ")}
                      </span>
                    </Td>
                    <Td numeric muted>
                      {kg(row.order.totalWeightKg)}
                    </Td>
                    <Td numeric>{inr(row.order.subtotal)}</Td>
                    <Td numeric muted>
                      {inr(row.cost)}
                    </Td>
                    <Td numeric strong className={row.order.margin < 0 ? "text-j-danger" : undefined}>
                      {inr(row.order.margin)}
                    </Td>
                    <Td
                      numeric
                      className={cn(
                        row.perKg < 0 ? "text-j-danger" : row.perKg < target ? "text-j-warn" : "text-j-success",
                      )}
                    >
                      {inrPaise(row.perKg)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {pageCount > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="num text-xs tabular-nums text-j-ink-3">
              Page {page + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/* ── View 2 — the period P&L (FR-A-14) ─────────────────────────────────── */

interface BridgeBar {
  key: string;
  label: string;
  /** Invisible plinth the visible segment sits on. */
  base: number;
  value: number;
  kind: "total" | "cost";
  amount: number;
}

function PeriodView() {
  const { data, input } = useAdminData();
  const period = useUiStore((s) => s.adminPeriod);
  const setPeriod = useUiStore((s) => s.setAdminPeriod);
  const theme = useChartTheme("product");

  const view = useMemo(() => {
    const range = rangeFor(period, TODAY);
    const pnl = computePnl(input, range);
    const months = monthlyRows(input);
    const costPerKg = standardCostPerKg(input.costConfig);

    // Line-by-line: what the model said this tonnage should cost, against what
    // was actually booked. This is the variance, explained.
    const modelled = {
      rawMaterial: round2(pnl.weightKg * input.costConfig.rawMaterial),
      labour: round2(pnl.weightKg * input.costConfig.labour),
      electricity: round2(pnl.weightKg * input.costConfig.electricity),
      maintenance: round2(pnl.weightKg * input.costConfig.maintenance),
      transport: round2(pnl.weightKg * input.costConfig.transport),
    };
    const lines = [
      { key: "rawMaterial", label: "Raw material", modelled: modelled.rawMaterial, actual: pnl.actualCosts.rawMaterial },
      { key: "labour", label: "Labour / payroll", modelled: modelled.labour, actual: pnl.actualCosts.payroll },
      { key: "electricity", label: "Electricity", modelled: modelled.electricity, actual: pnl.actualCosts.electricity },
      { key: "maintenance", label: "Maintenance", modelled: modelled.maintenance, actual: pnl.actualCosts.maintenance },
      { key: "transport", label: "Transport", modelled: modelled.transport, actual: pnl.actualCosts.transport },
      { key: "other", label: "Other / sundries", modelled: 0, actual: pnl.actualCosts.other },
    ].map((line) => ({ ...line, delta: round2(line.actual - line.modelled) }));

    const worst = [...lines].sort((a, b) => b.delta - a.delta)[0];

    // The bridge from revenue to actual profit.
    const bridge: BridgeBar[] = [];
    bridge.push({ key: "revenue", label: "Revenue", base: 0, value: pnl.revenue, kind: "total", amount: pnl.revenue });
    let running = pnl.revenue;
    for (const line of lines) {
      if (line.actual <= 0) continue;
      running = round2(running - line.actual);
      bridge.push({
        key: line.key,
        label: line.label,
        base: running,
        value: line.actual,
        kind: "cost",
        amount: -line.actual,
      });
    }
    bridge.push({
      key: "profit",
      label: "Actual profit",
      base: Math.min(0, pnl.actualProfit),
      value: Math.abs(pnl.actualProfit),
      kind: "total",
      amount: pnl.actualProfit,
    });

    // Break-even: the tonnage at which the ₹/kg labour line finally pays the
    // wage bill. Two readings — this period's, and a full month at full roster.
    const rosterCost = rosterMonthlyCost(data.employees);
    const fullMonthBreakEvenKg =
      input.costConfig.labour > 0 ? round2(rosterCost / input.costConfig.labour) : 0;

    return {
      range,
      pnl,
      months,
      lines,
      worst,
      bridge,
      costPerKg,
      rosterCost,
      fullMonthBreakEvenKg,
      coverage: pnl.breakEvenKg > 0 ? pnl.weightKg / pnl.breakEvenKg : 0,
    };
  }, [data, input, period]);

  const { pnl, range, lines, bridge, months } = view;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSwitch value={period} onChange={setPeriod} />
        <span className="text-[13px] text-j-ink-2">
          {range.label} · {dateShort(range.from)} – {dateShort(range.to)} · {tons(pnl.weightKg)} shipped
        </span>
      </div>

      <StatGrid columns={4}>
        <StatCell>
          <Stat label="Revenue (ex-GST)" value={inr(pnl.revenue)} agentId="PRC" hint="GST is collected, not earned" />
        </StatCell>
        <StatCell>
          <Stat label="Actual costs" value={inr(pnl.actualCosts.total)} agentId="FIN" hint="Bills booked + payroll from Module 3" />
        </StatCell>
        <StatCell>
          <Stat
            label="Actual profit"
            value={inr(pnl.actualProfit)}
            tone={pnl.actualProfit >= 0 ? "success" : "danger"}
            hint={`${pct(pnl.revenue > 0 ? pnl.actualProfit / pnl.revenue : 0)} of revenue`}
            agentId="FIN"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Variance vs model"
            value={`${pnl.variance >= 0 ? "+" : ""}${inr(pnl.variance)}`}
            tone={pnl.variance >= 0 ? "success" : "danger"}
            hint={`Standard profit ${inr(pnl.standardProfit)}`}
            agentId="FIN"
          />
        </StatCell>
      </StatGrid>

      <ReconcileNote
        label={`FR-A-14 check for ${range.label} —`}
        leftLabel="revenue − all actual costs"
        rightLabel="actual profit"
        left={round2(pnl.revenue - pnl.actualCosts.total)}
        right={pnl.actualProfit}
      />

      <Split ratio="2/1">
        <Card className="j-print-break">
          <CardHeader
            title={`Revenue to profit — ${range.label}`}
            subtitle="Every rupee of revenue, and where it went."
            agentId="FIN"
            divided
            className="mb-4"
          />
          {pnl.revenue === 0 ? (
            <EmptyState size="sm" title="Nothing booked in this period" />
          ) : (
            <>
              <ChartFrame height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bridge} margin={{ top: 18, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid {...chartGridProps(theme)} />
                    <XAxis dataKey="label" interval={0} {...chartAxisProps(theme)} tick={{ fill: theme.axis, fontSize: 10 }} />
                    <YAxis width={58} tickFormatter={(v: number) => inrCompact(v)} {...chartAxisProps(theme)} />
                    <ReferenceLine y={0} stroke={theme.grid} />
                    <Tooltip
                      cursor={{ fill: theme.grid }}
                      content={chartTooltip<BridgeBar>((row) => ({
                        title: row.label,
                        rows: [
                          {
                            label: row.kind === "cost" ? "Cost" : "Total",
                            value: `${row.amount >= 0 ? "" : "−"}${inr(Math.abs(row.amount))}`,
                            color: row.kind === "cost" ? theme.diverging.negative : theme.series[0],
                          },
                          {
                            label: "Running balance",
                            value: inr(round2(row.base + (row.kind === "cost" ? row.value : row.amount >= 0 ? row.value : 0))),
                          },
                        ],
                      }))}
                    />
                    <Bar dataKey="base" stackId="bridge" fill="transparent" {...NO_ANIM} />
                    <Bar dataKey="value" stackId="bridge" radius={BAR_RADIUS} maxBarSize={MAX_BAR} {...NO_ANIM}>
                      {bridge.map((bar) => (
                        <Cell
                          key={bar.key}
                          fill={
                            bar.kind === "cost"
                              ? theme.diverging.negative
                              : bar.amount >= 0
                                ? theme.series[0]
                                : theme.diverging.negative
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
              <ChartLegend
                className="mt-1"
                items={[
                  { label: "Revenue and profit", color: theme.series[0] },
                  { label: "Cost taken out", color: theme.diverging.negative },
                ]}
              />
            </>
          )}
        </Card>

        <Card className="j-print-break">
          <CardHeader
            title="Actual cost breakdown"
            subtitle="Payroll comes from the Employees module, never from the bill ledger — booking it twice would halve the profit."
            agentId="WRK"
            divided
            className="mb-4"
          />
          <Table dense caption="Actual costs for the period">
            <thead>
              <tr>
                <Th>Cost line</Th>
                <Th numeric>Booked</Th>
                <Th numeric>% of revenue</Th>
              </tr>
            </thead>
            <tbody>
              {lines
                .filter((line) => line.actual > 0)
                .map((line) => (
                  <tr key={line.key}>
                    <Td>{line.label}</Td>
                    <Td numeric>{inr(line.actual)}</Td>
                    <Td numeric muted>
                      {pnl.revenue > 0 ? pct(line.actual / pnl.revenue) : "—"}
                    </Td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="bg-j-surface-2">
                <Td strong>Total costs</Td>
                <Td numeric strong>
                  {inr(pnl.actualCosts.total)}
                </Td>
                <Td numeric strong>
                  {pnl.revenue > 0 ? pct(pnl.actualCosts.total / pnl.revenue) : "—"}
                </Td>
              </tr>
            </tfoot>
          </Table>
          <p className="mt-3 text-xs text-j-ink-3">
            Payroll for this window is{" "}
            <Link to="/admin/employees" className="font-semibold text-j-primary hover:underline">
              {inr(pnl.actualCosts.payroll)} from the attendance sheet
            </Link>
            .
          </p>
        </Card>
      </Split>

      {/* The insight: standard vs actual, and the break-even tonnage. */}
      <Split ratio="1/1">
        <Card stripe={pnl.variance >= 0 ? "success" : "warn"} className="j-print-break">
          <CardHeader
            title="Standard vs actual — where the model is wrong"
            subtitle="What the ₹/kg build-up says this tonnage should have cost, against the bills that arrived."
            icon={<TrendingUp />}
            agentId="FIN"
            divided
            className="mb-4"
          />
          <Table dense caption="Standard versus actual cost by line">
            <thead>
              <tr>
                <Th>Line</Th>
                <Th numeric>Model</Th>
                <Th numeric>Actual</Th>
                <Th numeric>Variance</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key}>
                  <Td>{line.label}</Td>
                  <Td numeric muted>
                    {line.modelled > 0 ? inr(line.modelled) : "—"}
                  </Td>
                  <Td numeric>{inr(line.actual)}</Td>
                  <Td numeric strong className={line.delta > 0 ? "text-j-danger" : line.delta < 0 ? "text-j-success" : undefined}>
                    {line.delta === 0 ? "—" : `${line.delta > 0 ? "+" : "−"}${inr(Math.abs(line.delta))}`}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-j-surface-2">
                <Td strong>Profit</Td>
                <Td numeric strong>
                  {inr(pnl.standardProfit)}
                </Td>
                <Td numeric strong>
                  {inr(pnl.actualProfit)}
                </Td>
                <Td numeric strong className={pnl.variance >= 0 ? "text-j-success" : "text-j-danger"}>
                  {pnl.variance >= 0 ? "+" : "−"}
                  {inr(Math.abs(pnl.variance))}
                </Td>
              </tr>
            </tfoot>
          </Table>
          <p className="mt-3 text-[13px] leading-relaxed text-j-ink-2">
            {pnl.weightKg === 0
              ? "No tonnage in this window, so there is nothing to compare the model against."
              : pnl.variance >= 0
                ? `Reality beat the model by ${inr(pnl.variance)} this period. The biggest single gap is ${view.worst.label.toLowerCase()} at ${view.worst.delta >= 0 ? "+" : "−"}${inr(Math.abs(view.worst.delta))} against a modelled ${inr(view.worst.modelled)}.`
                : `The model is flattering the business by ${inr(Math.abs(pnl.variance))} this period. The biggest single gap is ${view.worst.label.toLowerCase()}: the build-up allows ${inr(view.worst.modelled)}, the bills came to ${inr(view.worst.actual)} — ${inr(Math.abs(view.worst.delta))} more.`}
          </p>
        </Card>

        <BreakEvenCard
          pnl={pnl}
          rosterCost={view.rosterCost}
          fullMonthBreakEvenKg={view.fullMonthBreakEvenKg}
          labourRate={input.costConfig.labour}
          periodLabel={range.label}
        />
      </Split>

      <Card className="j-print-break">
        <CardHeader
          title="Revenue against actual cost, by month"
          subtitle="Two measures on one rupee axis — the gap between the pair is the profit."
          agentId="FIN"
          divided
          className="mb-4"
        />
        <ChartFrame height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 18, right: 8, bottom: 4, left: 8 }} barGap={2}>
              <CartesianGrid {...chartGridProps(theme)} />
              <XAxis dataKey="label" {...chartAxisProps(theme)} />
              <YAxis width={58} tickFormatter={(v: number) => inrCompact(v)} {...chartAxisProps(theme)} />
              <Tooltip
                cursor={{ fill: theme.grid }}
                content={chartTooltip<MonthRow>((row) => ({
                  title: row.partial ? `${row.label} (part month)` : row.label,
                  rows: [
                    { label: "Revenue", value: inr(row.revenue), color: theme.series[0] },
                    { label: "Actual cost", value: inr(row.actualCost), color: theme.series[1] },
                    { label: "Actual profit", value: inr(row.actualProfit) },
                    { label: "Shipped", value: tons(row.weightKg) },
                  ],
                }))}
              />
              <Bar dataKey="revenue" fill={theme.series[0]} radius={BAR_RADIUS} maxBarSize={MAX_BAR} {...NO_ANIM} />
              <Bar dataKey="actualCost" fill={theme.series[1]} radius={BAR_RADIUS} maxBarSize={MAX_BAR} {...NO_ANIM} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
        <ChartLegend
          className="mt-1"
          items={[
            { label: "Revenue (ex-GST)", color: theme.series[0] },
            { label: "Actual cost", color: theme.series[1] },
          ]}
        />
        <Table dense className="mt-4" caption="Monthly profit and loss">
          <thead>
            <tr>
              <Th>Month</Th>
              <Th numeric>Shipped</Th>
              <Th numeric>Revenue</Th>
              <Th numeric>Actual cost</Th>
              <Th numeric>Actual profit</Th>
              <Th numeric>Standard profit</Th>
            </tr>
          </thead>
          <tbody>
            {months.map((row) => (
              <tr key={row.month} className={row.partial ? "opacity-70" : undefined}>
                <Td strong>
                  {row.label}
                  {row.partial ? <span className="ml-1 text-xs font-normal text-j-ink-3">part month</span> : null}
                </Td>
                <Td numeric muted>
                  {tons(row.weightKg)}
                </Td>
                <Td numeric>{inr(row.revenue)}</Td>
                <Td numeric>{inr(row.actualCost)}</Td>
                <Td numeric strong className={row.actualProfit >= 0 ? "text-j-success" : "text-j-danger"}>
                  {inr(row.actualProfit)}
                </Td>
                <Td numeric muted>
                  {inr(row.standardProfit)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

/* ── Break-even ────────────────────────────────────────────────────────── */

function BreakEvenCard({
  pnl,
  rosterCost,
  fullMonthBreakEvenKg,
  labourRate,
  periodLabel,
}: {
  pnl: ReturnType<typeof computePnl>;
  rosterCost: number;
  fullMonthBreakEvenKg: number;
  labourRate: number;
  periodLabel: string;
}) {
  const shortfallKg = round2(pnl.breakEvenKg - pnl.weightKg);
  const covered = shortfallKg <= 0;
  const bundles = Math.ceil(Math.abs(shortfallKg) / KG_PER_BUNDLE);

  return (
    <Card stripe={covered ? "success" : "danger"} className="j-print-break">
      <CardHeader
        title="Break-even tonnage"
        subtitle="The volume at which the ₹/kg labour line finally pays the real wage bill."
        icon={<Gauge />}
        agentId="FIN"
        divided
        className="mb-4"
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-j-surface-2 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Break-even, {periodLabel}
            </p>
            <p className="num mt-1 text-[22px] font-semibold text-j-ink">
              {(pnl.breakEvenKg / KG_PER_TON).toFixed(2)} t
            </p>
            <p className="mt-1 text-xs text-j-ink-3">
              {inr(pnl.actualCosts.payroll)} payroll ÷ ₹{labourRate.toFixed(2)}/kg
            </p>
          </div>
          <div className="rounded-xl bg-j-surface-2 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Shipped, {periodLabel}
            </p>
            <p className={cn("num mt-1 text-[22px] font-semibold", covered ? "text-j-success" : "text-j-danger")}>
              {(pnl.weightKg / KG_PER_TON).toFixed(2)} t
            </p>
            <p className="mt-1 text-xs text-j-ink-3">
              {covered ? `${(Math.abs(shortfallKg) / KG_PER_TON).toFixed(2)} t clear` : `${(shortfallKg / KG_PER_TON).toFixed(2)} t short`}
            </p>
          </div>
        </div>

        <ProgressMeter
          value={Math.min(pnl.weightKg, pnl.breakEvenKg * 1.5)}
          max={Math.max(pnl.breakEvenKg * 1.5, 1)}
          markerAt={pnl.breakEvenKg > 0 ? 1 / 1.5 : undefined}
          markerLabel="Break-even"
          tone={covered ? "success" : "danger"}
          label="Tonnage against break-even"
          valueLabel={`${tons(pnl.weightKg)} of ${tons(pnl.breakEvenKg)}`}
          hint="The marker is the point where wages are covered by the labour allowance."
        />

        <div className="rounded-xl bg-j-warn-soft px-3 py-3 text-[13px] leading-relaxed text-j-ink-2">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-j-ink">
            <AlertTriangle className="h-4 w-4 text-j-warn" aria-hidden="true" />
            What this means
          </p>
          <p>
            The standard cost model charges ₹{labourRate.toFixed(2)} a kilo for labour, but wages are
            a fixed monthly bill of {inr(rosterCost)} at the current roster. Those two only meet at{" "}
            <strong className="font-semibold text-j-ink">
              {(fullMonthBreakEvenKg / KG_PER_TON).toFixed(2)} t a month
            </strong>
            . {periodLabel} has shipped {tons(pnl.weightKg)}
            {covered
              ? `, which is past its ${tons(pnl.breakEvenKg)} break-even — every further kilo carries its full ₹${labourRate.toFixed(2)} of margin.`
              : `, which is ${tons(shortfallKg)} — about ${bundles} bundles — short of the ${tons(pnl.breakEvenKg)} needed to cover the wages actually booked in it.`}
          </p>
        </div>

        <p className="text-xs text-j-ink-3">
          Add a hand, or change the labour rate in Cost assumptions, and this whole panel moves.
        </p>
      </div>
    </Card>
  );
}
