/**
 * Scenario effects — the bridge between a serialisable story beat and the
 * business record.
 *
 * A `ScenarioStep` never touches the data store itself; it declares a
 * `ScenarioEffect` and the runtime hands it here. That keeps scenarios plain
 * data (writable by anyone, diffable, serialisable) while every mutation still
 * goes through the one `DataStore` that every surface reads.
 *
 * Each applier returns a small record that the runtime folds into the trace
 * payload under `result`, so the inspector shows what actually changed — the
 * invoice number that was raised, the rupees that moved, or the guardrail that
 * refused. Nothing here reads the wall clock or a random number.
 */
import type { ScenarioEffect } from "../contracts/agents";
import type { PricingContext } from "../contracts/engines";
import type { DataStore } from "../contracts/stores";
import { DEMO_TODAY, MAX_ORDER_KG } from "../domain/constants";
import { buildInvoice } from "../domain/gst";
import type { BusinessSettings, CostConfig, Customer, Payment } from "../domain/types";
import { useDataStore } from "../store/dataStore";
import {
  buildFixtureEnquiry,
  buildFixtureOrder,
  fixtureCustomer,
  fixtureOrderId,
  getEnquiryFixture,
  getOrderFixture,
} from "./fixtures";

/** Whatever an effect wants to show in the trace inspector. */
export type EffectResult = Record<string, unknown> | null;

/** Read/write access to the business record. Injectable so this stays testable. */
export type DataAccess = () => DataStore;

const liveData: DataAccess = () => useDataStore.getState();

/* ── Helpers ───────────────────────────────────────────────────────────── */

/** Refs resolve through the fixture table first, then fall back to a raw id. */
const resolveOrderId = (ref: string): string => fixtureOrderId(ref) ?? ref;

const ensureCustomer = (access: DataAccess, customerId: string): Customer | undefined => {
  const existing = access().customers.find((c) => c.id === customerId);
  if (existing) return existing;
  const seeded = fixtureCustomer(customerId);
  if (!seeded) return undefined;
  access().upsertCustomer(seeded);
  return seeded;
};

const roundP = (n: number): number => Math.round(n * 100) / 100;

/* ── Individual effects ────────────────────────────────────────────────── */

function placeOrder(access: DataAccess, orderRef: string): EffectResult {
  const fixture = getOrderFixture(orderRef);
  if (!fixture) return { error: `Unknown order fixture "${orderRef}".` };

  const already = access().orders.find((o) => o.id === fixture.orderId);
  if (already) {
    return { orderId: already.id, orderNo: already.orderNo, skipped: "Order already on the books." };
  }

  const customer = ensureCustomer(access, fixture.customerId);
  if (!customer) return { error: `No customer record for "${fixture.customerId}".` };

  const state = access();
  const ctx: PricingContext = {
    costConfig: state.costConfig,
    settings: state.settings,
    region: fixture.region,
  };
  const order = buildFixtureOrder(fixture, ctx);

  // Tolak's hard rule, enforced where it actually bites rather than in prose.
  if (order.totalWeightKg > MAX_ORDER_KG) {
    return {
      blocked: true,
      guardrail: "TON: never lets an order past 20 t",
      weightKg: order.totalWeightKg,
      capKg: MAX_ORDER_KG,
      reason: "Basket exceeds the 20 t self-service cap — route it to the enquiry desk.",
    };
  }

  state.addOrder(order);
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    customer: customer.company ?? customer.name,
    weightKg: order.totalWeightKg,
    subtotal: order.subtotal,
    deliveryCharge: order.deliveryCharge,
    gstAmount: order.gstAmount,
    total: order.total,
    margin: order.margin,
    marginPct: order.subtotal > 0 ? roundP((order.margin / order.subtotal) * 100) : 0,
  };
}

function recordPayment(
  access: DataAccess,
  orderRef: string,
  mode: Payment["mode"],
): EffectResult {
  const orderId = resolveOrderId(orderRef);
  const order = access().orders.find((o) => o.id === orderId);
  if (!order) return { error: `No order "${orderId}" to take payment against.` };

  // Only an online charge is money in the bank. COD and credit are promises,
  // so they land as pending and the order keeps its dues.
  const settled = mode === "razorpay";
  const prefix = mode === "razorpay" ? "rzp" : mode === "cod" ? "cod" : "crd";
  const payment: Payment = {
    id: `PAYT-${order.id}-${mode}`,
    orderId: order.id,
    amount: order.total,
    mode,
    status: settled ? "success" : "pending",
    txnRef: `${prefix}_${order.orderNo.replace(/[^A-Za-z0-9]/g, "").toLowerCase()}`,
    paidAt: DEMO_TODAY,
  };

  if (access().payments.some((p) => p.id === payment.id)) {
    return { paymentId: payment.id, skipped: "Payment already recorded." };
  }

  access().recordPayment(payment);
  return {
    paymentId: payment.id,
    orderNo: order.orderNo,
    mode,
    amount: payment.amount,
    status: payment.status,
    txnRef: payment.txnRef,
    settled,
  };
}

function issueInvoice(access: DataAccess, orderRef: string): EffectResult {
  const orderId = resolveOrderId(orderRef);
  const order = access().orders.find((o) => o.id === orderId);
  if (!order) return { error: `No order "${orderId}" to invoice.` };

  const existing = access().invoices.find((i) => i.orderId === order.id);
  if (existing) return { invoiceNo: existing.invoiceNo, skipped: "Invoice already raised." };

  const settings = access().settings;
  if (!settings.sellerGstin) {
    return {
      blocked: true,
      guardrail: "GST: refuses to issue an invoice without a seller GSTIN",
      reason: "Seller GSTIN is blank in settings — no tax invoice can be raised.",
    };
  }

  const customer = ensureCustomer(access, order.customerId);
  if (!customer) return { error: `No customer record for order ${order.orderNo}.` };

  const sequence = access().invoices.length + 1;
  const invoice = buildInvoice(order, customer, settings, sequence);
  access().addInvoice(invoice);

  return {
    invoiceNo: invoice.invoiceNo,
    orderNo: order.orderNo,
    hsn: invoice.hsn,
    gstRate: invoice.gstRate,
    taxableValue: invoice.taxableValue,
    cgst: invoice.cgst,
    sgst: invoice.sgst,
    igst: invoice.igst,
    total: invoice.total,
  };
}

function advanceOrder(
  access: DataAccess,
  orderRef: string,
  status: "confirmed" | "dispatched" | "delivered",
): EffectResult {
  const orderId = resolveOrderId(orderRef);
  const order = access().orders.find((o) => o.id === orderId);
  if (!order) return { error: `No order "${orderId}" to advance.` };
  access().advanceOrder(order.id, status);
  return { orderNo: order.orderNo, from: order.status, to: status };
}

function addEnquiry(access: DataAccess, enquiryRef: string): EffectResult {
  const fixture = getEnquiryFixture(enquiryRef);
  if (!fixture) return { error: `Unknown enquiry fixture "${enquiryRef}".` };
  if (access().enquiries.some((e) => e.id === fixture.enquiry.id)) {
    return { enquiryId: fixture.enquiry.id, skipped: "Enquiry already in the funnel." };
  }
  const enquiry = buildFixtureEnquiry(fixture);
  access().addEnquiry(enquiry);
  return {
    enquiryId: enquiry.id,
    kind: enquiry.kind,
    from: enquiry.name,
    estTonnage: enquiry.estTonnage ?? null,
    region: enquiry.region,
  };
}

function convertEnquiry(access: DataAccess, enquiryRef: string, orderRef: string): EffectResult {
  const fixture = getEnquiryFixture(enquiryRef);
  if (!fixture) return { error: `Unknown enquiry fixture "${enquiryRef}".` };
  if (!access().enquiries.some((e) => e.id === fixture.enquiry.id)) {
    addEnquiry(access, enquiryRef);
  }

  const orderId = resolveOrderId(orderRef);
  let placed: EffectResult = null;
  if (!access().orders.some((o) => o.id === orderId)) {
    placed = placeOrder(access, orderRef);
    if (placed && (placed["error"] || placed["blocked"])) return placed;
  }

  access().convertEnquiry(fixture.enquiry.id, orderId);
  return {
    enquiryId: fixture.enquiry.id,
    orderId,
    ...(placed ? { order: placed } : {}),
  };
}

function approveCredit(access: DataAccess, customerId: string, limit: number): EffectResult {
  const customer = ensureCustomer(access, customerId);
  if (!customer) return { error: `No customer "${customerId}" to approve.` };
  access().setCreditApproval(customerId, true, limit);
  return {
    customerId,
    customer: customer.company ?? customer.name,
    creditApproved: true,
    creditLimit: limit,
    previousLimit: customer.creditLimit,
  };
}

function closeAttendance(access: DataAccess, month: string): EffectResult {
  access().closeAttendanceMonth(month);
  const active = access().employees.filter((e) => e.status === "active").length;
  return { month, activeEmployees: active, source: "manual" };
}

const COST_KEYS: readonly (keyof CostConfig)[] = [
  "rawMaterial",
  "labour",
  "electricity",
  "maintenance",
  "transport",
  "targetMargin",
];

/** The numeric business settings a scenario is allowed to move (BRD D1/D5/D6). */
type NumericSettingKey =
  | "gstRate"
  | "workingDaysDivisor"
  | "freeDeliveryThresholdKg"
  | "deliveryChargeFlat";

const SETTING_KEYS: readonly NumericSettingKey[] = [
  "gstRate",
  "workingDaysDivisor",
  "freeDeliveryThresholdKg",
  "deliveryChargeFlat",
];

const isCostKey = (key: string): key is keyof CostConfig =>
  (COST_KEYS as readonly string[]).includes(key);

const isSettingKey = (key: string): key is NumericSettingKey =>
  (SETTING_KEYS as readonly string[]).includes(key);

/**
 * `update-cost` moves cost assumptions, and — because the BRD leaves D1, D5 and
 * D6 open — the numeric business settings too. Both re-flow every downstream
 * number on screen, which is the point of the demo beat.
 */
function updateCost(access: DataAccess, patch: Record<string, number>): EffectResult {
  const costPatch: Partial<CostConfig> = {};
  const settingsPatch: Partial<Record<NumericSettingKey, number>> = {};
  const ignored: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    if (!Number.isFinite(value)) {
      ignored.push(key);
    } else if (isCostKey(key)) {
      costPatch[key] = value;
    } else if (isSettingKey(key)) {
      settingsPatch[key] = value;
    } else {
      ignored.push(key);
    }
  }

  const before = access().costConfig;
  if (Object.keys(costPatch).length > 0) access().updateCostConfig(costPatch);
  if (Object.keys(settingsPatch).length > 0) {
    access().updateSettings(settingsPatch as Partial<BusinessSettings>);
  }

  const after = access().costConfig;
  const standardBefore = roundP(
    before.rawMaterial + before.labour + before.electricity + before.maintenance + before.transport,
  );
  const standardAfter = roundP(
    after.rawMaterial + after.labour + after.electricity + after.maintenance + after.transport,
  );

  return {
    costPatch,
    settingsPatch,
    standardCostPerKgBefore: standardBefore,
    standardCostPerKgAfter: standardAfter,
    ...(ignored.length > 0 ? { ignoredKeys: ignored } : {}),
  };
}

/* ── The registry the runtime calls ────────────────────────────────────── */

/**
 * Resolves one declarative effect against the data store.
 * Never throws: a bad ref comes back as `{ error }` so the run keeps going and
 * the presenter sees what went wrong in the inspector rather than a blank UI.
 */
export function applyScenarioEffect(
  effect: ScenarioEffect,
  access: DataAccess = liveData,
): EffectResult {
  switch (effect.type) {
    case "none":
      return null;
    case "place-order":
      return placeOrder(access, effect.orderRef);
    case "record-payment":
      return recordPayment(access, effect.orderRef, effect.mode);
    case "issue-invoice":
      return issueInvoice(access, effect.orderRef);
    case "advance-order":
      return advanceOrder(access, effect.orderRef, effect.status);
    case "add-enquiry":
      return addEnquiry(access, effect.enquiryRef);
    case "convert-enquiry":
      return convertEnquiry(access, effect.enquiryRef, effect.orderRef);
    case "approve-credit":
      return approveCredit(access, effect.customerId, effect.limit);
    case "close-attendance":
      return closeAttendance(access, effect.month);
    case "update-cost":
      return updateCost(access, effect.patch);
    default:
      return null;
  }
}

/** Short human label for an effect — used by the trace inspector. */
export function describeEffect(effect: ScenarioEffect): string {
  switch (effect.type) {
    case "none":
      return "no data change";
    case "place-order":
      return `places order ${getOrderFixture(effect.orderRef)?.orderNo ?? effect.orderRef}`;
    case "record-payment":
      return `records a ${effect.mode} payment`;
    case "issue-invoice":
      return "raises a GST invoice";
    case "advance-order":
      return `moves the order to ${effect.status}`;
    case "add-enquiry":
      return "files an enquiry";
    case "convert-enquiry":
      return "converts the enquiry into an order";
    case "approve-credit":
      return `approves credit up to ₹${effect.limit.toLocaleString("en-IN")}`;
    case "close-attendance":
      return `closes attendance for ${effect.month}`;
    case "update-cost":
      return "changes a cost assumption";
    default:
      return "unknown effect";
  }
}
