/**
 * Module 2 — Sales portal (FR-A-06, FR-A-07, FR-A-08).
 *
 * One period switch scopes the entire screen; every panel below re-reads the
 * same `computeSales` result, so the category table, the product table, the
 * trend and the region split cannot disagree with each other. The reconciliation
 * strip proves it on screen: Σ product revenue = period revenue = Σ order
 * subtotals, to the paisa.
 *
 * Export is real — the CSV is built here and handed to the browser as a Blob.
 */
import { useMemo, useState } from "react";
import { Download, Printer, Scale } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ChartFrame,
  ChartLegend,
  EmptyState,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Td,
  Th,
  chartAxisProps,
  chartGridProps,
  cn,
  useChartTheme,
} from "../../ui";
import {
  KG_PER_BUNDLE,
  KG_PER_LOT,
  PRODUCT_BY_CODE,
  REGION_LABELS,
  computeSales,
  dateShort,
  inr,
  inrCompact,
  inrPaise,
  kg,
  pct,
  rangeFor,
  round2,
  tons,
} from "../../domain";
import type { Region, SalesByProduct } from "../../domain/types";
import { useUiStore } from "../../store/uiStore";
import {
  AdminPage,
  BAR_RADIUS,
  BAR_RADIUS_H,
  MAX_BAR,
  NO_ANIM,
  PRINT_AREA_ID,
  PeriodSwitch,
  ReconcileNote,
  Split,
  TODAY,
  categoryRollup,
  chartTooltip,
  downloadCsv,
  printReport,
  useAdminData,
  useAgentPulse,
} from "./shared";

interface RegionRow {
  region: Region;
  label: string;
  orders: number;
  weightKg: number;
  revenue: number;
  share: number;
}

export function AdminSales() {
  const { data, input } = useAdminData();
  const period = useUiStore((s) => s.adminPeriod);
  const setPeriod = useUiStore((s) => s.setAdminPeriod);
  const theme = useChartTheme("product");
  const { say } = useAgentPulse();
  const [exported, setExported] = useState(false);

  const view = useMemo(() => {
    const range = rangeFor(period, TODAY);
    const sales = computeSales(input, range);
    const categories = categoryRollup(sales.byProduct);

    const orders = data.orders.filter(
      (o) => o.status !== "cancelled" && o.placedAt >= range.from && o.placedAt <= range.to,
    );

    const byRegion = new Map<Region, RegionRow>();
    for (const order of orders) {
      const row = byRegion.get(order.region) ?? {
        region: order.region,
        label: REGION_LABELS[order.region],
        orders: 0,
        weightKg: 0,
        revenue: 0,
        share: 0,
      };
      row.orders += 1;
      row.weightKg += order.totalWeightKg;
      row.revenue = round2(row.revenue + order.subtotal);
      byRegion.set(order.region, row);
    }
    const regions = [...byRegion.values()]
      .map((row) => ({ ...row, share: sales.revenue > 0 ? row.revenue / sales.revenue : 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    // The spot-check: the sum of the per-order subtotals behind this period.
    const orderSubtotalSum = round2(orders.reduce((s, o) => s + o.subtotal, 0));
    const productRevenueSum = round2(sales.byProduct.reduce((s, p) => s + p.revenue, 0));

    return {
      range,
      sales,
      categories,
      regions,
      orderSubtotalSum,
      productRevenueSum,
      moved: sales.byProduct.filter((p) => p.weightKg > 0),
      trend: sales.series.filter((d) => d.date <= TODAY),
    };
  }, [data, input, period]);

  const { sales, range, categories, regions, trend } = view;
  const avgPerKg = sales.weightKg > 0 ? sales.revenue / sales.weightKg : 0;

  function handleExport() {
    const rows: (string | number)[][] = [
      ["Jaggula Samson Mill Boards — sales report"],
      ["Period", range.label, `${range.from} to ${range.to}`],
      ["Generated", TODAY],
      [],
      ["Category", "Bundles", "Lots", "Weight (kg)", "Revenue (INR, ex-GST)", "Standard margin (INR)"],
      ...categories.map((c) => [c.label, c.bundles, c.lots, c.weightKg, c.revenue, c.margin]),
      [],
      ["Product", "Code", "Bundles", "Lots", "Weight (kg)", "Revenue (INR, ex-GST)", "Standard margin (INR)"],
      ...sales.byProduct.map((p) => [
        p.productName,
        p.productCode,
        p.bundles,
        p.lots,
        p.weightKg,
        p.revenue,
        p.margin,
      ]),
      [],
      ["Region", "Orders", "Weight (kg)", "Revenue (INR, ex-GST)"],
      ...regions.map((r) => [r.label, r.orders, r.weightKg, r.revenue]),
      [],
      ["Day", "Orders", "Weight (kg)", "Revenue (INR, ex-GST)"],
      ...trend.map((d) => [d.date, d.orders, d.weightKg, d.revenue]),
      [],
      ["TOTAL", sales.orderCount, sales.weightKg, sales.revenue, sales.margin],
    ];
    downloadCsv(`jsmb-sales-${period}-${range.from}.csv`, rows);
    setExported(true);
    say(
      "PRC",
      `Sales report exported — ${range.label}: ${sales.orderCount} orders, ${tons(sales.weightKg)}, ${inr(sales.revenue)} ex-GST.`,
    );
  }

  return (
    <AdminPage
      eyebrow="Module 2"
      title="Sales"
      crumb="Sales"
      subtitle="Bundles and lots sold by product category, with revenue by product, period and region."
      agentId="PRC"
      actions={
        <>
          <Button size="sm" variant="outline" iconLeft={<Printer />} onClick={printReport}>
            Print / PDF
          </Button>
          <Button size="sm" tone="primary" iconLeft={<Download />} onClick={handleExport}>
            Export CSV
          </Button>
        </>
      }
      below={
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSwitch value={period} onChange={setPeriod} />
          <span className="text-[13px] text-j-ink-2">
            {range.label} · {dateShort(range.from)} – {dateShort(range.to)}
          </span>
          {exported ? (
            <Badge tone="success" size="sm" dot>
              CSV downloaded
            </Badge>
          ) : null}
        </div>
      }
    >
      <div id={PRINT_AREA_ID} className="space-y-6">
        <StatGrid columns={4}>
          <StatCell>
            <Stat label="Orders" value={sales.orderCount} unit={range.label} agentId="PRC" />
          </StatCell>
          <StatCell>
            <Stat
              label="Sold"
              value={tons(sales.weightKg)}
              hint={`${Math.round(sales.bundles)} bundles · ${round2(sales.weightKg / KG_PER_LOT)} lots`}
              agentId="TON"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Revenue (ex-GST)"
              value={inr(sales.revenue)}
              hint={`${inrPaise(avgPerKg)} realised per kg`}
              agentId="PRC"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Standard margin"
              value={inr(sales.margin)}
              tone={sales.margin >= 0 ? "success" : "danger"}
              hint={`${pct(sales.revenue > 0 ? sales.margin / sales.revenue : 0)} of revenue`}
              agentId="FIN"
            />
          </StatCell>
        </StatGrid>

        <ReconcileNote
          label={`FR-A-07 check for ${range.label} —`}
          leftLabel="Σ product revenue"
          rightLabel="Σ order subtotals"
          left={view.productRevenueSum}
          right={view.orderSubtotalSum}
        />

        {sales.orderCount === 0 ? (
          <EmptyState
            kraft
            title={`No orders in ${range.label}`}
            description="Widen the period — the seeded book runs from January to today."
          />
        ) : (
          <>
            <Split ratio="2/1">
              <Card className="j-print-break">
                <CardHeader
                  title="Revenue trend"
                  subtitle={`Ex-GST revenue per day across ${range.label}.`}
                  agentId="PRC"
                  divided
                  className="mb-4"
                />
                <TrendChart data={trend} theme={theme} />
              </Card>

              <Card className="j-print-break">
                <CardHeader
                  title="Region split"
                  subtitle="Where the boards went."
                  agentId="DSP"
                  divided
                  className="mb-4"
                  icon={<Scale />}
                />
                <div className="space-y-4">
                  <div
                    className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
                    role="img"
                    aria-label={regions
                      .map((r) => `${r.label} ${pct(r.share)}`)
                      .join(", ")}
                  >
                    {regions.map((row, i) => (
                      <span
                        key={row.region}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                        style={{
                          width: `${Math.max(row.share * 100, 1)}%`,
                          backgroundColor: theme.series[i] ?? theme.other,
                        }}
                      />
                    ))}
                  </div>
                  <ChartLegend
                    items={regions.map((row, i) => ({
                      label: `${row.label} · ${pct(row.share)}`,
                      color: theme.series[i] ?? theme.other,
                    }))}
                  />
                  <Table dense caption="Revenue by region">
                    <thead>
                      <tr>
                        <Th>Region</Th>
                        <Th numeric>Orders</Th>
                        <Th numeric>Tonnes</Th>
                        <Th numeric>Revenue</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {regions.map((row) => (
                        <tr key={row.region}>
                          <Td>{row.label}</Td>
                          <Td numeric>{row.orders}</Td>
                          <Td numeric>{tons(row.weightKg)}</Td>
                          <Td numeric strong>
                            {inr(row.revenue)}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </Split>

            <Card className="j-print-break">
              <CardHeader
                title="Bundles and lots by product category"
                subtitle="FR-A-06 — the four categories of the BRD catalogue, for the selected period."
                agentId="CAT"
                divided
                className="mb-4"
              />
              <Table caption="Sales by product category">
                <thead>
                  <tr>
                    <Th>Category</Th>
                    <Th numeric>Bundles</Th>
                    <Th numeric>Lots</Th>
                    <Th numeric>Weight</Th>
                    <Th numeric>Revenue</Th>
                    <Th numeric>Standard margin</Th>
                    <Th numeric>₹/kg realised</Th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((row) => (
                    <tr key={row.key}>
                      <Td strong>{row.label}</Td>
                      <Td numeric>{Math.round(row.bundles)}</Td>
                      <Td numeric>{row.lots}</Td>
                      <Td numeric muted>
                        {kg(row.weightKg)}
                      </Td>
                      <Td numeric strong>
                        {inr(row.revenue)}
                      </Td>
                      <Td numeric className={row.margin >= 0 ? "text-j-success" : "text-j-danger"}>
                        {inr(row.margin)}
                      </Td>
                      <Td numeric muted>
                        {row.weightKg > 0 ? inrPaise(row.revenue / row.weightKg) : "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-j-surface-2">
                    <Td strong>All categories</Td>
                    <Td numeric strong>
                      {Math.round(sales.bundles)}
                    </Td>
                    <Td numeric strong>
                      {round2(sales.weightKg / KG_PER_LOT)}
                    </Td>
                    <Td numeric strong>
                      {kg(sales.weightKg)}
                    </Td>
                    <Td numeric strong>
                      {inr(sales.revenue)}
                    </Td>
                    <Td numeric strong>
                      {inr(sales.margin)}
                    </Td>
                    <Td numeric strong>
                      {inrPaise(avgPerKg)}
                    </Td>
                  </tr>
                </tfoot>
              </Table>
            </Card>

            <Card className="j-print-break">
              <CardHeader
                title="Revenue by product"
                subtitle="FR-A-07 — all seven variants, ranked. Rows that did not move stay in the table at zero."
                agentId="PRC"
                divided
                className="mb-4"
              />
              <Split ratio="1/1">
                <ChartFrame height={Math.max(220, view.moved.length * 34 + 40)}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={view.moved}
                      margin={{ top: 4, right: 76, bottom: 4, left: 4 }}
                    >
                      <CartesianGrid {...chartGridProps(theme)} horizontal={false} vertical />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="productCode"
                        width={64}
                        {...chartAxisProps(theme)}
                      />
                      <Tooltip
                        cursor={{ fill: theme.grid }}
                        content={chartTooltip<SalesByProduct>((row) => ({
                          title: row.productName,
                          rows: [
                            { label: "Revenue", value: inr(row.revenue), color: theme.series[0] },
                            { label: "Bundles", value: String(Math.round(row.bundles)) },
                            { label: "Standard margin", value: inr(row.margin) },
                          ],
                        }))}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={theme.series[0]}
                        radius={BAR_RADIUS_H}
                        maxBarSize={MAX_BAR}
                        label={{
                          position: "right",
                          fill: theme.ink2,
                          fontSize: 11,
                          // recharts' RenderableText spans string | number |
                          // boolean | null | undefined, so accept unknown and
                          // narrow here rather than restating their union.
                          formatter: (value: unknown) => inrCompact(Number(value ?? 0)),
                        }}
                        {...NO_ANIM}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>

                <Table dense caption="Revenue and margin by product">
                  <thead>
                    <tr>
                      <Th>Product</Th>
                      <Th numeric>Bundles</Th>
                      <Th numeric>Revenue</Th>
                      <Th numeric>Margin ₹/kg</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.byProduct.map((row) => (
                      <tr key={row.productCode} className={row.weightKg === 0 ? "opacity-45" : undefined}>
                        <Td>
                          <span className="block truncate font-semibold">
                            {PRODUCT_BY_CODE[row.productCode].categoryLabel}
                          </span>
                          <span className="block truncate text-xs text-j-ink-3">
                            {PRODUCT_BY_CODE[row.productCode].patternLabel} ·{" "}
                            {inrPaise(PRODUCT_BY_CODE[row.productCode].pricePerKg)}/kg list
                          </span>
                        </Td>
                        <Td numeric>{Math.round(row.bundles)}</Td>
                        <Td numeric strong>
                          {inr(row.revenue)}
                        </Td>
                        <Td
                          numeric
                          className={cn(
                            row.weightKg === 0
                              ? "text-j-ink-3"
                              : row.margin / row.weightKg >= input.costConfig.targetMargin
                                ? "text-j-success"
                                : "text-j-warn",
                          )}
                        >
                          {row.weightKg > 0 ? inrPaise(row.margin / row.weightKg) : "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Split>
              <p className="mt-3 text-xs text-j-ink-3">
                Bundles are derived: weight ÷ {KG_PER_BUNDLE} kg. Margin is at the standard cost
                currently set in Cost assumptions, so editing that page moves this column.
              </p>
            </Card>
          </>
        )}
      </div>
    </AdminPage>
  );
}

/* ── Trend ─────────────────────────────────────────────────────────────── */

interface TrendPoint {
  date: string;
  revenue: number;
  weightKg: number;
  orders: number;
}

/**
 * A single measure over time. Few points (a day, a week) read better as
 * columns; a month or a year is a line. Either way it is one series, so the
 * chart needs no legend — the panel title names it.
 */
function TrendChart({ data, theme }: { data: TrendPoint[]; theme: ReturnType<typeof useChartTheme> }) {
  const tooltip = chartTooltip<TrendPoint>((row) => ({
    title: dateShort(row.date),
    rows: [
      { label: "Revenue", value: inr(row.revenue), color: theme.series[0] },
      { label: "Orders", value: String(row.orders) },
      { label: "Weight", value: kg(row.weightKg) },
    ],
  }));

  if (data.length === 0) {
    return <EmptyState size="sm" title="No days in range" />;
  }

  const asColumns = data.length <= 14;

  return (
    <ChartFrame height={260}>
      <ResponsiveContainer width="100%" height="100%">
        {asColumns ? (
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid {...chartGridProps(theme)} />
            <XAxis dataKey="date" tickFormatter={dateShort} {...chartAxisProps(theme)} />
            <YAxis width={58} tickFormatter={(v: number) => inrCompact(v)} {...chartAxisProps(theme)} />
            <Tooltip cursor={{ fill: theme.grid }} content={tooltip} />
            <Bar dataKey="revenue" radius={BAR_RADIUS} maxBarSize={MAX_BAR} {...NO_ANIM}>
              {data.map((point) => (
                <Cell key={point.date} fill={theme.series[0]} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 8 }}>
            <CartesianGrid {...chartGridProps(theme)} />
            <XAxis dataKey="date" tickFormatter={dateShort} minTickGap={28} {...chartAxisProps(theme)} />
            <YAxis width={58} tickFormatter={(v: number) => inrCompact(v)} {...chartAxisProps(theme)} />
            <Tooltip content={tooltip} cursor={{ stroke: theme.axis, strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={theme.series[0]}
              strokeWidth={2}
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
              {...NO_ANIM}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartFrame>
  );
}
