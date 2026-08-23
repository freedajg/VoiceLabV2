import { describe, expect, it } from "vitest";
import { buildInvoice } from "../../src/jsmb/domain/gst";
import { round2 } from "../../src/jsmb/domain/format";
import { isWorkingDay } from "../../src/jsmb/domain/periods";
import { quoteOrder } from "../../src/jsmb/domain/pricing";
import { buildSeed, SEED_WINDOW } from "../../src/jsmb/domain/seed/dataset";
import { intBetween, makeRng, pick } from "../../src/jsmb/domain/seed/rng";
import { totalDuesOutstanding } from "../../src/jsmb/domain/analytics";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_COST_CONFIG,
  DEMO_TODAY,
  MAX_ORDER_KG,
  PRODUCT_BY_CODE,
  SEED,
} from "../../src/jsmb/domain/constants";

const seed = buildSeed();

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(SEED);
    const b = makeRng(SEED);
    const runA = Array.from({ length: 10 }, () => a());
    const runB = Array.from({ length: 10 }, () => b());
    expect(runA).toEqual(runB);
    expect(runA.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it("diverges for a different seed", () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  it("keeps helpers inside their bounds", () => {
    const rng = makeRng(SEED);
    for (let i = 0; i < 200; i += 1) {
      const n = intBetween(rng, 3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
      expect(["a", "b", "c"]).toContain(pick(rng, ["a", "b", "c"]));
    }
  });
});

describe("buildSeed determinism", () => {
  it("deep-equals itself when called twice", () => {
    expect(buildSeed()).toEqual(buildSeed());
  });

  it("serialises byte-identically", () => {
    expect(JSON.stringify(buildSeed())).toBe(JSON.stringify(buildSeed()));
  });
});

describe("seeded dataset shape", () => {
  it("has the volume of a six-month-old business", () => {
    expect(seed.customers.length).toBeGreaterThanOrEqual(40);
    expect(seed.orders.length).toBeGreaterThan(200);
    expect(seed.orders.length).toBeLessThan(330);
    expect(seed.employees).toHaveLength(9); // 8 on the roster + one leaver
    expect(seed.enquiries.length).toBeGreaterThan(10);
    expect(seed.attendance.length).toBeGreaterThan(1000);
    expect(seed.revision).toBe(0);
  });

  it("uses the default cost config and settings", () => {
    expect(seed.costConfig).toEqual(DEFAULT_COST_CONFIG);
    expect(seed.settings).toEqual(DEFAULT_BUSINESS_SETTINGS);
  });

  it("keeps every order inside its window and under the 20 t cap", () => {
    for (const order of seed.orders) {
      expect(order.placedAt >= SEED_WINDOW.from).toBe(true);
      expect(order.placedAt <= DEMO_TODAY).toBe(true);
      expect(order.totalWeightKg).toBeGreaterThan(0);
      expect(order.totalWeightKg).toBeLessThanOrEqual(MAX_ORDER_KG);
    }
  });

  it("prices every order line off the catalogue", () => {
    for (const order of seed.orders) {
      const quote = quoteOrder(
        order.lines.map((l) => ({ productCode: l.productCode, size: l.size, unit: l.unit, qty: l.qty })),
        { costConfig: seed.costConfig, settings: seed.settings, region: order.region },
      );
      expect(order.subtotal).toBe(quote.subtotal);
      expect(order.gstAmount).toBe(quote.gstAmount);
      expect(order.total).toBe(quote.total);
      expect(order.margin).toBe(quote.margin);
      expect(order.totalWeightKg).toBe(quote.totalWeightKg);
      for (const line of order.lines) {
        expect(line.unitPricePerBundle).toBe(PRODUCT_BY_CODE[line.productCode].pricePerBundle);
        expect(PRODUCT_BY_CODE[line.productCode].sizes).toContain(line.size);
      }
    }
  });

  it("keeps line ids unique inside an order", () => {
    for (const order of seed.orders) {
      expect(new Set(order.lines.map((l) => l.id)).size).toBe(order.lines.length);
    }
  });

  it("keeps paid + due equal to the order total", () => {
    for (const order of seed.orders) {
      if (order.status === "cancelled") {
        expect(order.paidAmount).toBe(0);
        expect(order.dueAmount).toBe(0);
        continue;
      }
      expect(round2(order.paidAmount + order.dueAmount)).toBe(order.total);
    }
  });

  it("gives every paid order an invoice that matches its total", () => {
    const byId = new Map(seed.invoices.map((i) => [i.id, i]));
    const customers = new Map(seed.customers.map((c) => [c.id, c]));
    for (const order of seed.orders.filter((o) => o.paymentState === "paid" && o.status !== "cancelled")) {
      expect(order.invoiceId).toBeDefined();
      const invoice = byId.get(order.invoiceId!)!;
      expect(invoice).toBeDefined();
      expect(invoice.total).toBe(order.total);
      // Rebuilding it from the order reproduces the same figures.
      const rebuilt = buildInvoice(order, customers.get(order.customerId)!, seed.settings, 1);
      expect(rebuilt.taxableValue).toBe(invoice.taxableValue);
      expect(round2(rebuilt.cgst + rebuilt.sgst + rebuilt.igst)).toBe(order.gstAmount);
    }
    expect(new Set(seed.invoices.map((i) => i.invoiceNo)).size).toBe(seed.invoices.length);
  });

  it("books successful payments only against orders that received money", () => {
    const orders = new Map(seed.orders.map((o) => [o.id, o]));
    for (const payment of seed.payments) {
      const order = orders.get(payment.orderId);
      expect(order).toBeDefined();
      if (payment.status === "success") expect(order!.paidAmount).toBeGreaterThan(0);
    }
    for (const order of seed.orders.filter((o) => o.paidAmount > 0)) {
      const collected = seed.payments
        .filter((p) => p.orderId === order.id && p.status === "success")
        .reduce((s, p) => s + p.amount, 0);
      expect(round2(collected)).toBe(order.paidAmount);
    }
  });

  it("lands total dues in a believable band", () => {
    const dues = totalDuesOutstanding(seed.orders);
    expect(dues).toBeGreaterThan(3_00_000);
    expect(dues).toBeLessThan(8_00_000);
  });

  it("issues structurally valid GSTINs to the firms", () => {
    const firms = seed.customers.filter((c) => c.company);
    expect(firms.length).toBeGreaterThan(25);
    for (const c of firms) {
      expect(c.gstin).toMatch(/^(36|37)[A-Z]{5}\d{4}[A-Z]\d{1}Z[A-Z0-9]$/);
      expect(c.gstin!.slice(0, 2)).toBe(c.region === "andhra-pradesh" ? "37" : "36");
    }
    // Individuals buying retail have no GST registration.
    expect(seed.customers.some((c) => !c.company && !c.gstin)).toBe(true);
  });

  it("approves a sensible handful of credit customers", () => {
    const approved = seed.customers.filter((c) => c.creditApproved);
    expect(approved.length).toBeGreaterThanOrEqual(8);
    expect(approved.length).toBeLessThanOrEqual(18);
    for (const c of approved) {
      expect(c.creditLimit).toBeGreaterThanOrEqual(50_000);
      expect(c.creditLimit).toBeLessThanOrEqual(5_00_000);
    }
    for (const c of seed.customers.filter((x) => !x.creditApproved)) expect(c.creditLimit).toBe(0);
  });

  it("never records attendance on a Sunday", () => {
    expect(seed.attendance.every((a) => isWorkingDay(a.date))).toBe(true);
    expect(seed.attendance.every((a) => a.source === "manual")).toBe(true);
    const absences = seed.attendance.filter((a) => !a.present).length / seed.attendance.length;
    expect(absences).toBeGreaterThan(0.02);
    expect(absences).toBeLessThan(0.1);
  });

  it("pays a Dussehra bonus to the 2025 roster", () => {
    expect(seed.bonuses.length).toBeGreaterThan(0);
    for (const b of seed.bonuses) {
      expect(b.festival).toBe("Dussehra");
      expect(b.year).toBe(2025);
      expect(b.amount).toBeGreaterThan(0);
    }
  });

  it("books actual costs without any payroll line", () => {
    expect(seed.actualCosts.some((c) => c.category === "payroll")).toBe(false);
    expect(seed.actualCosts.some((c) => c.label.includes("oiling"))).toBe(true);
    for (const c of seed.actualCosts) {
      expect(c.amount).toBeGreaterThanOrEqual(0);
      // No bill may be dated in the future.
      expect(c.date <= DEMO_TODAY).toBe(true);
    }
  });

  it("links converted enquiries to a real order", () => {
    const orderIds = new Set(seed.orders.map((o) => o.id));
    for (const e of seed.enquiries) {
      if (e.status === "converted") {
        expect(e.convertedOrderId).toBeDefined();
        expect(orderIds.has(e.convertedOrderId!)).toBe(true);
      }
    }
    expect(seed.enquiries.some((e) => e.status === "new")).toBe(true);
  });

  it("only sells to customers that already existed", () => {
    const created = new Map(seed.customers.map((c) => [c.id, c.createdAt]));
    for (const order of seed.orders) {
      expect(created.get(order.customerId)!).toBeDefined();
      expect(created.get(order.customerId)! <= order.placedAt).toBe(true);
    }
  });
});
