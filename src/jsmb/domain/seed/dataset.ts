/**
 * The seeded business record — six months of a real-looking mill, generated
 * deterministically from `SEED` so two runs are byte-identical.
 *
 * Nothing in here may call `Math.random()` or `new Date()`. "Today" is
 * `DEMO_TODAY` (3 July 2026) and every date is derived from it.
 *
 * Shape of the generator, in order:
 *   1. customers      — 45 firms and individuals across TG and AP
 *   2. employees      — the BRD §8.4 roster, plus one leaver mid-period
 *   3. attendance     — every working day of the window, ~5% absence
 *   4. bonuses        — Dussehra 2025
 *   5. orders         — ~260 orders, Jan → Jul, priced through `quoteOrder`
 *   6. payments +
 *      invoices       — consistent with each order's payment state
 *   7. enquiries      — the funnel the admin portal shows
 *   8. actualCosts    — monthly bills sized off real tonnage (NEVER payroll:
 *                       payroll is always derived from the Employees module)
 */
import type { DataState } from "../../contracts/stores";
import type {
  ActualCostEntry,
  AttendanceRecord,
  Bonus,
  Customer,
  CustomerSegment,
  Employee,
  Enquiry,
  EnquiryStatus,
  Invoice,
  Order,
  OrderChannel,
  OrderStatus,
  Payment,
  PaymentMode,
  PaymentState,
  ProductCode,
  Region,
} from "../types";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_COST_CONFIG,
  DEMO_TODAY,
  MAX_ORDER_KG,
  PRODUCT_BY_CODE,
  ROSTER_TEMPLATE,
  SEED,
} from "../constants";
import { round2 } from "../format";
import { buildInvoice } from "../gst";
import { dailyWage } from "../payroll";
import { addDays, daysBetween, eachDay, isWorkingDay, startOfMonth } from "../periods";
import { quoteOrder } from "../pricing";
import {
  chance,
  floatBetween,
  intBetween,
  makeRng,
  pick,
  skewedInt,
  weightedPick,
} from "./rng";

/* ── Window ────────────────────────────────────────────────────────────── */

/** Books open on the first Monday of the year; the demo ends "today". */
const FIRST_ORDER_DAY = "2026-01-06";
const ATTENDANCE_FROM = "2026-01-01";

/* ── Reference data ────────────────────────────────────────────────────── */

interface CustomerSpec {
  name: string;
  company?: string;
  city: string;
  region: Region;
  segment: CustomerSegment;
}

/**
 * Hyderabad's board trade is concentrated in the northern and western
 * industrial belts (Balanagar, Jeedimetla, Katedan) with retail converters in
 * the old city; AP demand comes from the coastal printing towns.
 */
const CUSTOMER_SPECS: CustomerSpec[] = [
  { name: "Ramesh Reddy", company: "Sri Venkateswara Packaging", city: "Balanagar", region: "telangana", segment: "trade" },
  { name: "Srinivas Naidu", company: "Balaji Box Makers", city: "Jeedimetla", region: "telangana", segment: "trade" },
  { name: "Lakshmi Prasad", company: "Lakshmi Offset Printers", city: "Chikkadpally", region: "telangana", segment: "trade" },
  { name: "Venkatesh Goud", company: "Anjaneya Paper Products", city: "Kukatpally", region: "telangana", segment: "trade" },
  { name: "Anil Kumar Yadav", company: "Sai Krupa Traders", city: "Bowenpally", region: "telangana", segment: "trade" },
  { name: "Mahesh Chowdary", company: "Nandini Sweets & Namkeen", city: "Himayatnagar", region: "telangana", segment: "institutional" },
  { name: "Suresh Babu", city: "Uppal", region: "telangana", segment: "retail" },
  { name: "Praveen Rao", company: "Deccan Carton Works", city: "Nacharam", region: "telangana", segment: "trade" },
  { name: "Sandeep Jain", company: "Sandeep Stationery Mart", city: "Sultan Bazar", region: "telangana", segment: "trade" },
  { name: "Harish Mudiraj", city: "Malkajgiri", region: "telangana", segment: "retail" },
  { name: "Vamsi Krishna Varma", company: "Vamsi Printpack", city: "Moosapet", region: "telangana", segment: "trade" },
  { name: "Bhaskar Rao", company: "Sri Sai Board Depot", city: "Katedan", region: "telangana", segment: "trade" },
  { name: "Satish Achari", city: "Shamshabad", region: "telangana", segment: "retail" },
  { name: "Gopal Krishna Shetty", company: "Gokul Sweets", city: "Secunderabad", region: "telangana", segment: "institutional" },
  { name: "Murali Mohan", company: "Murali Packaging Solutions", city: "Patancheru", region: "telangana", segment: "trade" },
  { name: "Ravi Teja Reddy", company: "RT Carton House", city: "Medchal", region: "telangana", segment: "trade" },
  { name: "Sridhar Rathod", city: "Sanathnagar", region: "telangana", segment: "retail" },
  { name: "Nagaraju Goud", company: "Sri Durga Boxes", city: "Rajendranagar", region: "telangana", segment: "trade" },
  { name: "Yugandhar Naidu", company: "YN Paper Traders", city: "Vijayawada", region: "andhra-pradesh", segment: "trade" },
  { name: "Padma Sailaja", company: "Sailaja Printers", city: "Guntur", region: "andhra-pradesh", segment: "trade" },
  { name: "Chandra Sekhar Rao", company: "Godavari Board Agencies", city: "Rajahmundry", region: "andhra-pradesh", segment: "trade" },
  { name: "Aruna Devi", company: "Sri Annapurna Sweets", city: "Kakinada", region: "andhra-pradesh", segment: "institutional" },
  { name: "Kiran Kumar", city: "Nizampet", region: "telangana", segment: "retail" },
  { name: "Rajesh Agarwal", company: "Agarwal Packaging Traders", city: "Begum Bazar", region: "telangana", segment: "trade" },
  { name: "Swapna Rani", company: "Swapna Gift Boxes", city: "Ameerpet", region: "telangana", segment: "trade" },
  { name: "Balaji Pillai", city: "LB Nagar", region: "telangana", segment: "retail" },
  { name: "Naveen Chandra", company: "Chandra Print House", city: "Kachiguda", region: "telangana", segment: "trade" },
  { name: "Jyothi Lakshmi", company: "Jyothi Stationers", city: "Dilsukhnagar", region: "telangana", segment: "trade" },
  { name: "Prasad Varma", company: "Sri Rama Paper Mart", city: "Warangal", region: "telangana", segment: "trade" },
  { name: "Sailesh Gupta", company: "Gupta Board Suppliers", city: "Karimnagar", region: "telangana", segment: "trade" },
  { name: "Manohar Naidu", city: "Tirupati", region: "andhra-pradesh", segment: "retail" },
  { name: "Vijaya Bhaskar", company: "Sri Lakshmi Ganapathi Boxes", city: "Nellore", region: "andhra-pradesh", segment: "trade" },
  { name: "Krishna Prasad", company: "KP Converters", city: "Visakhapatnam", region: "andhra-pradesh", segment: "trade" },
  { name: "Sunitha Reddy", company: "Sunitha Sweets & Bakes", city: "Kompally", region: "telangana", segment: "institutional" },
  { name: "Rakesh Goud", city: "Alwal", region: "telangana", segment: "retail" },
  { name: "Srikanth Rao", company: "Srikanth Paper Board Co.", city: "Suryapet", region: "telangana", segment: "trade" },
  { name: "Divya Sree", company: "Divya Printing Works", city: "Eluru", region: "andhra-pradesh", segment: "trade" },
  { name: "Nagendra Babu", company: "Sri Balaji Cartons", city: "Ongole", region: "andhra-pradesh", segment: "trade" },
  { name: "Mohd Imran", company: "Imran Box House", city: "Charminar", region: "telangana", segment: "trade" },
  { name: "Lalitha Kumari", city: "Miyapur", region: "telangana", segment: "retail" },
  { name: "Ashok Kumar Jain", company: "Jain Stationery Converters", city: "Ranigunj", region: "telangana", segment: "trade" },
  { name: "Ganesh Yadav", city: "Bolarum", region: "telangana", segment: "retail" },
  { name: "Vinay Chowdary", company: "Vinay Packaging Hub", city: "Kurnool", region: "andhra-pradesh", segment: "trade" },
  { name: "Sarala Devi", company: "Sarala Sweet House", city: "Khammam", region: "telangana", segment: "institutional" },
  { name: "Pradeep Reddy", company: "Pradeep Mill Board Agency", city: "Siddipet", region: "telangana", segment: "trade" },
];

const STREETS = [
  "Plot 14, Industrial Estate",
  "Shop 7, Main Bazar Road",
  "H.No 3-6-118, Beside Bus Depot",
  "Unit 22, SME Park",
  "Door No 8-2-410, Market Street",
  "Godown 5, Transport Nagar",
  "Shed 11, Auto Nagar",
  "H.No 1-98/2, Temple Street",
];

/** Which SKU a given order is likely to be for. Plain thin is the volume line. */
const PRODUCT_MIX: { code: ProductCode; weight: number }[] = [
  { code: "P-PT", weight: 34 },
  { code: "P-PK", weight: 16 },
  { code: "PT-SB", weight: 16 },
  { code: "PT-CP", weight: 10 },
  { code: "PK-FL", weight: 10 },
  { code: "PK-PF", weight: 7 },
  { code: "PK-CT", weight: 7 },
];

/** Order volume by calendar month — the mill has been growing all year. */
const MONTH_WEIGHT: Record<string, number> = {
  "2026-01": 0.74,
  "2026-02": 0.84,
  "2026-03": 0.94,
  "2026-04": 1.0,
  "2026-05": 1.1,
  "2026-06": 1.16,
  "2026-07": 1.16,
};

const EMPLOYEE_NAMES: Record<string, string[]> = {
  Operator: ["Yellaiah Goud"],
  "Machine Specialist": ["Narsimha Reddy", "Shaik Mahaboob"],
  Helper: ["Mallesh Yadav", "Ravi Kumar", "Pochaiah", "Sattaiah Mudiraj", "Kumaraswamy"],
};

/* ── Small helpers ─────────────────────────────────────────────────────── */

function phone(rng: () => number): string {
  const first = pick(rng, ["9", "8", "7", "6"]);
  let rest = "";
  for (let i = 0; i < 9; i += 1) rest += String(intBetween(rng, 0, 9));
  return `${first}${rest}`;
}

const LETTERS = "ABCDEFGHIJKLMNPQRSTUVWXYZ";

/**
 * A structurally valid 15-character GSTIN: 2-digit state code, 10-character
 * PAN (5 letters, 4 digits, 1 letter), 1 entity digit, "Z", 1 check character.
 * Telangana is 36, Andhra Pradesh 37.
 */
function gstin(rng: () => number, region: Region, seedName: string): string {
  const stateCode = region === "andhra-pradesh" ? "37" : "36";
  const clean = seedName.toUpperCase().replace(/[^A-Z]/g, "");
  let pan = "";
  for (let i = 0; i < 5; i += 1) pan += clean[i] ?? pick(rng, LETTERS.split(""));
  const digits = String(intBetween(rng, 1000, 9999));
  const panLetter = pick(rng, LETTERS.split(""));
  const entity = String(intBetween(rng, 1, 9));
  const check = pick(rng, [...LETTERS.split(""), ...["1", "2", "3", "4", "5", "6", "7", "8", "9"]]);
  return `${stateCode}${pan}${digits}${panLetter}${entity}Z${check}`;
}

function id(prefix: string, n: number, width = 4): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

/* ── 1. Customers ──────────────────────────────────────────────────────── */

function buildCustomers(rng: () => number): Customer[] {
  return CUSTOMER_SPECS.map((spec, i) => {
    // Roughly two-thirds of the book predates the demo year; the rest signed up
    // during it, which is why early months have fewer buyers to draw from.
    const createdAt =
      i % 3 === 2
        ? addDays("2026-01-02", intBetween(rng, 0, 140))
        : addDays("2025-02-01", intBetween(rng, 0, 300));

    const isFirm = Boolean(spec.company);
    // FR-A-04 — a minority of trade buyers are credit-approved.
    const creditApproved = isFirm && spec.segment !== "retail" && (i % 4 === 0 || i % 7 === 5);
    const creditLimit = creditApproved
      ? pick(rng, [50_000, 75_000, 1_00_000, 1_50_000, 2_00_000, 3_00_000, 5_00_000])
      : 0;

    return {
      id: id("cus", i + 1, 3),
      name: spec.name,
      company: spec.company,
      phone: phone(rng),
      address: pick(rng, STREETS),
      city: spec.city,
      region: spec.region,
      gstin: isFirm ? gstin(rng, spec.region, spec.company ?? spec.name) : undefined,
      segment: spec.segment,
      creditApproved,
      creditLimit,
      createdAt,
      notes: creditApproved ? "Credit approved by Ajay — 30-day terms." : undefined,
    };
  });
}

/* ── 2–4. Workforce ────────────────────────────────────────────────────── */

function buildEmployees(rng: () => number): Employee[] {
  const divisor = DEFAULT_BUSINESS_SETTINGS.workingDaysDivisor;
  const employees: Employee[] = [];
  let n = 0;

  // The roster is generated straight from ROSTER_TEMPLATE so the active payroll
  // always totals EXPECTED_MONTHLY_PAYROLL (₹1,29,000).
  for (const row of ROSTER_TEMPLATE) {
    const names = EMPLOYEE_NAMES[row.role] ?? [];
    for (let i = 0; i < row.count; i += 1) {
      n += 1;
      employees.push({
        id: id("emp", n, 2),
        name: names[i] ?? `${row.role} ${i + 1}`,
        role: row.role,
        doj: addDays("2019-06-01", intBetween(rng, 0, 2100)),
        monthlySalary: row.monthlySalary,
        dailyWage: dailyWage(row.monthlySalary, divisor),
        status: "active",
        phone: phone(rng),
      });
    }
  }

  // One leaver inside the demo window, so the Employees module has a
  // termination to show and payroll visibly steps down in April.
  employees.push({
    id: id("emp", n + 1, 2),
    name: "Bhoomaiah Goud",
    role: "Helper",
    doj: "2022-08-16",
    dot: "2026-04-18",
    monthlySalary: 14_000,
    dailyWage: dailyWage(14_000, divisor),
    status: "terminated",
    phone: phone(rng),
  });

  return employees;
}

function buildAttendance(rng: () => number, employees: Employee[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  for (const employee of employees) {
    const from = employee.doj > ATTENDANCE_FROM ? employee.doj : ATTENDANCE_FROM;
    const to = employee.dot && employee.dot < DEMO_TODAY ? employee.dot : DEMO_TODAY;
    if (from > to) continue;
    // Sunday is the mill's weekly off, so it is not an attendance day at all.
    for (const date of eachDay(from, to)) {
      if (!isWorkingDay(date)) continue;
      records.push({
        employeeId: employee.id,
        date,
        present: !chance(rng, 0.055),
        source: "manual",
      });
    }
  }
  return records;
}

function buildBonuses(rng: () => number, employees: Employee[]): Bonus[] {
  return employees
    // Dussehra 2025 fell in October; anyone who joined after it did not get one.
    .filter((e) => e.doj <= "2025-09-01")
    .map((employee, i) => ({
      id: id("bon", i + 1, 3),
      employeeId: employee.id,
      year: 2025,
      festival: "Dussehra",
      amount: Math.round(employee.monthlySalary * floatBetween(rng, 0.28, 0.45) * 0.01) * 100,
      paidAt: "2025-10-01",
    }));
}

/* ── 5. Orders ─────────────────────────────────────────────────────────── */

/** How often a customer buys, relative to the rest of the book. */
function orderFrequency(customer: Customer): number {
  const base =
    customer.segment === "trade" ? 3 : customer.segment === "institutional" ? 2.5 : 1;
  return base + (customer.creditApproved ? 2 : 0);
}

function pickStatus(rng: () => number, ageDays: number): OrderStatus {
  if (ageDays <= 0) return "placed";
  if (ageDays <= 2) return weightedPick(rng, ["placed", "confirmed"] as const, [35, 65]);
  if (ageDays <= 5) return weightedPick(rng, ["confirmed", "dispatched", "cancelled"] as const, [30, 68, 2]);
  if (ageDays <= 10) return weightedPick(rng, ["dispatched", "delivered", "cancelled"] as const, [33, 65, 2]);
  return weightedPick(rng, ["delivered", "cancelled"] as const, [97, 3]);
}

function pickChannel(rng: () => number, customer: Customer): OrderChannel {
  return customer.segment === "retail"
    ? weightedPick(rng, ["storefront", "indiamart", "offline"] as const, [70, 18, 12])
    : weightedPick(rng, ["storefront", "offline", "indiamart", "enquiry"] as const, [46, 30, 18, 6]);
}

function pickMode(rng: () => number, customer: Customer): PaymentMode {
  if (customer.creditApproved) return weightedPick(rng, ["credit", "razorpay"] as const, [62, 38]);
  if (customer.segment === "retail") return weightedPick(rng, ["razorpay", "cod"] as const, [84, 16]);
  return weightedPick(rng, ["razorpay", "cod"] as const, [78, 22]);
}

interface SettledPayment {
  paidAmount: number;
  dueAmount: number;
  paymentState: PaymentState;
}

/**
 * Decides how much of an order has actually been collected. Anything older than
 * the credit window has been chased and settled; recent credit sales are where
 * the real dues sit.
 */
function settle(
  rng: () => number,
  total: number,
  mode: PaymentMode,
  status: OrderStatus,
  ageDays: number,
): SettledPayment {
  if (status === "cancelled") return { paidAmount: 0, dueAmount: 0, paymentState: "pending" };

  if (mode === "razorpay") {
    // Prepaid: paid at checkout, bar the odd gateway callback still in flight.
    if (ageDays === 0 && chance(rng, 0.25)) {
      return { paidAmount: 0, dueAmount: total, paymentState: "pending" };
    }
    return { paidAmount: total, dueAmount: 0, paymentState: "paid" };
  }

  if (mode === "cod") {
    return status === "delivered"
      ? { paidAmount: total, dueAmount: 0, paymentState: "paid" }
      : { paidAmount: 0, dueAmount: total, paymentState: "pending" };
  }

  // Credit — 30-day terms, so older invoices have been collected.
  if (ageDays > 70) return { paidAmount: total, dueAmount: 0, paymentState: "paid" };
  const outcome = weightedPick(rng, ["paid", "due", "partial"] as const, [46, 36, 18]);
  if (outcome === "paid") return { paidAmount: total, dueAmount: 0, paymentState: "paid" };
  if (outcome === "due") return { paidAmount: 0, dueAmount: total, paymentState: "due" };
  const paidAmount = round2(Math.round(total * floatBetween(rng, 0.3, 0.6)));
  return { paidAmount, dueAmount: round2(total - paidAmount), paymentState: "partial" };
}

/** Agents that touched an order, in the sequence the mesh replays. */
function handlersFor(status: OrderStatus, mode: PaymentMode): string[] {
  const trail = ["CAT", "TON", "PRC", "PAY"];
  if (status !== "placed" && status !== "cancelled") trail.push("GST", "SMS");
  if (status === "dispatched" || status === "delivered") trail.push("DSP");
  if (mode === "credit") trail.splice(4, 0, "IDN");
  return trail;
}

interface BuiltOrders {
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];
}

function buildOrders(rng: () => number, customers: Customer[]): BuiltOrders {
  const ctx = { costConfig: DEFAULT_COST_CONFIG, settings: DEFAULT_BUSINESS_SETTINGS };
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const invoices: Invoice[] = [];
  let orderNo = 0;
  let invoiceSeq = 0;
  let paymentSeq = 0;

  for (const day of eachDay(FIRST_ORDER_DAY, DEMO_TODAY)) {
    const monthWeight = MONTH_WEIGHT[day.slice(0, 7)] ?? 1;
    // Sunday is a skeleton day; Saturday is a shade quieter than a weekday.
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    const dayWeight = dow === 0 ? 0.2 : dow === 6 ? 0.85 : 1;

    const expected = 1.72 * monthWeight * dayWeight;
    const count = Math.floor(expected) + (chance(rng, expected % 1) ? 1 : 0);

    const available = customers.filter((c) => c.createdAt <= day);
    if (available.length === 0) continue;
    const weights = available.map(orderFrequency);

    for (let k = 0; k < count; k += 1) {
      const customer = weightedPick(rng, available, weights);
      orderNo += 1;
      const orderId = id("ord", orderNo);

      /* Lines — one to three distinct SKUs, sized so the 20 t cap is never
         breached (a storefront basket that would exceed it becomes an enquiry
         instead, per FR-W-05). */
      const lineCount = weightedPick(rng, [1, 2, 3] as const, [60, 28, 12]);
      const bulk = chance(rng, 0.06);
      const used = new Set<ProductCode>();
      const inputs: { productCode: ProductCode; size: number; unit: "bundle" | "lot"; qty: number }[] = [];
      let weightSoFar = 0;

      for (let li = 0; li < lineCount; li += 1) {
        let code = weightedPick(rng, PRODUCT_MIX.map((m) => m.code), PRODUCT_MIX.map((m) => m.weight));
        if (used.has(code)) {
          const spare = PRODUCT_MIX.map((m) => m.code).filter((c) => !used.has(c));
          if (spare.length === 0) break;
          code = pick(rng, spare);
        }
        used.add(code);

        const unit: "bundle" | "lot" = bulk && li === 0 ? "lot" : "bundle";
        const perUnitKg = unit === "lot" ? 500 : 25;
        const wanted = unit === "lot" ? skewedInt(rng, 2, 30, 4.0) : skewedInt(rng, 3, 50, 1.7);
        const room = Math.floor((MAX_ORDER_KG - weightSoFar) / perUnitKg);
        const qty = Math.min(wanted, room);
        if (qty <= 0) break;

        weightSoFar += qty * perUnitKg;
        inputs.push({ productCode: code, size: pick(rng, PRODUCT_BY_CODE[code].sizes), unit, qty });
      }
      if (inputs.length === 0) continue;

      const quote = quoteOrder(inputs, { ...ctx, region: customer.region });
      const ageDays = daysBetween(day, DEMO_TODAY);
      const rolled = pickStatus(rng, ageDays);
      // Multi-tonne orders are confirmed on the phone before the mill runs
      // them, so they are never the ones that fall through.
      const status: OrderStatus =
        rolled === "cancelled" && quote.totalWeightKg > 3000
          ? ageDays > 10
            ? "delivered"
            : "dispatched"
          : rolled;
      const mode = pickMode(rng, customer);
      const settled = settle(rng, quote.total, mode, status, ageDays);

      const order: Order = {
        id: orderId,
        orderNo: `JSMB-2026-${String(orderNo).padStart(4, "0")}`,
        customerId: customer.id,
        placedAt: day,
        status,
        // Line ids are re-keyed to the order so they stay unique in the UI.
        lines: quote.lines.map((line, i) => ({ ...line, id: `${orderId}-L${i + 1}` })),
        totalWeightKg: quote.totalWeightKg,
        subtotal: quote.subtotal,
        deliveryCharge: quote.deliveryCharge,
        gstRate: quote.gstRate,
        gstAmount: quote.gstAmount,
        total: quote.total,
        paidAmount: settled.paidAmount,
        dueAmount: settled.dueAmount,
        paymentState: settled.paymentState,
        paymentMode: mode,
        margin: quote.margin,
        region: customer.region,
        fulfillmentSource: "own-mill",
        channel: pickChannel(rng, customer),
        handledBy: handlersFor(status, mode),
      };

      if (settled.paidAmount > 0) {
        paymentSeq += 1;
        payments.push({
          id: id("pay", paymentSeq),
          orderId: order.id,
          amount: settled.paidAmount,
          mode,
          status: "success",
          txnRef: `${mode === "razorpay" ? "pay_" : "rcpt_"}${String(SEED + paymentSeq * 977).slice(-9)}`,
          paidAt: mode === "cod" ? addDays(day, Math.min(ageDays, intBetween(rng, 1, 4))) : day,
        });
      } else if (settled.paymentState === "pending" && status !== "cancelled" && mode === "razorpay") {
        paymentSeq += 1;
        payments.push({
          id: id("pay", paymentSeq),
          orderId: order.id,
          amount: quote.total,
          mode,
          status: "pending",
          txnRef: `pay_${String(SEED + paymentSeq * 977).slice(-9)}`,
          paidAt: day,
        });
      }

      // A GST invoice is raised once the goods move or the money lands.
      const invoiced =
        status !== "cancelled" &&
        (settled.paymentState === "paid" ||
          settled.paymentState === "partial" ||
          status === "dispatched" ||
          status === "delivered");
      if (invoiced) {
        invoiceSeq += 1;
        const invoice = buildInvoice(order, customer, DEFAULT_BUSINESS_SETTINGS, invoiceSeq);
        invoices.push(invoice);
        order.invoiceId = invoice.id;
      }

      orders.push(order);
    }
  }

  return { orders, payments, invoices };
}

/* ── 7. Enquiries ──────────────────────────────────────────────────────── */

const ENQUIRY_SPECS: { name: string; city: string; region: Region; issue: string; tonnage?: number; kind: "large-order" | "contact" }[] = [
  { name: "Rahul Bansal", city: "Vijayawada", region: "andhra-pradesh", issue: "Need 35 tons plain thin monthly for a carton plant.", tonnage: 35, kind: "large-order" },
  { name: "Fatima Begum", city: "Charminar", region: "telangana", issue: "Sweet box board, 24 tons for Ramzan season.", tonnage: 24, kind: "large-order" },
  { name: "Suryanarayana Raju", city: "Kakinada", region: "andhra-pradesh", issue: "Bulk portfolio size, 60 tons across the year.", tonnage: 60, kind: "large-order" },
  { name: "Karthik Shetty", city: "Bengaluru", region: "karnataka", issue: "Do you deliver to Bengaluru? Need 22 tons.", tonnage: 22, kind: "large-order" },
  { name: "Naresh Kumar", city: "Warangal", region: "telangana", issue: "Rate list for patterned thick, file size.", kind: "contact" },
  { name: "Deepika Rao", city: "Gachibowli", region: "telangana", issue: "Do you supply 8 oz in small quantities?", kind: "contact" },
  { name: "Imtiaz Ali", city: "Nampally", region: "telangana", issue: "Need a quote for 40 tons cutting size.", tonnage: 40, kind: "large-order" },
  { name: "Venu Gopal", city: "Guntur", region: "andhra-pradesh", issue: "Credit terms for a 6-month supply contract.", kind: "contact" },
  { name: "Shanti Priya", city: "Miyapur", region: "telangana", issue: "Samples of sweet box pattern before ordering.", kind: "contact" },
  { name: "Arjun Reddy", city: "Nizamabad", region: "telangana", issue: "28 tons plain thick, delivery in two lots.", tonnage: 28, kind: "large-order" },
  { name: "Bhavani Shankar", city: "Ongole", region: "andhra-pradesh", issue: "Transport charges to Ongole for 5 tons?", kind: "contact" },
  { name: "Zoya Khan", city: "Tolichowki", region: "telangana", issue: "Custom pattern possible on thin board?", kind: "contact" },
  { name: "Mahendra Varma", city: "Visakhapatnam", region: "andhra-pradesh", issue: "45 tons annual contract for a printing press.", tonnage: 45, kind: "large-order" },
  { name: "Rekha Sharma", city: "Secunderabad", region: "telangana", issue: "GST invoice format needed for accounts.", kind: "contact" },
];

/** Ages in days at DEMO_TODAY, one per spec — keeps the funnel stable. */
const ENQUIRY_AGES = [0, 1, 2, 6, 9, 13, 19, 26, 34, 45, 57, 70, 88, 106];

function buildEnquiries(rng: () => number, orders: Order[]): Enquiry[] {
  return ENQUIRY_SPECS.map((spec, i) => {
    const createdAt = addDays(DEMO_TODAY, -ENQUIRY_AGES[i]);
    const ageDays = ENQUIRY_AGES[i];

    // A funnel ages the way a real one does: fresh leads are untouched, the
    // middle has been called, and only old leads have landed or lapsed.
    let status: EnquiryStatus;
    if (ageDays <= 2) status = "new";
    else if (ageDays <= 13) status = "contacted";
    else status = weightedPick(rng, ["converted", "closed", "contacted"] as const, [40, 38, 22]);

    // A converted enquiry points at a real order, so the funnel is clickable.
    const converted =
      status === "converted"
        ? orders.find((o) => o.channel === "enquiry" && o.placedAt >= createdAt)
        : undefined;
    if (status === "converted" && !converted) status = "contacted";

    return {
      id: id("enq", i + 1, 3),
      kind: spec.kind,
      name: spec.name,
      phone: phone(rng),
      address: `${pick(rng, STREETS)}, ${spec.city}`,
      issue: spec.issue,
      extraInfo: spec.tonnage ? `Estimated ${spec.tonnage} tons — above the 20 t online cap.` : undefined,
      estTonnage: spec.tonnage,
      status,
      createdAt,
      region: spec.region,
      convertedOrderId: converted?.id,
    };
  });
}

/* ── 8. Actual costs ───────────────────────────────────────────────────── */

/**
 * Real bills, sized off the tonnage actually produced each month so the P&L
 * reconciles to something an owner would recognise, then nudged off the model
 * by a few percent in each direction — that gap is the variance the Profit/Loss
 * module exists to explain.
 *
 * There are deliberately NO payroll entries here: payroll is always derived
 * from the Employees module (BRD §6.4), and booking it twice would halve profit.
 */
function buildActualCosts(rng: () => number, orders: Order[]): ActualCostEntry[] {
  const kgByMonth = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const month = order.placedAt.slice(0, 7);
    kgByMonth.set(month, (kgByMonth.get(month) ?? 0) + order.totalWeightKg);
  }

  const entries: ActualCostEntry[] = [];
  let n = 0;
  const push = (date: string, category: ActualCostEntry["category"], label: string, amount: number) => {
    n += 1;
    // A bill can never be dated after today, so the part-month we are standing
    // in books its costs up to the demo date rather than into the future.
    entries.push({
      id: id("cst", n, 3),
      date: date > DEMO_TODAY ? DEMO_TODAY : date,
      category,
      label,
      amount: Math.round(amount),
    });
  };

  for (const [month, monthKg] of [...kgByMonth.entries()].sort()) {
    const first = startOfMonth(`${month}-01`);
    const cost = DEFAULT_COST_CONFIG;

    // Raw material arrives in two loads a month. The waste-paper market has run
    // 5-12% above the ₹13.2/kg model figure all year — that gap is most of the
    // unfavourable side of the variance the P&L module surfaces.
    const rawTotal = monthKg * cost.rawMaterial * floatBetween(rng, 1.05, 1.12);
    push(addDays(first, 4), "raw-material", "Waste paper purchase — load 1", rawTotal * 0.55);
    push(addDays(first, 18), "raw-material", "Waste paper purchase — load 2", rawTotal * 0.45);

    push(addDays(first, 9), "electricity", "TSSPDCL bill", monthKg * cost.electricity * floatBetween(rng, 0.95, 1.08));

    // BRD §6.1 / assumption 2 — machine oiling lives inside the maintenance line.
    push(addDays(first, 6), "maintenance", "Machine oiling", 1000);
    push(addDays(first, 21), "maintenance", "Rollers, belts & spares", Math.max(0, monthKg * cost.maintenance * floatBetween(rng, 0.95, 1.2) - 1000));

    push(addDays(first, 12), "transport", "Local delivery — tempo hire", monthKg * cost.transport * 0.62 * floatBetween(rng, 1.05, 1.25));
    push(addDays(first, 26), "transport", "Outstation freight", monthKg * cost.transport * 0.46 * floatBetween(rng, 1.0, 1.3));

    if (chance(rng, 0.4)) {
      push(addDays(first, 15), "other", "Packing material & sundries", monthKg * floatBetween(rng, 0.04, 0.09));
    }
  }

  return entries;
}

/* ── buildSeed ─────────────────────────────────────────────────────────── */

/**
 * The pristine dataset. Called once at store creation and again by Reset Demo;
 * both calls must deep-equal each other, which is why every stage draws from
 * the same single seeded stream in a fixed order.
 */
export function buildSeed(): DataState {
  const rng = makeRng(SEED);

  const customers = buildCustomers(rng);
  const employees = buildEmployees(rng);
  const attendance = buildAttendance(rng, employees);
  const bonuses = buildBonuses(rng, employees);
  const { orders, payments, invoices } = buildOrders(rng, customers);
  const enquiries = buildEnquiries(rng, orders);
  const actualCosts = buildActualCosts(rng, orders);

  return {
    customers,
    orders,
    payments,
    invoices,
    enquiries,
    employees,
    attendance,
    bonuses,
    actualCosts,
    costConfig: { ...DEFAULT_COST_CONFIG },
    settings: { ...DEFAULT_BUSINESS_SETTINGS },
    revision: 0,
  };
}

/** The window the seed covers — handy for empty-state copy and tests. */
export const SEED_WINDOW = { from: FIRST_ORDER_DAY, to: DEMO_TODAY };
