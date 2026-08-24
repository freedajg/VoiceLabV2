/**
 * Storefront plumbing — the hooks and pure helpers every shop screen shares.
 *
 * Nothing in here prices, weighs or taxes anything itself: the engines in
 * `domain/` do all of that, and this file only decides which of them to call
 * and how to say the answer in a sentence a mill buyer would use.
 */
import { useMemo } from "react";
import type { AnalyticsInput, LineInput, OrderQuote } from "../../contracts/engines";
import type { CapStatus } from "../../contracts/engines";
import type { CartLine } from "../../contracts/stores";
import type { Tone } from "../../ui";
import type { CategoryKey, Customer, Product, Thickness } from "../../domain";
import {
  KG_PER_BUNDLE,
  KG_PER_LOT,
  MAX_ORDER_BUNDLES,
  MAX_ORDER_KG,
  MAX_ORDER_LOTS,
  PRODUCTS,
  capStatus,
  groupIndian,
  inr,
  kg,
  pct,
  quoteOrder,
  tons,
} from "../../domain";
import { selectAnalyticsInput, useDataStore } from "../../store/dataStore";
import { useCartStore } from "../../store/cartStore";

/* ── Cart → engine ─────────────────────────────────────────────────────── */

export function toLineInput(line: CartLine): LineInput {
  return {
    productCode: line.productCode,
    size: line.size,
    unit: line.unit,
    qty: line.qty,
  };
}

/** The signed-in buyer's own record, or null while browsing as a guest. */
export function useSessionCustomer(): Customer | null {
  const customerId = useCartStore((s) => s.session?.customerId ?? null);
  const customers = useDataStore((s) => s.customers);
  return useMemo(
    () => (customerId ? (customers.find((c) => c.id === customerId) ?? null) : null),
    [customers, customerId],
  );
}

/**
 * The live quote for whatever is in the basket. Priced by `quoteOrder`, so the
 * cart, the checkout and the admin sales figures can never drift apart.
 */
export function useCartQuote(): OrderQuote {
  const lines = useCartStore((s) => s.lines);
  const costConfig = useDataStore((s) => s.costConfig);
  const settings = useDataStore((s) => s.settings);
  const region = useSessionCustomer()?.region;
  return useMemo(
    () => quoteOrder(lines.map(toLineInput), { costConfig, settings, region }),
    [lines, costConfig, settings, region],
  );
}

/** The read-only slice the analytics engines take, refreshed on every mutation. */
export function useAnalyticsInput(): AnalyticsInput {
  const revision = useDataStore((s) => s.revision);
  return useMemo(
    () => selectAnalyticsInput(useDataStore.getState()),
    // The store bumps `revision` on every mutation — that is the invalidation.
    [revision],
  );
}

/* ── The 20 t ceiling (FR-W-05) ────────────────────────────────────────── */

/**
 * The meter changes tone well before the ceiling so a buyer is never surprised
 * by a blocked checkout: calm to half, brand colour to 85%, amber at the
 * shoulder, red only once the basket is genuinely over 20 t.
 */
export function capTone(status: CapStatus): Tone {
  if (!status.withinCap) return "danger";
  if (status.pct >= 0.85) return "warn";
  if (status.pct >= 0.5) return "primary";
  return "accent";
}

/** "5,000 kg — 25% of the 20 t cap. 15,000 kg of headroom left." */
export function capSentence(weightKg: number): string {
  const status = capStatus(weightKg);
  if (!status.withinCap) {
    return `${kg(weightKg)} — ${kg(weightKg - MAX_ORDER_KG)} over the 20 t online ceiling.`;
  }
  if (status.remainingKg === 0) {
    return `${kg(weightKg)} — exactly the 20 t ceiling. This is the largest order the website can take.`;
  }
  return `${kg(weightKg)} — ${pct(status.pct)} of the 20 t cap. ${kg(status.remainingKg)} of headroom left.`;
}

/** "800 bundles / 40 lots / 20 t" — the cap in the BRD's own units. */
export const CAP_IN_UNITS = `${groupIndian(MAX_ORDER_BUNDLES)} bundles / ${MAX_ORDER_LOTS} lots / ${tons(MAX_ORDER_KG)}`;

/** Headroom expressed the way a buyer orders: whole bundles and whole lots. */
export function headroomSentence(weightKg: number): string {
  const status = capStatus(weightKg);
  if (!status.withinCap) return "No headroom — the basket is over the ceiling.";
  return `${groupIndian(status.remainingBundles)} more bundles (${status.remainingLots} lots) will fit.`;
}

/* ── Units ─────────────────────────────────────────────────────────────── */

export const UNIT_LABEL = {
  bundle: { one: "bundle", many: "bundles", kg: KG_PER_BUNDLE },
  lot: { one: "lot", many: "lots", kg: KG_PER_LOT },
} as const;

export function unitNoun(unit: "bundle" | "lot", qty: number): string {
  return qty === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many;
}

/**
 * Converting between buying units keeps the load roughly where the buyer put
 * it rather than silently multiplying it twenty-fold (FR-W-04).
 */
export function convertQty(qty: number, from: "bundle" | "lot", to: "bundle" | "lot"): number {
  if (from === to) return qty;
  if (from === "bundle") return Math.max(1, Math.round(qty / 20));
  return qty * 20;
}

/* ── Catalogue filtering (FR-W-01) ─────────────────────────────────────── */

export type RangeFilter = "all" | "plain" | "patterned";
export type GaugeFilter = "all" | Thickness;

export function filterProducts(range: RangeFilter, gauge: GaugeFilter): Product[] {
  return PRODUCTS.filter((p) => {
    const plain = p.pattern === "none";
    if (range === "plain" && !plain) return false;
    if (range === "patterned" && plain) return false;
    if (gauge !== "all" && p.thickness !== gauge) return false;
    return true;
  });
}

export const CATEGORY_TILES: { key: CategoryKey; label: string; blurb: string }[] = [
  {
    key: "plain-thin",
    label: "Plain Thin",
    blurb: "Cartons, backing and everyday packaging.",
  },
  {
    key: "plain-thick",
    label: "Plain Thick",
    blurb: "Rigid boxes, files and industrial backing.",
  },
  {
    key: "patterned-thin",
    label: "Patterned Thin",
    blurb: "Sweet boxes and caps — the highest-margin lines.",
  },
  {
    key: "patterned-thick",
    label: "Patterned Thick",
    blurb: "File, portfolio and cutting sizes, ready for the die.",
  },
];

export function productsInCategory(category: CategoryKey): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function cheapestPerKg(products: Product[]): number {
  return products.reduce((low, p) => Math.min(low, p.pricePerKg), Number.POSITIVE_INFINITY);
}

/* ── GSTIN (FR-W-10) ───────────────────────────────────────────────────── */

/**
 * 2-digit state code, 10-character PAN, 1 entity digit, a literal Z, and one
 * check character. Checked at entry, never at invoicing time.
 */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

export const GSTIN_STATE_NAMES: Record<string, string> = {
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "29": "Karnataka",
  "27": "Maharashtra",
  "33": "Tamil Nadu",
};

export interface GstinCheck {
  empty: boolean;
  valid: boolean;
  message: string;
}

export function checkGstin(raw: string): GstinCheck {
  const value = raw.trim().toUpperCase();
  if (value.length === 0) {
    return { empty: true, valid: false, message: "Optional — leave blank to be billed as an individual." };
  }
  if (value.length !== 15) {
    return {
      empty: false,
      valid: false,
      message: `A GSTIN is 15 characters — this one has ${value.length}.`,
    };
  }
  if (!GSTIN_PATTERN.test(value)) {
    return {
      empty: false,
      valid: false,
      message: "Format should be 22AAAAA0000A1Z5 — 2 digits, 5 letters, 4 digits, letter, digit, Z, check.",
    };
  }
  const state = GSTIN_STATE_NAMES[value.slice(0, 2)];
  return {
    empty: false,
    valid: true,
    message: state ? `Valid — state code ${value.slice(0, 2)}, ${state}.` : `Valid — state code ${value.slice(0, 2)}.`,
  };
}

/* ── Money in words, for the invoice ───────────────────────────────────── */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens}-${ones}` : tens;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return twoDigits(rest);
  return rest === 0 ? `${ONES[hundreds]} Hundred` : `${ONES[hundreds]} Hundred ${twoDigits(rest)}`;
}

/** Indian scale: crore, lakh, thousand, hundred. "₹1,29,000" → one lakh… */
export function amountInWords(amount: number): string {
  const whole = Math.floor(Math.abs(Math.round(amount)));
  if (whole === 0) return "Rupees Zero only";

  const crore = Math.floor(whole / 1_00_00_000);
  const lakh = Math.floor((whole % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((whole % 1_00_000) / 1000);
  const rest = whole % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return `Rupees ${parts.join(" ")} only`;
}

/* ── Small formatting conveniences ─────────────────────────────────────── */

/** "₹690 / bundle · ₹27.6 / kg" — the two prices FR-W-01 asks for, together. */
export function priceLine(product: Product): string {
  return `${inr(product.pricePerBundle)} / bundle · ₹${product.pricePerKg} / kg`;
}

/** "₹570 + ₹120 = ₹690" — the pattern surcharge, made explicit (FR-W-07). */
export function patternArithmetic(product: Product): string | null {
  if (product.patternCharge === 0) return null;
  return `${inr(product.basePricePerBundle)} + ${inr(product.patternCharge)} = ${inr(product.pricePerBundle)}`;
}

export { capStatus, MAX_ORDER_KG, MAX_ORDER_BUNDLES, MAX_ORDER_LOTS, KG_PER_BUNDLE, KG_PER_LOT };
