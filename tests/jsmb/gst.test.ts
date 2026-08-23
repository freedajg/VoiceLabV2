import { describe, expect, it } from "vitest";
import type { Customer, Order } from "../../src/jsmb/domain/types";
import { buildInvoice, financialYearLabel, invoiceNumber, splitGst } from "../../src/jsmb/domain/gst";
import { quoteOrder } from "../../src/jsmb/domain/pricing";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_COST_CONFIG,
  SELLER_REGION,
} from "../../src/jsmb/domain/constants";
import { round2 } from "../../src/jsmb/domain/format";

const baseCustomer: Customer = {
  id: "cus-test",
  name: "Test Buyer",
  company: "Test Packaging",
  phone: "9876543210",
  address: "Plot 1, Industrial Estate",
  city: "Balanagar",
  region: "telangana",
  gstin: "36AABCT1234M1Z5",
  segment: "trade",
  creditApproved: false,
  creditLimit: 0,
  createdAt: "2025-04-01",
};

function makeOrder(region: Customer["region"]): Order {
  const quote = quoteOrder(
    [{ productCode: "P-PT", size: 12, unit: "lot", qty: 4 }],
    { costConfig: DEFAULT_COST_CONFIG, settings: DEFAULT_BUSINESS_SETTINGS, region },
  );
  return {
    id: "ord-test",
    orderNo: "JSMB-2026-0001",
    customerId: baseCustomer.id,
    placedAt: "2026-07-03",
    status: "delivered",
    lines: quote.lines,
    totalWeightKg: quote.totalWeightKg,
    subtotal: quote.subtotal,
    deliveryCharge: quote.deliveryCharge,
    gstRate: quote.gstRate,
    gstAmount: quote.gstAmount,
    total: quote.total,
    paidAmount: quote.total,
    dueAmount: 0,
    paymentState: "paid",
    paymentMode: "razorpay",
    margin: quote.margin,
    region,
    fulfillmentSource: "own-mill",
    channel: "storefront",
  };
}

describe("splitGst", () => {
  it("splits an intra-state supply into equal CGST and SGST", () => {
    const split = splitGst(10_000, 0.12, true);
    expect(split.total).toBe(1200);
    expect(split.cgst).toBe(600);
    expect(split.sgst).toBe(600);
    expect(split.igst).toBe(0);
  });

  it("charges a single IGST line on an inter-state supply", () => {
    const split = splitGst(10_000, 0.12, false);
    expect(split.igst).toBe(1200);
    expect(split.cgst).toBe(0);
    expect(split.sgst).toBe(0);
  });

  it("keeps the two halves adding back to the whole on an odd paisa", () => {
    const split = splitGst(1234.57, 0.12, true);
    expect(round2(split.cgst + split.sgst)).toBe(split.total);
  });

  it("treats Telangana as the seller's own state", () => {
    expect(SELLER_REGION).toBe("telangana");
  });
});

describe("invoice numbering", () => {
  it("uses the Indian financial year, April to March", () => {
    expect(financialYearLabel("2026-07-03")).toBe("26-27");
    expect(financialYearLabel("2027-03-31")).toBe("26-27");
    expect(financialYearLabel("2026-03-31")).toBe("25-26");
  });

  it("formats as JSMB/26-27/0001", () => {
    expect(invoiceNumber("2026-07-03", 1)).toBe("JSMB/26-27/0001");
    expect(invoiceNumber("2026-07-03", 417)).toBe("JSMB/26-27/0417");
  });
});

describe("buildInvoice", () => {
  it("taxes subtotal plus delivery and totals to the order total", () => {
    const order = makeOrder("telangana");
    const invoice = buildInvoice(order, baseCustomer, DEFAULT_BUSINESS_SETTINGS, 1);

    expect(invoice.taxableValue).toBe(round2(order.subtotal + order.deliveryCharge));
    expect(round2(invoice.cgst + invoice.sgst + invoice.igst)).toBe(order.gstAmount);
    expect(invoice.total).toBe(order.total);
    expect(invoice.invoiceNo).toBe("JSMB/26-27/0001");
    expect(invoice.sellerGstin).toBe(DEFAULT_BUSINESS_SETTINGS.sellerGstin);
    expect(invoice.buyerGstin).toBe(baseCustomer.gstin);
    expect(invoice.buyerName).toBe("Test Packaging");
  });

  it("switches to IGST for an Andhra Pradesh buyer", () => {
    const order = makeOrder("andhra-pradesh");
    const apCustomer: Customer = { ...baseCustomer, region: "andhra-pradesh", gstin: "37AABCT1234M1Z5" };
    const invoice = buildInvoice(order, apCustomer, DEFAULT_BUSINESS_SETTINGS, 2);

    expect(invoice.cgst).toBe(0);
    expect(invoice.sgst).toBe(0);
    expect(invoice.igst).toBe(order.gstAmount);
    expect(invoice.total).toBe(order.total);
  });

  it("falls back to the person's name when there is no firm", () => {
    const order = makeOrder("telangana");
    const retail: Customer = { ...baseCustomer, company: undefined, gstin: undefined, segment: "retail" };
    const invoice = buildInvoice(order, retail, DEFAULT_BUSINESS_SETTINGS, 3);
    expect(invoice.buyerName).toBe("Test Buyer");
    expect(invoice.buyerGstin).toBeUndefined();
  });
});
