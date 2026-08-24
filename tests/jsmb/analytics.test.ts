import { describe, expect, it } from "vitest";
import {
  computeDashboard,
  computeLedger,
  computePnl,
  computeSales,
  orderMarginPerKg,
  totalDuesOutstanding,
} from "../../src/jsmb/domain/analytics";
import { computePayroll } from "../../src/jsmb/domain/payroll";
import { eachDay, rangeFor } from "../../src/jsmb/domain/periods";
import { standardCostPerKg } from "../../src/jsmb/domain/pricing";
import { buildSeed } from "../../src/jsmb/domain/seed/dataset";
import { selectAnalyticsInput } from "../../src/jsmb/store/dataStore";
import { DEMO_TODAY, KG_PER_BUNDLE } from "../../src/jsmb/domain/constants";
import { round2 } from "../../src/jsmb/domain/format";

const seed = buildSeed();
const input = selectAnalyticsInput(seed);
const june = rangeFor("monthly", "2026-06-15");
const ytd = { key: "yearly" as const, label: "YTD", from: "2026-01-01", to: DEMO_TODAY };

describe("computeSales — FR-A-06, FR-A-07", () => {
  const sales = computeSales(input, ytd);

  it("reconciles the product rollup to the summary", () => {
    expect(round2(sales.byProduct.reduce((s, p) => s + p.revenue, 0))).toBe(sales.revenue);
    expect(sales.byProduct.reduce((s, p) => s + p.weightKg, 0)).toBe(sales.weightKg);
    expect(round2(sales.byProduct.reduce((s, p) => s + p.margin, 0))).toBe(sales.margin);
  });

  it("reconciles the summary to the underlying orders", () => {
    const orders = seed.orders.filter(
      (o) => o.status !== "cancelled" && o.placedAt >= ytd.from && o.placedAt <= ytd.to,
    );
    expect(sales.orderCount).toBe(orders.length);
    expect(sales.revenue).toBe(round2(orders.reduce((s, o) => s + o.subtotal, 0)));
    expect(sales.weightKg).toBe(orders.reduce((s, o) => s + o.totalWeightKg, 0));
    expect(sales.bundles).toBe(sales.weightKg / KG_PER_BUNDLE);
  });

  it("carries one row per SKU and one point per calendar day", () => {
    expect(sales.byProduct).toHaveLength(7);
    expect(sales.series).toHaveLength(eachDay(ytd.from, ytd.to).length);
    expect(round2(sales.series.reduce((s, d) => s + d.revenue, 0))).toBe(sales.revenue);
    expect(sales.series.reduce((s, d) => s + d.orders, 0)).toBe(sales.orderCount);
    // Zero-filled: quiet days are present with zeroes rather than missing.
    expect(sales.series.some((d) => d.orders === 0)).toBe(true);
  });

  it("ranks plain thin as the volume line and patterned thin as the margin line", () => {
    expect(sales.byProduct[0].productCode).toBe("P-PT");
    const perKg = (code: string) => {
      const row = sales.byProduct.find((p) => p.productCode === code)!;
      return row.margin / row.weightKg;
    };
    expect(perKg("PT-SB")).toBeGreaterThan(perKg("P-PT"));
  });
});

describe("computePnl — FR-A-14", () => {
  const pnl = computePnl(input, june);

  it("reconciles revenue less actual costs to actual profit", () => {
    expect(pnl.actualProfit).toBe(round2(pnl.revenue - pnl.actualCosts.total));
    const { rawMaterial, electricity, maintenance, transport, payroll, other, total } = pnl.actualCosts;
    expect(total).toBe(round2(rawMaterial + electricity + maintenance + transport + payroll + other));
  });

  it("keeps GST out of revenue", () => {
    const orders = seed.orders.filter(
      (o) => o.status !== "cancelled" && o.placedAt >= june.from && o.placedAt <= june.to,
    );
    expect(pnl.revenue).toBe(round2(orders.reduce((s, o) => s + o.subtotal, 0)));
    const withGst = round2(orders.reduce((s, o) => s + o.total, 0));
    expect(withGst).toBeGreaterThan(pnl.revenue);
  });

  it("derives payroll from the Employees module and never from the cost ledger", () => {
    const payroll = computePayroll(seed.employees, seed.attendance, seed.bonuses, june, seed.settings);
    expect(pnl.actualCosts.payroll).toBe(round2(payroll.total));
    expect(seed.actualCosts.some((c) => c.category === "payroll")).toBe(false);
  });

  it("computes the standard view at ₹20.20/kg", () => {
    expect(pnl.standardCost).toBe(round2(pnl.weightKg * standardCostPerKg(seed.costConfig)));
    expect(pnl.standardProfit).toBe(round2(pnl.revenue - pnl.standardCost));
    expect(pnl.variance).toBe(round2(pnl.actualProfit - pnl.standardProfit));
  });

  it("break-even is the tonnage at which the ₹4/kg labour line absorbs real payroll", () => {
    expect(pnl.breakEvenKg).toBe(round2(pnl.actualCosts.payroll / seed.costConfig.labour));
    // Roughly 31 t against a ₹1.25 L wage bill.
    expect(pnl.breakEvenKg).toBeGreaterThan(25_000);
    expect(pnl.breakEvenKg).toBeLessThan(40_000);
    // June ran well above break-even, which is why its variance is favourable.
    expect(pnl.weightKg).toBeGreaterThan(pnl.breakEvenKg);
    expect(pnl.variance).toBeGreaterThan(0);
  });

  it("lands the seeded June figures in a believable band for the mill", () => {
    expect(pnl.weightKg).toBeGreaterThan(30_000);
    expect(pnl.weightKg).toBeLessThan(70_000);
    expect(pnl.revenue).toBeGreaterThan(10_00_000);
    expect(pnl.revenue).toBeLessThan(20_00_000);
    expect(pnl.actualProfit).toBeGreaterThan(0);
    // The model and reality disagree, but only by a few percent of revenue.
    expect(Math.abs(pnl.variance) / pnl.revenue).toBeLessThan(0.1);
  });

  it("re-flows when a cost assumption is edited (FR-A-15)", () => {
    const dearer = computePnl({ ...input, costConfig: { ...input.costConfig, rawMaterial: 15 } }, june);
    expect(dearer.standardCost).toBeGreaterThan(pnl.standardCost);
    // Actual costs are booked bills, so they do not move with the model.
    expect(dearer.actualCosts.total).toBe(pnl.actualCosts.total);
  });
});

describe("computeLedger — FR-A-05", () => {
  it("rolls dues up across a customer's orders", () => {
    const customer = seed.customers.find((c) => c.creditApproved)!;
    const ledger = computeLedger(input, customer.id);

    const live = ledger.entries.filter((e) => e.status !== "cancelled");
    expect(ledger.totalOrdered).toBe(round2(live.reduce((s, e) => s + e.total, 0)));
    expect(ledger.totalPaid).toBe(round2(live.reduce((s, e) => s + e.paid, 0)));
    expect(ledger.totalDue).toBe(round2(live.reduce((s, e) => s + e.due, 0)));
    expect(round2(ledger.totalPaid + ledger.totalDue)).toBe(ledger.totalOrdered);
    expect(ledger.creditAvailable).toBe(round2(customer.creditLimit - ledger.totalDue));
  });

  it("throws on an unknown customer rather than returning an empty ledger", () => {
    expect(() => computeLedger(input, "cus-nope")).toThrow();
  });
});

describe("computeDashboard — FR-A-02", () => {
  const tiles = computeDashboard(input, DEMO_TODAY, seed.enquiries);

  it("matches the module data behind it", () => {
    expect(tiles.duesOutstanding).toBe(totalDuesOutstanding(seed.orders));
    expect(tiles.activeEmployees).toBe(seed.employees.filter((e) => e.status === "active").length);
    expect(tiles.newEnquiries).toBe(seed.enquiries.filter((e) => e.status === "new").length);

    const month = rangeFor("monthly", DEMO_TODAY);
    expect(tiles.monthRevenue).toBe(computePnl(input, month).revenue);
    expect(tiles.monthProfit).toBe(computePnl(input, month).actualProfit);
  });

  it("counts orders earning less per kg than the target margin", () => {
    const month = rangeFor("monthly", DEMO_TODAY);
    const expected = seed.orders.filter(
      (o) =>
        o.status !== "cancelled" &&
        o.placedAt >= month.from &&
        o.placedAt <= month.to &&
        orderMarginPerKg(o) < seed.costConfig.targetMargin,
    ).length;
    expect(tiles.lowMarginOrders).toBe(expected);
  });

  it("leaves the enquiry tile at zero when no enquiries are passed", () => {
    expect(computeDashboard(input, DEMO_TODAY).newEnquiries).toBe(0);
  });
});
