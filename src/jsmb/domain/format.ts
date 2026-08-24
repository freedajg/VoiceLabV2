/**
 * Presentation helpers. Pure, locale-free and dependency-free: the prototype is
 * shown on strange laptops with no network, so nothing here may rely on
 * `Intl` / `toLocaleString` being present or on a particular locale being
 * installed. Indian digit grouping is implemented by hand.
 */
import { KG_PER_TON } from "./constants";

/* ── Rounding ──────────────────────────────────────────────────────────── */

/**
 * The single money-rounding rule for the whole app. Every engine rounds through
 * this and only this, so a total is always exactly the sum of its rounded parts
 * and figures never drift by a paisa between two screens.
 */
export function round2(n: number): number {
  // +Number.EPSILON nudges values such as 1.005 that sit a hair below the
  // half-way point in binary floating point onto the correct side.
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ── Indian digit grouping ─────────────────────────────────────────────── */

/**
 * Groups the last three digits, then in pairs: 129000 → "1,29,000".
 * Takes the integer part only; callers decide about paise.
 */
export function groupIndian(value: number): string {
  const negative = value < 0;
  const digits = String(Math.abs(Math.trunc(value)));
  let grouped: string;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    const pairs = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${pairs},${last3}`;
  }
  return negative ? `-${grouped}` : grouped;
}

/** Trims trailing zeros from a fixed-decimal string: "4.20" → "4.2". */
function trimDecimals(s: string): string {
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/* ── Money ─────────────────────────────────────────────────────────────── */

/** Whole rupees with Indian grouping: 129000 → "₹1,29,000". */
export function inr(n: number): string {
  const rounded = Math.round(n);
  return rounded < 0 ? `-₹${groupIndian(-rounded)}` : `₹${groupIndian(rounded)}`;
}

/** Rupees with paise, for invoice lines: 1234.5 → "₹1,234.50". */
export function inrPaise(n: number): string {
  const v = round2(n);
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  const paise = String(Math.round((abs % 1) * 100)).padStart(2, "0");
  return `${sign}₹${groupIndian(Math.floor(abs))}.${paise}`;
}

/** Tile-sized short form: ₹1.29L, ₹4.2Cr, ₹85,000, ₹640. */
export function inrCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `${sign}₹${trimDecimals((abs / 1_00_00_000).toFixed(2))}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trimDecimals((abs / 1_00_000).toFixed(2))}L`;
  return inr(n);
}

/* ── Weight ────────────────────────────────────────────────────────────── */

/** Kilograms with Indian grouping: 12500 → "12,500 kg". */
export function kg(n: number): string {
  return `${groupIndian(Math.round(n))} kg`;
}

/** Takes KILOGRAMS and renders tonnes to one decimal: 12500 → "12.5 t". */
export function tons(kgValue: number): string {
  return `${(kgValue / KG_PER_TON).toFixed(1)} t`;
}

/** Bundle counts: 800 → "800 bundles"; 1 → "1 bundle". */
export function bundles(n: number): string {
  const rounded = Math.round(n);
  return `${groupIndian(rounded)} ${rounded === 1 ? "bundle" : "bundles"}`;
}

/* ── Ratios ────────────────────────────────────────────────────────────── */

/** Takes a FRACTION (0.125) and renders a percentage ("12.5%"). */
export function pct(n: number): string {
  return `${trimDecimals((n * 100).toFixed(1))}%`;
}

/* ── Dates ─────────────────────────────────────────────────────────────── */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Splits an ISO `YYYY-MM-DD` without constructing a Date (no TZ surprises). */
function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** "2026-07-03" → "3 Jul". */
export function dateShort(iso: string): string {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "2026-07-03" → "3 July 2026". */
export function dateLong(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-07-03" → "Jul 2026". */
export function monthShort(iso: string): string {
  const { y, m } = parts(iso);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "2026-07-03" → "July 2026". */
export function monthLong(iso: string): string {
  const { y, m } = parts(iso);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}
