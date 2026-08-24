/**
 * GST split and invoice assembly — BRD §10.1, FR-W-14, open item D1.
 *
 * The seller is registered in Telangana (`SELLER_REGION`). A Telangana buyer is
 * therefore an intra-state supply and pays CGST + SGST at half the rate each;
 * anyone else pays a single IGST line at the full rate.
 */
import type { BuildInvoiceFn, GstSplit, SplitGstFn } from "../contracts/engines";
import type { Customer, Order } from "./types";
import { SELLER_REGION } from "./constants";
import { round2 } from "./format";

export const splitGst: SplitGstFn = (taxableValue, rate, intraState) => {
  const total = round2(taxableValue * rate);
  if (!intraState) return { cgst: 0, sgst: 0, igst: total, total };
  const cgst = round2(total / 2);
  // SGST takes the remainder so the two halves always re-add to `total`
  // exactly, even when the tax ends on an odd paisa.
  return { cgst, sgst: round2(total - cgst), igst: 0, total };
};

/**
 * Indian financial year label for an ISO date: April–March.
 * 2026-07-03 → "26-27"; 2027-02-11 → "26-27".
 */
export function financialYearLabel(iso: string): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** "JSMB/26-27/0001" — the running invoice number shown on the bill. */
export function invoiceNumber(iso: string, sequence: number): string {
  return `JSMB/${financialYearLabel(iso)}/${String(sequence).padStart(4, "0")}`;
}

/** True when the supply stays inside the seller's own state. */
export function isIntraState(customer: Customer): boolean {
  return customer.region === SELLER_REGION;
}

export const buildInvoice: BuildInvoiceFn = (order, customer, settings, sequence) => {
  const issuedAt = order.placedAt.slice(0, 10);
  // Delivery is part of the composite supply, so it is taxed with the goods.
  const taxableValue = round2(order.subtotal + order.deliveryCharge);
  const tax: GstSplit = splitGst(taxableValue, order.gstRate, isIntraState(customer));

  return {
    id: `inv-${String(sequence).padStart(4, "0")}`,
    invoiceNo: invoiceNumber(issuedAt, sequence),
    orderId: order.id,
    issuedAt,
    sellerGstin: settings.sellerGstin,
    buyerGstin: customer.gstin,
    buyerName: customer.company ?? customer.name,
    buyerAddress: `${customer.address}, ${customer.city}`,
    hsn: settings.defaultHsn,
    gstRate: order.gstRate,
    taxableValue,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    total: round2(taxableValue + tax.total),
  };
};

/** Re-issues an order total from its invoice, used by reconciliation tests. */
export function invoiceReconciles(order: Order, invoiceTotal: number): boolean {
  return Math.abs(round2(order.total) - round2(invoiceTotal)) < 0.01;
}
