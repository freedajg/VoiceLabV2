/**
 * Canonical constants lifted directly from the BRD. Every number here is
 * traceable to a section of the document — nothing is invented.
 *
 * OWNED BY THE ARCHITECT. Do not edit from feature or engine agents.
 */
import type {
  BusinessSettings,
  CostConfig,
  EmployeeRole,
  PatternKey,
  Product,
  ProductCode,
  Region,
} from "./types";

/* ── Units — BRD §5.1 ──────────────────────────────────────────────────── */

export const KG_PER_BUNDLE = 25;
export const BUNDLES_PER_LOT = 20;
export const KG_PER_LOT = KG_PER_BUNDLE * BUNDLES_PER_LOT; // 500 kg
export const KG_PER_TON = 1000;

/** FR-W-05 — hard cap on a self-service order. 20 t = 800 bundles = 40 lots. */
export const MAX_ORDER_KG = 20 * KG_PER_TON;
export const MAX_ORDER_BUNDLES = MAX_ORDER_KG / KG_PER_BUNDLE; // 800
export const MAX_ORDER_LOTS = MAX_ORDER_KG / KG_PER_LOT; // 40

/* ── Cost model — BRD §6.1 ─────────────────────────────────────────────── */

/**
 * Raw material is fixed at ₹13.2/kg with wastage already absorbed (BRD §6.2).
 * Maintenance includes the ~₹1,000/month machine-oiling cost (BRD §6.1).
 */
export const DEFAULT_COST_CONFIG: CostConfig = {
  rawMaterial: 13.2,
  labour: 4.0,
  electricity: 1.0,
  maintenance: 1.0,
  transport: 1.0,
  targetMargin: 2.0,
};

/** ₹20.20/kg — the basis for every per-order margin (BRD §6.3). */
export const STANDARD_COST_PER_KG =
  DEFAULT_COST_CONFIG.rawMaterial +
  DEFAULT_COST_CONFIG.labour +
  DEFAULT_COST_CONFIG.electricity +
  DEFAULT_COST_CONFIG.maintenance +
  DEFAULT_COST_CONFIG.transport;

/** Reference procurement blend — displayed for context, not used in pricing. */
export const RAW_MATERIAL_BLEND = [
  { material: "Paper-plate waste", share: 0.7, ratePerTon: 11000 },
  { material: "Board-cutting waste", share: 0.1, ratePerTon: 14000 },
  { material: "Pulp", share: 0.1, ratePerTon: 6000 },
  { material: "Road / tissue waste", share: 0.1, ratePerTon: 8000 },
] as const;

/* ── Open assumptions — BRD D1, D5, D6 ─────────────────────────────────── */

/**
 * These three are unresolved in the BRD and are therefore surfaced as editable
 * settings inside the prototype rather than hardcoded. Changing any of them
 * re-flows every downstream number, which is a deliberate demo moment.
 */
export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  // D1 — GST rate and HSN pending confirmation from Ajay. Paperboard normally
  // sits in the 4823 family at 12%; the BRD's 68129290 example is a placeholder.
  gstRate: 0.12,
  sellerGstin: "36AABCJ1234M1Z5",
  defaultHsn: "48239019",
  // D5 — daily wage = monthly ÷ 26 until the real divisor is confirmed.
  workingDaysDivisor: 26,
  // D6 — delivery policy placeholder: free at or above 2 t, else a flat charge.
  freeDeliveryThresholdKg: 2000,
  deliveryChargeFlat: 1500,
};

/* ── Catalogue — BRD §5.2 ──────────────────────────────────────────────── */

const THIN_SIZES = [8, 10, 12, 14, 16, 20];
const THICK_SIZES = [24, 28, 32, 34, 36, 48];

export const PATTERN_LABELS: Record<PatternKey, string> = {
  none: "Plain",
  "sweet-box": "Sweet Boxes",
  caps: "Caps",
  file: "File Size",
  portfolio: "Portfolio Size",
  cutting: "Cutting Size",
};

/**
 * Prices are stated per 25 kg bundle. Thick sells below thin by design: a 25 kg
 * thick bundle holds fewer, heavier sheets, so cost per kg matches but the
 * selling price per kg differs (BRD §5.2 note).
 */
export const PRODUCTS: Product[] = [
  {
    code: "P-PT",
    name: "Plain Thin Mill Board",
    category: "plain-thin",
    categoryLabel: "Plain Thin",
    thickness: "thin",
    sizes: THIN_SIZES,
    pattern: "none",
    patternLabel: "Plain",
    basePricePerBundle: 570,
    patternCharge: 0,
    pricePerBundle: 570,
    pricePerKg: 22.8,
    hsn: "48239019",
    blurb: "Everyday thin board for cartons, backing and general packaging.",
    swatch: { base: "#C8A882", accent: "#A98254" },
  },
  {
    code: "P-PK",
    name: "Plain Thick Mill Board",
    category: "plain-thick",
    categoryLabel: "Plain Thick",
    thickness: "thick",
    sizes: THICK_SIZES,
    pattern: "none",
    patternLabel: "Plain",
    basePricePerBundle: 520,
    patternCharge: 0,
    pricePerBundle: 520,
    pricePerKg: 20.8,
    hsn: "48239019",
    blurb: "Heavy-gauge board for rigid boxes, files and industrial backing.",
    swatch: { base: "#A88C6A", accent: "#7E6444" },
  },
  {
    code: "PT-SB",
    name: "Patterned Thin — Sweet Boxes",
    category: "patterned-thin",
    categoryLabel: "Patterned Thin",
    thickness: "thin",
    sizes: THIN_SIZES,
    pattern: "sweet-box",
    patternLabel: "Sweet Boxes",
    basePricePerBundle: 570,
    patternCharge: 120,
    pricePerBundle: 690,
    pricePerKg: 27.6,
    hsn: "48239019",
    blurb: "Mithai and confectionery box stock — the highest-margin line.",
    swatch: { base: "#E7B4A0", accent: "#C97A5C" },
  },
  {
    code: "PT-CP",
    name: "Patterned Thin — Caps",
    category: "patterned-thin",
    categoryLabel: "Patterned Thin",
    thickness: "thin",
    sizes: THIN_SIZES,
    pattern: "caps",
    patternLabel: "Caps",
    basePricePerBundle: 570,
    patternCharge: 120,
    pricePerBundle: 690,
    pricePerKg: 27.6,
    hsn: "48239019",
    blurb: "Cap and closure stock with a printed pattern finish.",
    swatch: { base: "#D9C089", accent: "#B4954F" },
  },
  {
    code: "PK-FL",
    name: "Patterned Thick — File Size",
    category: "patterned-thick",
    categoryLabel: "Patterned Thick",
    thickness: "thick",
    sizes: THICK_SIZES,
    pattern: "file",
    patternLabel: "File Size",
    basePricePerBundle: 520,
    patternCharge: 40,
    pricePerBundle: 560,
    pricePerKg: 22.4,
    hsn: "48239019",
    blurb: "Pre-cut to file dimensions for stationery converters.",
    swatch: { base: "#9FB4A6", accent: "#6E8A7B" },
  },
  {
    code: "PK-PF",
    name: "Patterned Thick — Portfolio Size",
    category: "patterned-thick",
    categoryLabel: "Patterned Thick",
    thickness: "thick",
    sizes: THICK_SIZES,
    pattern: "portfolio",
    patternLabel: "Portfolio Size",
    basePricePerBundle: 520,
    patternCharge: 90,
    pricePerBundle: 610,
    pricePerKg: 24.4,
    hsn: "48239019",
    blurb: "Large-format board for portfolios, folders and presentation covers.",
    swatch: { base: "#A6A9C8", accent: "#767AA3" },
  },
  {
    code: "PK-CT",
    name: "Patterned Thick — Cutting Size",
    category: "patterned-thick",
    categoryLabel: "Patterned Thick",
    thickness: "thick",
    sizes: THICK_SIZES,
    pattern: "cutting",
    patternLabel: "Cutting Size",
    basePricePerBundle: 520,
    patternCharge: 40,
    pricePerBundle: 560,
    pricePerKg: 22.4,
    hsn: "48239019",
    blurb: "Trimmed to the buyer's cutting spec, ready for the die.",
    swatch: { base: "#C3A0B4", accent: "#98718A" },
  },
];

export const PRODUCT_BY_CODE: Record<ProductCode, Product> = PRODUCTS.reduce(
  (acc, p) => ({ ...acc, [p.code]: p }),
  {} as Record<ProductCode, Product>,
);

/* ── Workforce — BRD §8.4 ──────────────────────────────────────────────── */

/** Seeded roster: 1 + 2 + 5 = 7 staff, ₹1,29,000/month. */
export const ROSTER_TEMPLATE: { role: EmployeeRole; count: number; monthlySalary: number }[] = [
  { role: "Operator", count: 1, monthlySalary: 23000 },
  { role: "Machine Specialist", count: 2, monthlySalary: 18000 },
  { role: "Helper", count: 5, monthlySalary: 14000 },
];

export const EXPECTED_MONTHLY_PAYROLL = ROSTER_TEMPLATE.reduce(
  (sum, r) => sum + r.count * r.monthlySalary,
  0,
); // 129000

/* ── Geography — BRD §2 O5, §9 ─────────────────────────────────────────── */

export const REGION_LABELS: Record<Region, string> = {
  telangana: "Telangana",
  "andhra-pradesh": "Andhra Pradesh",
  karnataka: "Karnataka (V3)",
};

/** Seller is registered in Telangana, so TG sales are intra-state (CGST+SGST). */
export const SELLER_REGION: Region = "telangana";

/* ── Demo clock ────────────────────────────────────────────────────────── */

/**
 * The prototype is deterministic, so "today" is pinned. Every seeded date,
 * period rollup and chart axis is derived from this instant.
 */
export const DEMO_TODAY = "2026-07-03";
export const SEED = 20260703;
