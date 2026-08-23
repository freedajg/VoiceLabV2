import { describe, it } from "vitest";
import { buildSeed } from "../../src/jsmb/domain/seed/dataset";
import { computePnl, computeSales, totalDuesOutstanding } from "../../src/jsmb/domain/analytics";
import { computePayroll } from "../../src/jsmb/domain/payroll";
import { rangeFor } from "../../src/jsmb/domain/periods";
import { selectAnalyticsInput } from "../../src/jsmb/store/dataStore";
import { DEMO_TODAY } from "../../src/jsmb/domain/constants";

describe("sanity", () => {
  it("prints", () => {
    const s = buildSeed();
    const input = selectAnalyticsInput(s);
    console.log("customers", s.customers.length, "orders", s.orders.length,
      "payments", s.payments.length, "invoices", s.invoices.length,
      "employees", s.employees.length, "attendance", s.attendance.length,
      "costs", s.actualCosts.length, "enquiries", s.enquiries.length);
    const all = { key: "yearly" as const, label: "all", from: "2026-01-01", to: DEMO_TODAY };
    const sales = computeSales(input, all);
    console.log("TOTAL revenue", Math.round(sales.revenue), "weight t", (sales.weightKg/1000).toFixed(1), "orders", sales.orderCount, "margin", Math.round(sales.margin));
    console.log("dues", Math.round(totalDuesOutstanding(s.orders)));
    for (const m of ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]) {
      const r = rangeFor("monthly", `${m}-15`);
      const p = computePnl(input, r);
      const pay = computePayroll(s.employees, s.attendance, s.bonuses, r, s.settings);
      console.log(m, "kg", Math.round(p.weightKg), "rev", Math.round(p.revenue),
        "stdCost", Math.round(p.standardCost), "stdProfit", Math.round(p.standardProfit),
        "actual", Math.round(p.actualCosts.total), "payroll", Math.round(p.actualCosts.payroll),
        "actProfit", Math.round(p.actualProfit), "var", Math.round(p.variance),
        "beKg", Math.round(p.breakEvenKg), "hc", pay.headcount);
    }
    const maxW = Math.max(...s.orders.map(o=>o.totalWeightKg));
    console.log("max order kg", maxW);
    const dist: Record<string, number> = {};
    for (const o of s.orders) dist[o.status] = (dist[o.status]||0)+1;
    console.log("status", dist);
    const pd: Record<string, number> = {};
    for (const o of s.orders) pd[o.paymentState] = (pd[o.paymentState]||0)+1;
    console.log("paystate", pd);
    console.log("credit customers", s.customers.filter(c=>c.creditApproved).length);
    console.log("avg order kg", Math.round(sales.weightKg/sales.orderCount));
  });
});
