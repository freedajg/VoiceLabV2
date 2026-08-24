/**
 * FR-A-02 — Dashboard home.
 *
 * The at-a-glance tiles come straight out of `computeDashboard`, so the figures
 * here are the same ones the four modules show; there is no second calculation
 * to drift. Under them sits the only part of this screen that is opinionated:
 * a "needs your attention" strip that turns three of those tiles into work —
 * money owed past its limit, leads going cold, and orders sold below target
 * margin — each deep-linking into the module that can fix it.
 */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  Boxes,
  Factory,
  Inbox,
  ReceiptIndianRupee,
  ShoppingCart,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
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
  EmptyState,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Td,
  Th,
  Tr,
  chartAxisProps,
  chartGridProps,
  cn,
  useChartTheme,
} from "../../ui";
import {
  KG_PER_BUNDLE,
  KG_PER_TON,
  computeDashboard,
  computeLedger,
  dateShort,
  duesByCustomer,
  eachDay,
  inr,
  inrCompact,
  inrPaise,
  orderMarginPerKg,
  rangeFor,
  round2,
  tons,
} from "../../domain";
import type { Order } from "../../domain/types";
import {
  AdminPage,
  BAR_RADIUS,
  MAX_BAR,
  NO_ANIM,
  PRINT_AREA_ID,
  Split,
  TODAY,
  chartTooltip,
  monthlyRows,
  useAdminData,
  type MonthRow,
} from "./shared";

/** Last 14 days of revenue, for the sparkline on the money tiles. */
function trailingRevenue(days: { date: string; revenue: number }[], count: number): number[] {
  return days
    .filter((d) => d.date <= TODAY)
    .slice(-count)
    .map((d) => d.revenue);
}

export function AdminDashboard() {
  const { data, input } = useAdminData();
  const theme = useChartTheme("product");

  const view = useMemo(() => {
    const snapshot = computeDashboard(input, TODAY, data.enquiries);
    const months = monthlyRows(input);
    const year = rangeFor("yearly", TODAY);
    const dues = duesByCustomer(input);

    // Everything owed, per customer, next to the ceiling Ajay set for them —
    // that comparison is the whole point of the alert.
    const overLimit = dues
      .map((row) => {
        const ledger = computeLedger(input, row.customerId);
        return {
          ...row,
          limit: ledger.customer.creditLimit,
          approved: ledger.customer.creditApproved,
          over: round2(row.due - ledger.customer.creditLimit),
        };
      })
      .filter((row) => row.over > 0)
      .sort((a, b) => b.over - a.over);

    const monthRange = rangeFor("monthly", TODAY);
    const lowMargin: Order[] = data.orders
      .filter(
        (o) =>
          o.status !== "cancelled" &&
          o.placedAt >= monthRange.from &&
          o.placedAt <= monthRange.to &&
          orderMarginPerKg(o) < input.costConfig.targetMargin,
      )
      .sort((a, b) => orderMarginPerKg(a) - orderMarginPerKg(b));

    const newEnquiries = data.enquiries
      .filter((e) => e.status === "new")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return {
      snapshot,
      months,
      overLimit,
      lowMargin,
      newEnquiries,
      debtorCount: dues.length,
      trailing: trailingRevenue(dailyRevenue(data.orders, year.from, TODAY), 14),
      monthDaysBooked: Number(TODAY.slice(8, 10)),
      monthDaysTotal: eachDay(monthRange.from, monthRange.to).length,
    };
  }, [data, input]);

  const { snapshot, months, overLimit, lowMargin, newEnquiries } = view;
  const attention = overLimit.length + newEnquiries.length + lowMargin.length;

  return (
    <AdminPage
      eyebrow="Admin portal"
      title="Ajay's dashboard"
      subtitle={`Every figure below is computed from the live order book — ${data.orders.length} orders, ${data.customers.length} customers — as at ${dateShort(TODAY)} 2026.`}
      agentId="ORCH"
      actions={
        <Badge tone={attention > 0 ? "warn" : "success"} size="md" dot>
          {attention > 0 ? `${attention} items need you` : "Nothing outstanding"}
        </Badge>
      }
    >
      <div id={PRINT_AREA_ID} className="space-y-6">
        <StatGrid columns={3}>
          <StatCell>
            <Stat
              label="Today's orders"
              value={snapshot.todayOrders}
              unit="orders"
              icon={<ShoppingCart />}
              tone="primary"
              agentId="ORCH"
              hint={`Booked on ${dateShort(TODAY)}`}
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Today's revenue"
              value={inr(snapshot.todayRevenue)}
              icon={<BadgeIndianRupee />}
              trend={view.trailing}
              trendLabel="Daily revenue, last 14 days"
              hint="Ex-GST, cancelled orders excluded"
              agentId="PRC"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Month revenue"
              value={inr(snapshot.monthRevenue)}
              icon={<ReceiptIndianRupee />}
              hint={`${view.monthDaysBooked} of ${view.monthDaysTotal} days booked`}
              agentId="FIN"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Month profit (actual)"
              value={inr(snapshot.monthProfit)}
              tone={snapshot.monthProfit >= 0 ? "success" : "danger"}
              icon={<Wallet />}
              hint="Revenue − payroll, raw material, power, upkeep, transport"
              agentId="FIN"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Dues outstanding"
              value={inr(snapshot.duesOutstanding)}
              tone={snapshot.duesOutstanding > 0 ? "warn" : "neutral"}
              icon={<Wallet />}
              hint={`${view.debtorCount} customers owing`}
              agentId="PAY"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="New enquiries"
              value={snapshot.newEnquiries}
              unit="leads"
              tone={snapshot.newEnquiries > 0 ? "info" : "neutral"}
              icon={<Inbox />}
              hint="Untouched since they arrived"
              agentId="LED"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Low-margin orders"
              value={snapshot.lowMarginOrders}
              unit="this month"
              tone={snapshot.lowMarginOrders > 0 ? "warn" : "success"}
              icon={<TrendingDown />}
              hint={`Below the ₹${input.costConfig.targetMargin.toFixed(2)}/kg target`}
              agentId="PRC"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Active headcount"
              value={snapshot.activeEmployees}
              unit="on the books"
              icon={<Users />}
              agentId="WRK"
              hint="Attendance drives the payroll line in P&L"
            />
          </StatCell>
          <StatCell>
            <Stat
              label="Tonnes this month"
              value={snapshot.tonnesThisMonth.toFixed(2)}
              unit="t"
              icon={<Factory />}
              agentId="FIN"
              hint={`${((snapshot.tonnesThisMonth * KG_PER_TON) / KG_PER_BUNDLE).toFixed(0)} bundles despatched`}
            />
          </StatCell>
        </StatGrid>

        <Split ratio="2/1">
          <Card className="j-print-break">
            <CardHeader
              title="Revenue by month"
              subtitle="Ex-GST value of every non-cancelled order, by the month it was placed."
              agentId="FIN"
              divided
              className="mb-4"
              icon={<Boxes />}
            />
            <ChartFrame height={260}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} margin={{ top: 18, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid {...chartGridProps(theme)} />
                  <XAxis dataKey="label" {...chartAxisProps(theme)} />
                  <YAxis
                    {...chartAxisProps(theme)}
                    width={58}
                    tickFormatter={(v: number) => inrCompact(v)}
                  />
                  <Tooltip
                    cursor={{ fill: theme.grid }}
                    content={chartTooltip<MonthRow>((row) => ({
                      title: row.partial ? `${row.label} (part month)` : row.label,
                      rows: [
                        { label: "Revenue", value: inr(row.revenue), color: theme.series[0] },
                        { label: "Tonnes", value: tons(row.weightKg) },
                        { label: "Actual profit", value: inr(row.actualProfit) },
                      ],
                    }))}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={theme.series[0]}
                    radius={BAR_RADIUS}
                    maxBarSize={MAX_BAR}
                    {...NO_ANIM}
                  >
                    {months.map((row) => (
                      <Cell
                        key={row.month}
                        fill={theme.series[0]}
                        fillOpacity={row.partial ? 0.45 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
            <p className="mt-2 text-xs text-j-ink-3">
              {months[months.length - 1]?.label} is faded because it is only part-booked —{" "}
              {view.monthDaysBooked} days of trading so far.
            </p>
          </Card>

          <Card className="j-print-break">
            <CardHeader
              title="Where the money sits"
              subtitle="Collected against outstanding, across the whole book."
              agentId="PAY"
              divided
              className="mb-4"
            />
            <DuesTable />
          </Card>
        </Split>

        <section className="space-y-3 j-no-print">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-j-ink sm:text-xl">Needs your attention</h2>
              <p className="mt-1 text-sm text-j-ink-2">
                Three checks the orchestrator runs on every refresh. Each one opens the module that
                can clear it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <AttentionCard
              tone="danger"
              icon={<Wallet />}
              title="Dues past the credit limit"
              count={overLimit.length}
              agentId="PAY"
              href="/admin/customers?flag=over-limit"
              cta="Open Customers"
              empty="No buyer is over the ceiling Ajay set."
            >
              {overLimit.slice(0, 4).map((row) => (
                <li key={row.customerId} className="flex items-baseline justify-between gap-3">
                  <Link
                    to={`/admin/customers?customer=${row.customerId}`}
                    className="truncate text-[13px] font-semibold text-j-ink hover:text-j-primary hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="num shrink-0 text-[13px] tabular-nums text-j-danger">
                    {inr(row.over)} over
                  </span>
                </li>
              ))}
            </AttentionCard>

            <AttentionCard
              tone="info"
              icon={<Inbox />}
              title="New enquiries"
              count={newEnquiries.length}
              agentId="LED"
              href="/admin/enquiries?status=new"
              cta="Open Enquiries"
              empty="Every lead has been picked up."
            >
              {newEnquiries.slice(0, 4).map((enquiry) => (
                <li key={enquiry.id} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-semibold text-j-ink">
                    {enquiry.name}
                  </span>
                  <span className="num shrink-0 text-[13px] tabular-nums text-j-ink-2">
                    {enquiry.estTonnage ? `${enquiry.estTonnage} t` : dateShort(enquiry.createdAt)}
                  </span>
                </li>
              ))}
            </AttentionCard>

            <AttentionCard
              tone="warn"
              icon={<TrendingDown />}
              title="Orders below target margin"
              count={lowMargin.length}
              agentId="PRC"
              href="/admin/pnl?view=orders&filter=low-margin"
              cta="Open Profit / Loss"
              empty="Every order this month cleared the target."
            >
              {lowMargin.slice(0, 4).map((order) => (
                <li key={order.id} className="flex items-baseline justify-between gap-3">
                  <span className="j-mono truncate text-[12px] text-j-ink">{order.orderNo}</span>
                  <span className="num shrink-0 text-[13px] tabular-nums text-j-warn">
                    {inrPaise(orderMarginPerKg(order))}/kg
                  </span>
                </li>
              ))}
            </AttentionCard>
          </div>
        </section>
      </div>
    </AdminPage>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function AttentionCard({
  tone,
  icon,
  title,
  count,
  href,
  cta,
  empty,
  agentId,
  children,
}: {
  tone: "danger" | "warn" | "info";
  icon: ReactNode;
  title: string;
  count: number;
  href: string;
  cta: string;
  empty: string;
  agentId: "PAY" | "LED" | "PRC";
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <Card stripe={count > 0 ? tone : "neutral"} className="flex flex-col">
      <CardHeader
        title={title}
        eyebrow={`${count} ${count === 1 ? "item" : "items"}`}
        icon={icon}
        agentId={agentId}
      />
      <div className="mt-4 min-h-[5.5rem] flex-1">
        {count === 0 ? (
          <p className="text-[13px] text-j-ink-2">{empty}</p>
        ) : (
          <ul className="space-y-2">{children}</ul>
        )}
      </div>
      <div className="mt-4">
        <Button
          variant="soft"
          tone={count > 0 ? tone : "neutral"}
          size="sm"
          iconRight={<ArrowRight />}
          onClick={() => navigate(href)}
        >
          {cta}
        </Button>
      </div>
    </Card>
  );
}

/** Paid vs outstanding across the whole book, with the five biggest debtors. */
function DuesTable() {
  const { input } = useAdminData();
  const rows = useMemo(() => duesByCustomer(input).slice(0, 6), [input]);
  const totals = useMemo(() => {
    const live = input.orders.filter((o) => o.status !== "cancelled");
    return {
      billed: round2(live.reduce((s, o) => s + o.total, 0)),
      collected: round2(live.reduce((s, o) => s + o.paidAmount, 0)),
      due: round2(live.reduce((s, o) => s + o.dueAmount, 0)),
    };
  }, [input]);

  if (rows.length === 0) {
    return <EmptyState size="sm" title="Nothing outstanding" description="Every order is settled." />;
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Billed", value: totals.billed, tone: "text-j-ink" },
          { label: "Collected", value: totals.collected, tone: "text-j-success" },
          { label: "Due", value: totals.due, tone: "text-j-warn" },
        ].map((cell) => (
          <div key={cell.label} className="rounded-xl bg-j-surface-2 px-2 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              {cell.label}
            </dt>
            <dd className={cn("num mt-1 text-[15px] font-semibold tabular-nums", cell.tone)}>
              {inrCompact(cell.value)}
            </dd>
          </div>
        ))}
      </dl>

      <Table dense caption="Customers with the largest outstanding balance">
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th numeric>Due</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.customerId} interactive>
              <Td>
                <Link
                  to={`/admin/customers?customer=${row.customerId}`}
                  className="hover:text-j-primary hover:underline"
                >
                  {row.name}
                </Link>
              </Td>
              <Td numeric strong>
                {inr(row.due)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

/** Daily revenue across a window, straight off the orders. */
function dailyRevenue(orders: Order[], from: string, to: string): { date: string; revenue: number }[] {
  const perDay = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const day = order.placedAt.slice(0, 10);
    if (day < from || day > to) continue;
    perDay.set(day, round2((perDay.get(day) ?? 0) + order.subtotal));
  }
  return eachDay(from, to).map((date) => ({ date, revenue: perDay.get(date) ?? 0 }));
}
