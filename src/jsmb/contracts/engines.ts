/**
 * Engine contracts — the exact shape of every calculation module.
 *
 * OWNED BY THE ARCHITECT. Implementations live in src/jsmb/domain/* and MUST be
 * declared with these types (e.g. `export const quoteOrder: QuoteOrderFn = …`)
 * so that parallel work typechecks against a fixed interface.
 */
import type {
  ActualCostEntry,
  AttendanceRecord,
  BusinessSettings,
  Bonus,
  CostConfig,
  Customer,
  CustomerLedger,
  Employee,
  Invoice,
  Order,
  OrderLine,
  PeriodKey,
  PeriodRange,
  ProductCode,
  ProfitAndLoss,
  Region,
  SalesSummary,
  Unit,
} from "../domain/types";

/* ── Shared inputs ─────────────────────────────────────────────────────── */

/** One prospective order line, before pricing. */
export interface LineInput {
  productCode: ProductCode;
  size: number;
  unit: Unit;
  qty: number;
}

/** Everything a price depends on. Passed explicitly so engines stay pure. */
export interface PricingContext {
  costConfig: CostConfig;
  settings: BusinessSettings;
  /** Buyer's region — decides CGST+SGST vs IGST on the invoice. */
  region?: Region;
}

/** The result of pricing a whole basket. Drives cart, checkout and admin alike. */
export interface OrderQuote {
  lines: OrderLine[];
  totalWeightKg: number;
  totalBundles: number;
  subtotal: number;
  deliveryCharge: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  /** Standard cost across all lines at costConfig's per-kg build-up. */
  standardCost: number;
  /** subtotal − standardCost. */
  margin: number;
  /** margin / subtotal, 0 when subtotal is 0. */
  marginPct: number;
  /** True once totalWeightKg exceeds MAX_ORDER_KG (FR-W-05). */
  capExceeded: boolean;
}

/* ── tonnage.ts ────────────────────────────────────────────────────────── */

export interface CapStatus {
  weightKg: number;
  /** 0–1+ fraction of the 20 t cap consumed; may exceed 1. */
  pct: number;
  withinCap: boolean;
  remainingKg: number;
  remainingBundles: number;
  remainingLots: number;
}

export type ToKgFn = (unit: Unit, qty: number) => number;
export type FromKgFn = (kg: number, unit: Unit) => number;
export type CapStatusFn = (weightKg: number) => CapStatus;

/* ── pricing.ts ────────────────────────────────────────────────────────── */

export type QuoteLineFn = (input: LineInput, ctx: PricingContext) => OrderLine;
export type QuoteOrderFn = (inputs: LineInput[], ctx: PricingContext) => OrderQuote;
/** Per-kg standard cost from a CostConfig — the ₹20.20 figure by default. */
export type StandardCostFn = (costConfig: CostConfig) => number;

/* ── gst.ts ────────────────────────────────────────────────────────────── */

export interface GstSplit {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export type SplitGstFn = (taxableValue: number, rate: number, intraState: boolean) => GstSplit;
export type BuildInvoiceFn = (
  order: Order,
  customer: Customer,
  settings: BusinessSettings,
  sequence: number,
) => Invoice;

/* ── periods.ts ────────────────────────────────────────────────────────── */

/** Builds the inclusive date window for a period key, anchored on a given day. */
export type RangeForFn = (key: PeriodKey, anchorISO: string) => PeriodRange;

/* ── payroll.ts ────────────────────────────────────────────────────────── */

export interface PayrollLine {
  employee: Employee;
  daysWorked: number;
  daysInRange: number;
  dailyWage: number;
  earned: number;
  bonus: number;
  total: number;
}

export interface PayrollResult {
  range: PeriodRange;
  lines: PayrollLine[];
  totalEarned: number;
  totalBonus: number;
  total: number;
  headcount: number;
}

export type DailyWageFn = (monthlySalary: number, divisor: number) => number;
export type ComputePayrollFn = (
  employees: Employee[],
  attendance: AttendanceRecord[],
  bonuses: Bonus[],
  range: PeriodRange,
  settings: BusinessSettings,
) => PayrollResult;

/* ── analytics.ts ──────────────────────────────────────────────────────── */

/** The read-only slice every analytic function needs. */
export interface AnalyticsInput {
  orders: Order[];
  customers: Customer[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  bonuses: Bonus[];
  actualCosts: ActualCostEntry[];
  costConfig: CostConfig;
  settings: BusinessSettings;
}

export type ComputeSalesFn = (input: AnalyticsInput, range: PeriodRange) => SalesSummary;
export type ComputePnlFn = (input: AnalyticsInput, range: PeriodRange) => ProfitAndLoss;
export type ComputeLedgerFn = (input: AnalyticsInput, customerId: string) => CustomerLedger;

/** Dashboard tiles for FR-A-02. */
export interface DashboardSnapshot {
  todayOrders: number;
  todayRevenue: number;
  monthRevenue: number;
  monthProfit: number;
  duesOutstanding: number;
  newEnquiries: number;
  /** Orders whose margin per kg falls below this month's target. */
  lowMarginOrders: number;
  activeEmployees: number;
  tonnesThisMonth: number;
}
