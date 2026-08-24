/**
 * Scenario fixtures — the buyers, baskets and enquiries that scenarios refer to
 * by `orderRef` / `enquiryRef`.
 *
 * These are *builders*, not literals: an order fixture declares who is buying
 * and what is in the basket, and the real `Order` is produced by the domain
 * pricing engine against the live cost assumptions. That matters — if a
 * presenter edits the raw-material rate in admin settings and then replays a
 * scenario, the order that lands carries the new margin. Nothing here is
 * random and nothing reads the wall clock.
 */
import type { LineInput, PricingContext } from "../contracts/engines";
import { DEMO_TODAY } from "../domain/constants";
import { quoteOrder } from "../domain/pricing";
import type {
  Customer,
  Enquiry,
  Order,
  OrderChannel,
  PaymentMode,
  Region,
} from "../domain/types";

/* ── Customers used by scenarios ───────────────────────────────────────── */

/**
 * Scenario buyers carry a `CUST-SC-` prefix so they can never collide with the
 * seeded customer book, and so a presenter can tell a demo record from a
 * seeded one at a glance.
 */
export const FIXTURE_CUSTOMERS: Record<string, Customer> = {
  "CUST-SC-ANJALI": {
    id: "CUST-SC-ANJALI",
    name: "Anjali Devi",
    company: "Anjali Traders",
    phone: "+919849012214",
    address: "12-3-47, Market Street, Monda Market",
    city: "Secunderabad",
    region: "telangana",
    gstin: "36AAJCA9921K1ZP",
    segment: "trade",
    creditApproved: true,
    creditLimit: 150000,
    createdAt: "2026-02-11",
    notes: "Sweet-box converter. Buys patterned thin every festival season.",
  },
  "CUST-SC-VIJAYA": {
    id: "CUST-SC-VIJAYA",
    name: "K. Srinivas",
    company: "Sri Vijaya Packaging Works",
    phone: "+919000445512",
    address: "Plot 14, Auto Nagar Industrial Estate",
    city: "Vijayawada",
    region: "andhra-pradesh",
    gstin: "37AAFCS4410R1Z8",
    segment: "institutional",
    creditApproved: false,
    creditLimit: 0,
    createdAt: "2026-06-29",
    notes: "Came in through the large-order enquiry form. Not yet credit-approved.",
  },
  "CUST-SC-RAVI": {
    id: "CUST-SC-RAVI",
    name: "Ravi Kumar",
    phone: "+919701338890",
    address: "Shop 6, Ranigunj Bus Depot Road",
    city: "Hyderabad",
    region: "telangana",
    segment: "retail",
    creditApproved: false,
    creditLimit: 0,
    createdAt: DEMO_TODAY,
    notes: "First-time retail buyer from the storefront.",
  },
};

export const FIXTURE_CUSTOMER_IDS = {
  anjali: "CUST-SC-ANJALI",
  vijaya: "CUST-SC-VIJAYA",
  ravi: "CUST-SC-RAVI",
} as const;

/* ── Order fixtures ────────────────────────────────────────────────────── */

export interface OrderFixture {
  /** The key a scenario step uses in `{ type: "place-order", orderRef }`. */
  ref: string;
  orderId: string;
  orderNo: string;
  customerId: string;
  placedAt: string;
  lines: LineInput[];
  paymentMode: PaymentMode;
  channel: OrderChannel;
  region: Region;
  /** Agents credited on the order's provenance trail. */
  handledBy: string[];
  /** One-line description for the scenario launcher and the inspector. */
  label: string;
}

const ORDER_FIXTURE_LIST: OrderFixture[] = [
  {
    ref: "smoke-anjali",
    orderId: "ORD-SC-0451",
    orderNo: "JSMB-2026-0451",
    customerId: FIXTURE_CUSTOMER_IDS.anjali,
    placedAt: DEMO_TODAY,
    lines: [
      { productCode: "PT-SB", size: 8, unit: "lot", qty: 6 },
      { productCode: "P-PT", size: 16, unit: "lot", qty: 4 },
    ],
    paymentMode: "credit",
    channel: "storefront",
    region: "telangana",
    handledBy: ["CAT", "TON", "IDN", "PRC", "PAY", "GST", "SMS", "DSP"],
    label: "Anjali Traders — 6 lots sweet-box + 4 lots plain thin (5 t)",
  },
  {
    ref: "retail-walkup",
    orderId: "ORD-SC-0452",
    orderNo: "JSMB-2026-0452",
    customerId: FIXTURE_CUSTOMER_IDS.ravi,
    placedAt: DEMO_TODAY,
    lines: [{ productCode: "PT-CP", size: 12, unit: "bundle", qty: 8 }],
    paymentMode: "razorpay",
    channel: "storefront",
    region: "telangana",
    handledBy: ["CAT", "TON", "IDN", "PRC", "PAY", "GST", "SMS"],
    label: "Ravi Kumar — 8 bundles patterned thin caps (200 kg, prepaid)",
  },
  {
    ref: "vijayawada-converted",
    orderId: "ORD-SC-0453",
    orderNo: "JSMB-2026-0453",
    customerId: FIXTURE_CUSTOMER_IDS.vijaya,
    placedAt: DEMO_TODAY,
    lines: [{ productCode: "P-PK", size: 32, unit: "lot", qty: 36 }],
    paymentMode: "credit",
    channel: "enquiry",
    region: "andhra-pradesh",
    handledBy: ["LED", "TON", "PRC", "PAY", "GST", "DSP"],
    label: "Sri Vijaya Packaging — 36 lots plain thick (18 t, first tranche of a 35 t enquiry)",
  },
];

export const ORDER_FIXTURES: Record<string, OrderFixture> = ORDER_FIXTURE_LIST.reduce(
  (acc, f) => ({ ...acc, [f.ref]: f }),
  {} as Record<string, OrderFixture>,
);

export const getOrderFixture = (ref: string): OrderFixture | undefined => ORDER_FIXTURES[ref];

/** The order id a ref will produce — usable before the order has been placed. */
export const fixtureOrderId = (ref: string): string | undefined => ORDER_FIXTURES[ref]?.orderId;

export const fixtureCustomer = (customerId: string): Customer | undefined =>
  FIXTURE_CUSTOMERS[customerId];

/**
 * Prices a fixture through the real engine and assembles the `Order`.
 * The order lands as `placed` / unpaid — payment, invoicing and dispatch are
 * separate scenario beats so the trace shows each agent earning its keep.
 */
export function buildFixtureOrder(fixture: OrderFixture, ctx: PricingContext): Order {
  const quote = quoteOrder(fixture.lines, ctx);
  return {
    id: fixture.orderId,
    orderNo: fixture.orderNo,
    customerId: fixture.customerId,
    placedAt: fixture.placedAt,
    status: "placed",
    lines: quote.lines,
    totalWeightKg: quote.totalWeightKg,
    subtotal: quote.subtotal,
    deliveryCharge: quote.deliveryCharge,
    gstRate: quote.gstRate,
    gstAmount: quote.gstAmount,
    total: quote.total,
    paidAmount: 0,
    dueAmount: quote.total,
    paymentState: "pending",
    paymentMode: fixture.paymentMode,
    margin: quote.margin,
    region: fixture.region,
    fulfillmentSource: "own-mill",
    channel: fixture.channel,
    handledBy: fixture.handledBy,
  };
}

/* ── Enquiry fixtures ──────────────────────────────────────────────────── */

export interface EnquiryFixture {
  ref: string;
  enquiry: Enquiry;
}

const ENQUIRY_FIXTURE_LIST: EnquiryFixture[] = [
  {
    ref: "bulk-vijayawada",
    enquiry: {
      id: "ENQ-SC-0031",
      kind: "large-order",
      name: "K. Srinivas — Sri Vijaya Packaging Works",
      phone: "+919000445512",
      address: "Plot 14, Auto Nagar Industrial Estate, Vijayawada",
      issue: "Need 35 tonnes of plain thick board, 32 oz, over the next six weeks.",
      extraInfo:
        "Website blocked the basket at 20 t. Splitting into tranches is fine. Needs a firm per-kg rate for a six-week supply.",
      estTonnage: 35,
      status: "new",
      createdAt: DEMO_TODAY,
      region: "andhra-pradesh",
    },
  },
  {
    ref: "contact-warangal",
    enquiry: {
      id: "ENQ-SC-0032",
      kind: "contact",
      name: "M. Latha — Latha Printers",
      phone: "+919912207744",
      address: "8-2-11, Station Road, Warangal",
      issue: "Asking whether file-size patterned thick can be cut to a custom 30 oz.",
      extraInfo: "Small monthly volume — around 20 bundles — but wants a standing arrangement.",
      status: "new",
      createdAt: DEMO_TODAY,
      region: "telangana",
    },
  },
];

export const ENQUIRY_FIXTURES: Record<string, EnquiryFixture> = ENQUIRY_FIXTURE_LIST.reduce(
  (acc, f) => ({ ...acc, [f.ref]: f }),
  {} as Record<string, EnquiryFixture>,
);

export const getEnquiryFixture = (ref: string): EnquiryFixture | undefined =>
  ENQUIRY_FIXTURES[ref];

export const fixtureEnquiryId = (ref: string): string | undefined =>
  ENQUIRY_FIXTURES[ref]?.enquiry.id;

/** A fresh copy, so a replayed scenario can never mutate the fixture itself. */
export function buildFixtureEnquiry(fixture: EnquiryFixture): Enquiry {
  return { ...fixture.enquiry };
}
