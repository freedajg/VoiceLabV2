/**
 * Reporting engines — BRD §8.3 (Sales), §8.5 (Profit/Loss), §8.2 (ledger)
 * and §11 (Reports & Analytics).
 *
 * Everything here is a pure function of an `AnalyticsInput` snapshot so the
 * admin surfaces, the command centre and the tests all agree by construction.
 */
import type {
  AnalyticsInput,
  ComputeLedgerFn,
  ComputePnlFn,
  ComputeSalesFn,
  DashboardSnapshot,
} from "../contracts/engines";
import type {
  CustomerLedgerEntry,
  Enquiry,
  Order,
  PeriodRange,
  ProductCode,
  ProfitAndLoss,
  SalesByProduct,
} from "./types";
import { KG_PER_BUNDLE, KG_PER_LOT, KG_PER_TON, PRODUCTS } from "./constants";
import { round2 } from "./format";
import { computePayroll } from "./payroll";
import { eachDay, inRange, rangeFor } from "./periods";
import { standardCostPerKg } from "./pricing";

/**
 * A cancelled order never happened as far as the books are concerned, and only
 * orders placed inside the window count towards it.
 */
function ordersIn(orders: Order[], range: PeriodRange): Order[] {
  return orders.filter((o) => o.status !== "cancelled" && inRange(o.placedAt, range));
}

/* ── Sales ─────────────────────────────────────────────────────────────── */

export const computeSales: ComputeSalesFn = (input, range) => {
  const orders = ordersIn(input.orders, range);

  // Seed a row per SKU so the chart axis is stable across periods; rows with no
  // movement simply read zero rather than disappearing.
  const byCode = new Map<ProductCode, SalesByProduct>(
    PRODUCTS.map((p) => [
      p.code,
      {
        productCode: p.code,
        productName: p.name,
        bundles: 0,
        lots: 0,
        weightKg: 0,
        revenue: 0,
        margin: 0,
      },
    ]),
  );

  const perDay = new Map<string, { revenue: number; weightKg: number; orders: number }>();
  for (const day of eachDay(range.from, range.to)) {
    perDay.set(day, { revenue: 0, weightKg: 0, orders: 0 });
  }

  let weightKg = 0;
  let revenue = 0;
  let margin = 0;

  for (const order of orders) {
    weightKg += order.totalWeightKg;
    revenue += order.subtotal;
    margin += order.margin;

    const day = perDay.get(order.placedAt.slice(0, 10));
    if (day) {
      day.revenue = round2(day.revenue + order.subtotal);
      day.weightKg += order.totalWeightKg;
      day.orders += 1;
    }

    for (const line of order.lines) {
      const row = byCode.get(line.productCode);
      if (!row) continue;
      row.weightKg += line.weightKg;
      row.revenue = round2(row.revenue + line.linePrice);
      row.margin = round2(row.margin + line.lineMargin);
    }
  }

  const byProduct = [...byCode.values()]
    .map((row) => ({
      ...row,
      bundles: row.weightKg / KG_PER_BUNDLE,
      lots: round2(row.weightKg / KG_PER_LOT),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    range,
    orderCount: orders.length,
    bundles: weightKg / KG_PER_BUNDLE,
    weightKg,
    revenue: round2(revenue),
    margin: round2(margin),
    byProduct,
    series: [...perDay.entries()].map(([date, v]) => ({ date, ...v })),
  };
};

/* ── Profit & Loss ─────────────────────────────────────────────────────── */

export const computePnl: ComputePnlFn = (input, range) => {
  const orders = ordersIn(input.orders, range);

  // Revenue is ex-GST. GST is collected on the government's behalf and paid
  // straight back out, so booking it as revenue would inflate profit by 12%.
  const revenue = round2(orders.reduce((s, o) => s + o.subtotal, 0));
  const weightKg = orders.reduce((s, o) => s + o.totalWeightKg, 0);

  const standardCost = round2(weightKg * standardCostPerKg(input.costConfig));
  const standardProfit = round2(revenue - standardCost);

  // Payroll is ALWAYS derived from the Employees module (BRD §6.4 view 2), never
  // read from the cost ledger — booking it in both places would double-count it.
  const payroll = round2(
    computePayroll(input.employees, input.attendance, input.bonuses, range, input.settings).total,
  );

  const booked = { rawMaterial: 0, electricity: 0, maintenance: 0, transport: 0, other: 0 };
  for (const entry of input.actualCosts) {
    if (!inRange(entry.date, range)) continue;
    switch (entry.category) {
      case "raw-material": booked.rawMaterial += entry.amount; break;
      case "electricity": booked.electricity += entry.amount; break;
      case "maintenance": booked.maintenance += entry.amount; break;
      case "transport": booked.transport += entry.amount; break;
      case "payroll": break; // deliberately ignored — see note above
      case "other": booked.other += entry.amount; break;
    }
  }

  const actualCosts = {
    rawMaterial: round2(booked.rawMaterial),
    electricity: round2(booked.electricity),
    maintenance: round2(booked.maintenance),
    transport: round2(booked.transport),
    payroll,
    other: round2(booked.other),
    total: round2(
      booked.rawMaterial + booked.electricity + booked.maintenance + booked.transport + booked.other + payroll,
    ),
  };

  const actualProfit = round2(revenue - actualCosts.total);

  const pnl: ProfitAndLoss = {
    range,
    revenue,
    weightKg,
    standardCost,
    standardProfit,
    actualCosts,
    actualProfit,
    variance: round2(actualProfit - standardProfit),
    /**
     * The headline insight of the demo. The standard cost model charges ₹4/kg
     * for labour; real payroll is a fixed monthly bill. Divide one by the other
     * and you get the tonnage at which that ₹4/kg line finally covers the wage
     * bill — below it the mill is paying people to stand still.
     */
    breakEvenKg: input.costConfig.labour > 0 ? round2(payroll / input.costConfig.labour) : 0,
  };
  return pnl;
};

/* ── Customer ledger ───────────────────────────────────────────────────── */

export const computeLedger: ComputeLedgerFn = (input, customerId) => {
  const customer = input.customers.find((c) => c.id === customerId);
  if (!customer) throw new Error(`Unknown customer: ${customerId}`);

  const entries: CustomerLedgerEntry[] = input.orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1))
    .map((o) => ({
      orderId: o.id,
      orderNo: o.orderNo,
      date: o.placedAt,
      total: o.total,
      paid: o.paidAmount,
      due: o.dueAmount,
      status: o.status,
    }));

  // Cancelled orders stay visible in the ledger but must not move the money.
  const live = entries.filter((e) => e.status !== "cancelled");
  const totalOrdered = round2(live.reduce((s, e) => s + e.total, 0));
  const totalPaid = round2(live.reduce((s, e) => s + e.paid, 0));
  const totalDue = round2(live.reduce((s, e) => s + e.due, 0));

  return {
    customer,
    entries,
    totalOrdered,
    totalPaid,
    totalDue,
    creditAvailable: round2(customer.creditLimit - totalDue),
  };
};

/** Total money owed to the mill right now, across every live order. */
export function totalDuesOutstanding(orders: Order[]): number {
  return round2(
    orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.dueAmount, 0),
  );
}

/* ── Dashboard (FR-A-02) ───────────────────────────────────────────────── */

/** Margin per kilogram actually earned on an order, at standard cost. */
export function orderMarginPerKg(order: Order): number {
  return order.totalWeightKg > 0 ? order.margin / order.totalWeightKg : 0;
}

/**
 * `enquiries` is optional because `AnalyticsInput` does not carry them; admin
 * surfaces pass the live list so the "new enquiries" tile is real.
 */
export function computeDashboard(
  input: AnalyticsInput,
  todayISO: string,
  enquiries: Enquiry[] = [],
): DashboardSnapshot {
  const today = todayISO.slice(0, 10);
  const month = rangeFor("monthly", today);

  const live = input.orders.filter((o) => o.status !== "cancelled");
  const todaysOrders = live.filter((o) => o.placedAt.slice(0, 10) === today);
  const monthOrders = live.filter((o) => inRange(o.placedAt, month));

  const monthPnl = computePnl(input, month);

  return {
    todayOrders: todaysOrders.length,
    todayRevenue: round2(todaysOrders.reduce((s, o) => s + o.subtotal, 0)),
    monthRevenue: monthPnl.revenue,
    monthProfit: monthPnl.actualProfit,
    duesOutstanding: totalDuesOutstanding(input.orders),
    newEnquiries: enquiries.filter((e) => e.status === "new").length,
    lowMarginOrders: monthOrders.filter(
      (o) => orderMarginPerKg(o) < input.costConfig.targetMargin,
    ).length,
    activeEmployees: input.employees.filter((e) => e.status === "active").length,
    tonnesThisMonth: round2(monthOrders.reduce((s, o) => s + o.totalWeightKg, 0) / KG_PER_TON),
  };
}

/** Products ranked by revenue for the period — used by the mix chart. */
export function topProducts(input: AnalyticsInput, range: PeriodRange, limit = 5): SalesByProduct[] {
  return computeSales(input, range).byProduct.slice(0, limit);
}

/** Every customer with money outstanding, largest first (BRD §11 "dues by customer"). */
export function duesByCustomer(input: AnalyticsInput): { customerId: string; name: string; due: number }[] {
  const byCustomer = new Map<string, number>();
  for (const order of input.orders) {
    if (order.status === "cancelled" || order.dueAmount <= 0) continue;
    byCustomer.set(order.customerId, round2((byCustomer.get(order.customerId) ?? 0) + order.dueAmount));
  }
  return [...byCustomer.entries()]
    .map(([customerId, due]) => ({
      customerId,
      name: input.customers.find((c) => c.id === customerId)?.name ?? customerId,
      due,
    }))
    .sort((a, b) => b.due - a.due);
}
