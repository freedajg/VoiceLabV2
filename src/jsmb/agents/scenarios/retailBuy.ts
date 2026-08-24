/**
 * Scenario 1 — the warm-up. A small prepaid retail order, start to finish, in
 * under half a minute.
 *
 * Its job in a pitch is to establish that the whole loop works before anything
 * clever happens: browse, weigh, sign in, pay, invoice, SMS. No approval, no
 * branch, nothing withheld. Run it first.
 *
 * See ./index.ts for the scenario authoring rules.
 */
import type { Scenario, ScenarioStep } from "../../contracts/agents";

/*
 * Ravi Kumar's basket, priced at the default assumptions:
 *   8 bundles PT-CP (caps, 12 oz) = 200 kg @ ₹690/bundle = ₹5,520
 *   ───────────────────────────────────────────────────────────────
 *   200 kg is under the 2 t free-delivery threshold, so the flat ₹1,500
 *   delivery charge applies — the one place in the demo where it shows.
 *   taxable ₹7,020 · GST 12% ₹842.40 · payable ₹7,862.40
 *   standard cost 200 × ₹20.20 = ₹4,040 · margin ₹1,480 (26.8%)
 * Every figure is checkable against domain/constants.ts.
 */
const SUBTOTAL = 5520;
const DELIVERY = 1500;
const TAXABLE = 7020;
const GST_AMOUNT = 842.4;
const TOTAL = 7862.4;
const STANDARD_COST = 4040;
const MARGIN = 1480;
const WEIGHT_KG = 200;

const steps: ScenarioStep[] = [
  {
    agentId: "ORCH",
    kind: "spawn",
    message: "Walk-up buyer on the phone storefront. Small basket — routing it straight through.",
    payload: { channel: "storefront", buyer: "Ravi Kumar", city: "Hyderabad", device: "mobile" },
    durationMs: 360,
    delayMs: 460,
    focusRoute: "/shop/catalogue",
  },
  {
    agentId: "CAT",
    kind: "tool-call",
    toolName: "catalogue.lookup",
    message: "Patterned thin, caps finish, 12 oz — ₹690 a bundle, ₹27.60 a kilo.",
    payload: {
      code: "PT-CP",
      size: "12 oz",
      pattern: "Caps",
      basePricePerBundle: 570,
      patternCharge: 120,
      pricePerBundle: 690,
      pricePerKg: 27.6,
    },
    durationMs: 520,
    delayMs: 640,
    focusRoute: "/shop/product/PT-CP",
  },
  {
    agentId: "CAT",
    kind: "handoff",
    targetAgentId: "TON",
    message: "Eight bundles in the basket. Tolak, weigh it.",
    durationMs: 160,
    delayMs: 260,
  },
  {
    agentId: "TON",
    kind: "tool-call",
    toolName: "tonnage.check",
    message: "8 bundles — 200 kg. One per cent of the twenty-tonne ceiling. Self-service, no cap issue.",
    payload: {
      bundles: 8,
      weightKg: WEIGHT_KG,
      capKg: 20000,
      capUsedPct: 1,
      withinCap: true,
    },
    durationMs: 380,
    delayMs: 520,
    focusRoute: "/shop/cart",
  },
  {
    agentId: "TON",
    kind: "handoff",
    targetAgentId: "IDN",
    message: "Under the cap. Pehchan, sign him in.",
    durationMs: 150,
    delayMs: 240,
  },
  {
    agentId: "IDN",
    kind: "tool-call",
    toolName: "otp.issue",
    message: "One-time code sent to +91 98661 ***07. No password, no account to remember.",
    payload: { phone: "+91 98661 ***07", codeLength: 6, expirySeconds: 120, attemptsAllowed: 3 },
    durationMs: 460,
    delayMs: 600,
  },
  {
    agentId: "IDN",
    kind: "tool-result",
    level: "success",
    toolName: "otp.verify",
    message: "Verified. Retail buyer, no GSTIN on file, not credit-approved — so this one pays up front.",
    payload: { verified: true, segment: "retail", gstin: null, creditApproved: false },
    durationMs: 340,
    delayMs: 460,
  },
  {
    agentId: "IDN",
    kind: "handoff",
    targetAgentId: "PRC",
    message: "Mulya, price it and tell us the margin.",
    durationMs: 150,
    delayMs: 240,
  },
  {
    agentId: "PRC",
    kind: "tool-call",
    toolName: "pricing.quote",
    message:
      "₹5,520 of board. Under two tonnes, so the ₹1,500 delivery charge applies — GST on ₹7,020 is ₹842. Payable ₹7,862.",
    payload: {
      subtotal: SUBTOTAL,
      deliveryCharge: DELIVERY,
      deliveryReason: "below 2 t free-delivery threshold (BRD D6, editable)",
      taxableValue: TAXABLE,
      gstRate: 0.12,
      gstAmount: GST_AMOUNT,
      total: TOTAL,
    },
    durationMs: 640,
    delayMs: 800,
    focusRoute: "/shop/checkout",
  },
  {
    agentId: "PRC",
    kind: "emit",
    level: "success",
    message:
      "Margin ₹1,480 on ₹5,520 — 26.8%. Patterned thin is the best line in the book at ₹7.40 a kilo.",
    payload: {
      standardCostPerKg: 20.2,
      standardCost: STANDARD_COST,
      margin: MARGIN,
      marginPerKg: 7.4,
      marginPct: 26.8,
    },
    durationMs: 420,
    delayMs: 560,
  },
  {
    agentId: "PRC",
    kind: "handoff",
    targetAgentId: "PAY",
    message: "Prepaid buyer. Lenden, take the money.",
    durationMs: 150,
    delayMs: 240,
  },
  {
    agentId: "PAY",
    kind: "tool-call",
    toolName: "payment.charge",
    message: "Razorpay UPI collect sent. No card details ever touch JSMB's systems.",
    payload: { gateway: "razorpay", method: "upi", amount: TOTAL, vpa: "ravi****@okhdfcbank" },
    durationMs: 900,
    delayMs: 1000,
  },
  {
    agentId: "PAY",
    kind: "tool-result",
    level: "success",
    toolName: "payment.charge",
    message: "Paid in full. Nothing outstanding on this one.",
    payload: { status: "success", paidAmount: TOTAL, dueAmount: 0, txnRef: "pay_SCd7Kq2R91" },
    durationMs: 420,
    delayMs: 540,
    effect: { type: "place-order", orderRef: "retail-walkup" },
  },
  {
    agentId: "PAY",
    kind: "emit",
    level: "success",
    message: "Payment recorded against JSMB-2026-0452.",
    payload: { orderNo: "JSMB-2026-0452" },
    durationMs: 260,
    delayMs: 360,
    effect: { type: "record-payment", orderRef: "retail-walkup", mode: "razorpay" },
  },
  {
    agentId: "PAY",
    kind: "handoff",
    targetAgentId: "GST",
    message: "Bill, raise the invoice.",
    durationMs: 150,
    delayMs: 240,
  },
  {
    agentId: "GST",
    kind: "tool-call",
    toolName: "invoice.generate",
    message:
      "GST invoice raised. Intra-state, so it splits CGST ₹421.20 and SGST ₹421.20 against HSN 48239019.",
    payload: {
      hsn: "48239019",
      gstRate: 0.12,
      taxableValue: TAXABLE,
      cgst: 421.2,
      sgst: 421.2,
      igst: 0,
      total: TOTAL,
      buyerGstin: null,
      note: "Buyer has no GSTIN — B2C invoice.",
    },
    durationMs: 700,
    delayMs: 860,
    effect: { type: "issue-invoice", orderRef: "retail-walkup" },
    focusRoute: "/shop/confirmation",
  },
  {
    agentId: "GST",
    kind: "handoff",
    targetAgentId: "SMS",
    message: "Sandesh, confirm it to him.",
    durationMs: 150,
    delayMs: 240,
  },
  {
    agentId: "SMS",
    kind: "tool-call",
    toolName: "sms.send_dlt",
    message: "Confirmation sent on the DLT-registered template. This is the only message he gets.",
    payload: {
      templateId: "JSMB_ORDER_CONFIRM_V1",
      to: "+91 98661 ***07",
      body:
        "JSMB: Order JSMB-2026-0452 confirmed. 8 bundles patterned thin (caps). Rs.7,862.40 paid. GST invoice in your account.",
      dltApproved: true,
    },
    durationMs: 620,
    delayMs: 760,
  },
  {
    agentId: "DSP",
    kind: "emit",
    level: "success",
    message: "Order moved to Confirmed and queued for the Hyderabad run.",
    payload: { status: "confirmed", region: "telangana", fulfillmentSource: "own-mill" },
    durationMs: 380,
    delayMs: 500,
    effect: { type: "advance-order", orderRef: "retail-walkup", status: "confirmed" },
  },
  {
    agentId: "ORCH",
    kind: "complete",
    level: "success",
    message:
      "Done — nineteen seconds, seven agents, no human touched it. ₹1,480 of margin banked and the books already reflect it.",
    payload: {
      orderNo: "JSMB-2026-0452",
      agentsInvolved: 7,
      humanTouches: 0,
      margin: MARGIN,
      paid: TOTAL,
    },
    durationMs: 420,
    delayMs: 420,
    focusRoute: "/admin",
  },
];

export const RETAIL_BUY: Scenario = {
  id: "retail-buy",
  title: "A small order, hands off",
  subtitle: "Browse → weigh → OTP → pay → GST invoice → SMS, with no human in the loop",
  narration:
    "Start here. This is the ordinary case — a small buyer, eight bundles, two hundred kilos — and the point is that nobody at JSMB touches it. Kagaz answers the product question. Tolak weighs the basket and confirms it is nowhere near the twenty-tonne ceiling. Pehchan signs him in with a one-time code, no password to lose, and notes he is not credit-approved, so he pays up front. Mulya prices it and — this is the part Ajay has never had before — tells you the margin at the moment of sale: ₹1,480, twenty-seven per cent, because patterned thin is the best line in the book. Two hundred kilos is under the free-delivery line, so the ₹1,500 charge appears; that threshold is a setting you can change on screen. Lenden takes the money through Razorpay, Bill raises a compliant GST invoice with the HSN and the CGST-SGST split, Sandesh sends the one DLT-approved message. Nineteen seconds, seven agents, zero phone calls. Then look at the dashboard — the order is already in the books.",
  brdRefs: [
    "FR-W-01",
    "FR-W-04",
    "FR-W-07",
    "FR-W-08",
    "FR-W-11",
    "FR-W-12",
    "FR-W-14",
    "FR-W-15",
    "FR-W-16",
    "FR-A-13",
  ],
  estSeconds: 19,
  agents: ["ORCH", "CAT", "TON", "IDN", "PRC", "PAY", "GST", "SMS", "DSP"],
  steps,
};
