/**
 * JSMB domain model — the single source of truth for every entity in the
 * prototype. Mirrors §9 of the Business Requirements Document (BRD v1.0).
 *
 * OWNED BY THE ARCHITECT. Feature and engine agents import from here and must
 * not edit this file; if a type is missing, raise it rather than adding it
 * locally, so the model stays canonical.
 */

/* ── Catalogue ─────────────────────────────────────────────────────────── */

/** The seven sellable variants of BRD §5.2. */
export type ProductCode = "P-PT" | "P-PK" | "PT-SB" | "PT-CP" | "PK-FL" | "PK-PF" | "PK-CT";

/** Thick sheets are fewer and heavier per 25 kg bundle — see BRD §5.2 note. */
export type Thickness = "thin" | "thick";

export type CategoryKey = "plain-thin" | "plain-thick" | "patterned-thin" | "patterned-thick";

export type PatternKey = "none" | "sweet-box" | "caps" | "file" | "portfolio" | "cutting";

/** Buying unit. 1 bundle = 25 kg; 1 lot = 20 bundles = 500 kg. */
export type Unit = "bundle" | "lot";

export interface Product {
  code: ProductCode;
  name: string;
  category: CategoryKey;
  categoryLabel: string;
  thickness: Thickness;
  /** Ounce sizes this variant is produced in, e.g. [8, 10, 12, 14, 16, 20]. */
  sizes: number[];
  pattern: PatternKey;
  patternLabel: string;
  /** Base bundle price before the pattern charge (₹ per 25 kg bundle). */
  basePricePerBundle: number;
  /** Pattern surcharge added on top of the base bundle price (₹ per bundle). */
  patternCharge: number;
  /** basePricePerBundle + patternCharge (₹ per 25 kg bundle). */
  pricePerBundle: number;
  /** pricePerBundle / 25 (₹ per kg). */
  pricePerKg: number;
  /** HSN code used on the GST invoice. Editable via CostConfig-adjacent settings. */
  hsn: string;
  blurb: string;
  /** Illustrative swatch — the prototype draws sheets rather than using photos. */
  swatch: { base: string; accent: string };
}

/* ── Customers ─────────────────────────────────────────────────────────── */

export type Region = "telangana" | "andhra-pradesh" | "karnataka";

export type CustomerSegment = "retail" | "trade" | "institutional";

export interface Customer {
  id: string;
  name: string;
  /** Trading name shown on the GST invoice, when the buyer is a firm. */
  company?: string;
  phone: string;
  address: string;
  city: string;
  region: Region;
  gstin?: string;
  segment: CustomerSegment;
  /** FR-A-04 — admin flag that unlocks COD / credit at checkout. */
  creditApproved: boolean;
  /** Rupee ceiling on outstanding dues; only meaningful when creditApproved. */
  creditLimit: number;
  createdAt: string;
  notes?: string;
}

/* ── Orders ────────────────────────────────────────────────────────────── */

/** FR-W-16 — Placed → Confirmed → Dispatched → Delivered. */
export type OrderStatus = "placed" | "confirmed" | "dispatched" | "delivered" | "cancelled";

export type PaymentState = "paid" | "due" | "partial" | "pending";

export type PaymentMode = "razorpay" | "cod" | "credit";

/** Region-expansion hook (BRD §9) — V1 is always own-mill. */
export type FulfillmentSource = "own-mill" | "partner-blr";

export type OrderChannel = "storefront" | "enquiry" | "offline" | "indiamart";

export interface OrderLine {
  id: string;
  productCode: ProductCode;
  /** Ounce size chosen from Product.sizes. */
  size: number;
  unit: Unit;
  /** Quantity expressed in the chosen unit. */
  qty: number;
  /** qty × (unit === "lot" ? 500 : 25). */
  weightKg: number;
  /** Snapshot of Product.pricePerBundle at order time. */
  unitPricePerBundle: number;
  /** Ex-GST value of the line. */
  linePrice: number;
  /** Standard cost of the line at STANDARD_COST_PER_KG × weightKg. */
  lineCost: number;
  /** linePrice − lineCost. */
  lineMargin: number;
}

export interface Order {
  id: string;
  /** Human-facing number, e.g. "JSMB-2026-0417". */
  orderNo: string;
  customerId: string;
  placedAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  totalWeightKg: number;
  /** Ex-GST sum of line prices. */
  subtotal: number;
  deliveryCharge: number;
  gstRate: number;
  gstAmount: number;
  /** subtotal + deliveryCharge + gstAmount. */
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentState: PaymentState;
  paymentMode: PaymentMode;
  /** Standard-cost margin across all lines, ex-GST. */
  margin: number;
  region: Region;
  fulfillmentSource: FulfillmentSource;
  channel: OrderChannel;
  invoiceId?: string;
  /** Agents that touched this order, in order — powers the provenance trail. */
  handledBy?: string[];
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  mode: PaymentMode;
  status: "success" | "pending" | "failed";
  txnRef: string;
  paidAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  orderId: string;
  issuedAt: string;
  sellerGstin: string;
  buyerGstin?: string;
  buyerName: string;
  buyerAddress: string;
  hsn: string;
  gstRate: number;
  taxableValue: number;
  /** Intra-state sales split CGST/SGST; inter-state uses igst. */
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

/* ── Enquiries ─────────────────────────────────────────────────────────── */

export type EnquiryStatus = "new" | "contacted" | "converted" | "closed";

export type EnquiryKind = "large-order" | "contact";

export interface Enquiry {
  id: string;
  kind: EnquiryKind;
  name: string;
  phone: string;
  address: string;
  /** "Issue / requirement" field from FR-W-17. */
  issue: string;
  extraInfo?: string;
  estTonnage?: number;
  status: EnquiryStatus;
  createdAt: string;
  region: Region;
  /** Set once an enquiry is converted into a real order. */
  convertedOrderId?: string;
}

/* ── Workforce ─────────────────────────────────────────────────────────── */

export type EmployeeRole = "Operator" | "Machine Specialist" | "Helper" | "Supervisor";

export type EmployeeStatus = "active" | "terminated";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  /** Date of joining. */
  doj: string;
  /** Date of termination, when status is "terminated". */
  dot?: string;
  /** Monthly-equivalent salary as quoted in BRD §8.4. */
  monthlySalary: number;
  /** monthlySalary / WORKING_DAYS_DIVISOR, rounded to the rupee. */
  dailyWage: number;
  status: EmployeeStatus;
  phone: string;
}

export interface AttendanceRecord {
  employeeId: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  present: boolean;
  /** Manual in V1, biometric in V2 — shown as provenance in the UI. */
  source: "manual" | "biometric";
}

export interface Bonus {
  id: string;
  employeeId: string;
  year: number;
  festival: string;
  amount: number;
  paidAt?: string;
}

/* ── Costing & P&L ─────────────────────────────────────────────────────── */

/** FR-A-15 — every line is editable and re-flows through all margins. */
export interface CostConfig {
  rawMaterial: number;
  labour: number;
  electricity: number;
  maintenance: number;
  transport: number;
  targetMargin: number;
}

/** Assumptions the BRD leaves open (D1, D5, D6) — editable in the demo. */
export interface BusinessSettings {
  gstRate: number;
  sellerGstin: string;
  defaultHsn: string;
  /** Divisor converting a monthly salary into a daily wage (BRD D5). */
  workingDaysDivisor: number;
  /** BRD D6 — orders at or above this weight ship free. */
  freeDeliveryThresholdKg: number;
  /** Flat charge applied below the free-delivery threshold. */
  deliveryChargeFlat: number;
}

export type PeriodKey = "daily" | "weekly" | "monthly" | "yearly";

export interface PeriodRange {
  key: PeriodKey;
  label: string;
  /** Inclusive ISO date. */
  from: string;
  /** Inclusive ISO date. */
  to: string;
}

/** Actual (not modelled) costs booked against a period — BRD §6.4 view 2. */
export interface ActualCostEntry {
  id: string;
  date: string;
  category: "raw-material" | "electricity" | "maintenance" | "transport" | "payroll" | "other";
  label: string;
  amount: number;
}

export interface ProfitAndLoss {
  range: PeriodRange;
  revenue: number;
  weightKg: number;
  /** Revenue less standard cost — the modelled view. */
  standardCost: number;
  standardProfit: number;
  /** Real costs booked in the period, broken out. */
  actualCosts: {
    rawMaterial: number;
    electricity: number;
    maintenance: number;
    transport: number;
    payroll: number;
    other: number;
    total: number;
  };
  actualProfit: number;
  /** actualProfit − standardProfit. Negative means reality is worse than model. */
  variance: number;
  /** Tonnes/period at which the labour line absorbs actual payroll. */
  breakEvenKg: number;
}

/* ── Sales rollups ─────────────────────────────────────────────────────── */

export interface SalesByProduct {
  productCode: ProductCode;
  productName: string;
  bundles: number;
  lots: number;
  weightKg: number;
  revenue: number;
  margin: number;
}

export interface SalesSummary {
  range: PeriodRange;
  orderCount: number;
  bundles: number;
  weightKg: number;
  revenue: number;
  margin: number;
  byProduct: SalesByProduct[];
  /** Revenue per calendar day inside the range, for trend charts. */
  series: { date: string; revenue: number; weightKg: number; orders: number }[];
}

export interface CustomerLedgerEntry {
  orderId: string;
  orderNo: string;
  date: string;
  total: number;
  paid: number;
  due: number;
  status: OrderStatus;
}

export interface CustomerLedger {
  customer: Customer;
  entries: CustomerLedgerEntry[];
  totalOrdered: number;
  totalPaid: number;
  totalDue: number;
  /** Remaining head-room against creditLimit. */
  creditAvailable: number;
}
