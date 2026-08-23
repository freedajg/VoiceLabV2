/**
 * Scenarios — the stories the runtime plays.
 *
 * This file ships ONE short end-to-end smoke run so the machinery is
 * demonstrably working: twelve agents wired, effects landing on the real data
 * store, an approval that genuinely blocks, and a deny branch that produces a
 * materially different outcome. The four full demo scenarios are written in
 * wave 3 and appended to `SCENARIOS`.
 *
 * Writing a scenario — the four things worth knowing:
 *
 *  1. `delayMs` is the real wait before the next beat (scaled by playback
 *     speed). `durationMs` is the simulated time the beat occupies on the
 *     trace timeline. Give both; the trace then reads identically at 0.5× and
 *     4× while the pacing still feels right at each speed.
 *  2. A step with `approval` stops the run dead until the owner answers.
 *  3. An option id beginning with `deny` takes the refusal branch: the player
 *     jumps forward to the next step carrying `payload: { resumeAfterDeny: true }`,
 *     or ends the run if there is none.
 *  4. A `complete` step from ORCH closes the run, so alternate branch tails can
 *     live after it in the same array. (Opt out with `payload: { endsRun: false }`.)
 */
import type { Scenario, ScenarioStep } from "../../contracts/agents";
import { FIXTURE_CUSTOMER_IDS } from "../fixtures";

/* ── Figures used by the smoke run ─────────────────────────────────────── */

/*
 * Anjali Traders' basket, priced at the default assumptions:
 *   6 lots PT-SB (sweet box, 8 oz)  = 120 bundles = 3,000 kg @ ₹690  = ₹82,800
 *   4 lots P-PT  (plain thin, 16 oz) = 80 bundles = 2,000 kg @ ₹570  = ₹45,600
 *   ─────────────────────────────────────────────────────────────────────────
 *   200 bundles · 5,000 kg · subtotal ₹1,28,400 · standard cost ₹1,01,000
 *   margin ₹27,400 (21.3%) · free delivery (≥ 2 t) · GST 12% ₹15,408
 *   payable ₹1,43,808
 * Every figure below is checkable against domain/constants.ts.
 */
const SUBTOTAL = 128400;
const STANDARD_COST = 101000;
const MARGIN = 27400;
const GST_AMOUNT = 15408;
const TOTAL = 143808;
const WEIGHT_KG = 5000;
const CREDIT_LIMIT = 150000;

const smokeSteps: ScenarioStep[] = [
  {
    agentId: "ORCH",
    kind: "spawn",
    message:
      "New web order landed from Anjali Traders, Secunderabad. Opening run and calling the front office.",
    payload: { channel: "storefront", buyer: "Anjali Traders", city: "Secunderabad" },
    durationMs: 420,
    delayMs: 520,
    focusRoute: "/shop/catalogue",
  },
  {
    agentId: "ORCH",
    kind: "handoff",
    targetAgentId: "CAT",
    message: "Kagaz first — confirm the variants and the pattern charge.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "CAT",
    kind: "tool-call",
    toolName: "catalogue.lookup",
    message:
      "Two variants matched: patterned thin sweet-box at ₹690 a bundle, plain thin at ₹570 a bundle.",
    payload: {
      lines: [
        { code: "PT-SB", size: "8 oz", pattern: "Sweet Boxes", pricePerBundle: 690, pricePerKg: 27.6 },
        { code: "P-PT", size: "16 oz", pattern: "Plain", pricePerBundle: 570, pricePerKg: 22.8 },
      ],
      patternChargeApplied: 120,
    },
    durationMs: 640,
    delayMs: 820,
    focusRoute: "/shop/catalogue",
  },
  {
    agentId: "CAT",
    kind: "handoff",
    targetAgentId: "TON",
    message: "Basket built — passing to Tolak for the weighbridge check.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "TON",
    kind: "tool-call",
    toolName: "tonnage.cap_check",
    message:
      "6 lots plus 4 lots is 200 bundles — 5,000 kg. That is 25% of the 20 t ceiling, so self-service stands.",
    payload: {
      lots: 10,
      bundles: 200,
      weightKg: WEIGHT_KG,
      capKg: 20000,
      capUsedPct: 25,
      withinCap: true,
    },
    durationMs: 700,
    delayMs: 900,
    focusRoute: "/shop/cart",
  },
  {
    agentId: "TON",
    kind: "handoff",
    targetAgentId: "IDN",
    message: "Under the cap. Pehchan, sign the buyer in.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "IDN",
    kind: "tool-call",
    toolName: "otp.verify",
    message:
      "One-time code verified on the first attempt. GSTIN 36AAJCA9921K1ZP is a valid Telangana number.",
    payload: {
      phone: "+91 98490 ***14",
      attempt: 1,
      gstin: "36AAJCA9921K1ZP",
      gstinValid: true,
      stateCode: "36 — Telangana",
    },
    durationMs: 600,
    delayMs: 780,
    focusRoute: "/shop/checkout",
  },
  {
    agentId: "IDN",
    kind: "handoff",
    targetAgentId: "PRC",
    message: "Buyer verified and on file — Mulya, price it.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "PRC",
    kind: "tool-call",
    toolName: "pricing.quote",
    message: "Pricing 10 lots against today's ₹20.20/kg standard cost.",
    payload: { basis: "standard cost from live assumptions", weightKg: WEIGHT_KG },
    effect: { type: "place-order", orderRef: "smoke-anjali" },
    durationMs: 520,
    delayMs: 640,
    focusRoute: "/shop/checkout",
  },
  {
    agentId: "PRC",
    kind: "tool-result",
    toolName: "pricing.quote",
    message:
      "₹1,28,400 ex-GST against ₹1,01,000 of standard cost — ₹27,400 margin, 21.3%. Free delivery at 5 t. Payable ₹1,43,808.",
    payload: {
      subtotal: SUBTOTAL,
      standardCost: STANDARD_COST,
      margin: MARGIN,
      marginPct: 21.3,
      marginPerKg: 5.48,
      deliveryCharge: 0,
      deliveryNote: "Free at or above the 2,000 kg threshold",
      gstRate: 0.12,
      gstAmount: GST_AMOUNT,
      total: TOTAL,
    },
    durationMs: 700,
    delayMs: 900,
  },
  {
    agentId: "PRC",
    kind: "handoff",
    targetAgentId: "PAY",
    message: "Quote holds. Lenden, take the money.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "PAY",
    kind: "tool-call",
    toolName: "credit.check",
    level: "warn",
    message:
      "Anjali Traders is credit-approved with a ₹1,50,000 limit and nothing outstanding — but ₹1,43,808 leaves only ₹6,192 of headroom.",
    payload: {
      creditApproved: true,
      creditLimit: CREDIT_LIMIT,
      outstanding: 0,
      requested: TOTAL,
      headroomAfter: CREDIT_LIMIT - TOTAL,
      ownerThreshold: 100000,
    },
    durationMs: 660,
    delayMs: 860,
  },
  {
    agentId: "PAY",
    kind: "approval-request",
    message: "Holding the order. This one is above the owner threshold — Ajay decides.",
    approval: {
      agentId: "PAY",
      title: "Release ₹1,43,808 on 30-day credit?",
      summary:
        "Anjali Traders wants this order on their credit line rather than paying up front. They are approved and clean, but the order takes them to 96% of their limit.",
      facts: [
        { label: "Buyer", value: "Anjali Traders, Secunderabad" },
        { label: "Order", value: "10 lots · 200 bundles · 5,000 kg" },
        { label: "Payable", value: "₹1,43,808", emphasis: true },
        { label: "Credit limit", value: "₹1,50,000" },
        { label: "Currently outstanding", value: "₹0" },
        { label: "Headroom left after this", value: "₹6,192", emphasis: true },
        { label: "Margin on the order", value: "₹27,400 (21.3%)" },
      ],
      options: [
        { id: "approve-credit-30d", label: "Release on 30-day credit", tone: "primary" },
        { id: "deny-require-prepay", label: "Decline — ask for UPI up front", tone: "danger" },
      ],
    },
    durationMs: 200,
    delayMs: 200,
    focusRoute: "/agents",
  },
  {
    agentId: "PAY",
    kind: "tool-call",
    toolName: "payment.record_cod",
    message: "Credit released. Order booked as due — ₹1,43,808 payable by 2 August.",
    payload: { terms: "Net 30", dueOn: "2026-08-02", paymentState: "due" },
    effect: { type: "record-payment", orderRef: "smoke-anjali", mode: "credit" },
    durationMs: 640,
    delayMs: 820,
    focusRoute: "/shop/confirmation",
  },
  {
    agentId: "PAY",
    kind: "handoff",
    targetAgentId: "GST",
    message: "Credit is released, so the supply is billable. Bill, raise the invoice.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "GST",
    kind: "tool-call",
    toolName: "invoice.generate",
    message:
      "Tax invoice raised — intra-state, so CGST ₹7,704 plus SGST ₹7,704 on ₹1,28,400 taxable, HSN 48239019.",
    payload: {
      intraState: true,
      sellerState: "36 — Telangana",
      buyerState: "36 — Telangana",
      hsn: "48239019",
      gstRate: 0.12,
      taxableValue: SUBTOTAL,
      cgst: 7704,
      sgst: 7704,
      igst: 0,
      invoiceTotal: TOTAL,
    },
    effect: { type: "issue-invoice", orderRef: "smoke-anjali" },
    durationMs: 720,
    delayMs: 900,
  },
  {
    agentId: "GST",
    kind: "handoff",
    targetAgentId: "SMS",
    message: "Invoice numbered and downloadable. Sandesh, tell the buyer.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "SMS",
    kind: "tool-call",
    toolName: "sms.send_dlt",
    message:
      "Confirmation sent on the registered header JSMBPL — order number, 200 bundles, ₹1,43,808, due 2 August.",
    payload: {
      header: "JSMBPL",
      templateId: "JSMB_ORDER_CONF_V2",
      to: "+91 98490 ***14",
      body:
        "JSMB: Order JSMB-2026-0451 confirmed. 200 bundles / 5,000 kg. Amount Rs.1,43,808 on 30-day credit, due 02-08-2026. Invoice attached to your account.",
      dltApproved: true,
    },
    durationMs: 620,
    delayMs: 820,
  },
  {
    agentId: "SMS",
    kind: "handoff",
    targetAgentId: "DSP",
    message: "Buyer notified. Vahan, book the load.",
    durationMs: 160,
    delayMs: 300,
  },
  {
    agentId: "DSP",
    kind: "tool-call",
    toolName: "dispatch.plan",
    message:
      "5 t is one six-wheeler. Order confirmed, loading slot 5 July, delivery window 6–7 July into Secunderabad.",
    payload: {
      vehicle: "6-wheeler (9 t capacity)",
      trips: 1,
      loadKg: WEIGHT_KG,
      loadingSlot: "2026-07-05",
      deliveryWindow: "2026-07-06 → 2026-07-07",
      destination: "Monda Market, Secunderabad",
    },
    effect: { type: "advance-order", orderRef: "smoke-anjali", status: "confirmed" },
    durationMs: 700,
    delayMs: 900,
    focusRoute: "/admin/sales",
  },
  {
    agentId: "ORCH",
    kind: "complete",
    message:
      "Run closed. JSMB-2026-0451 — ₹1,43,808 on 30-day credit, invoice raised, buyer notified, dispatch booked.",
    payload: {
      orderNo: "JSMB-2026-0451",
      agentsInvolved: 9,
      toolCalls: 8,
      handoffs: 8,
      humanDecisions: 1,
      outcome: "credit-approved",
    },
    durationMs: 420,
    delayMs: 420,
    focusRoute: "/admin/sales",
  },

  /* ── Refusal branch — reached only when Ajay declines ─────────────────── */
  {
    agentId: "PAY",
    kind: "guardrail",
    level: "warn",
    message:
      "Ajay declined the credit release. The order stays at Placed with ₹1,43,808 outstanding, and nothing gets billed.",
    payload: {
      resumeAfterDeny: true,
      guardrail: "COD or credit only for admin-approved buyers, never above the credit limit",
      orderStatus: "placed",
      paymentState: "pending",
      dueAmount: TOTAL,
      invoiceRaised: false,
    },
    durationMs: 620,
    delayMs: 820,
    focusRoute: "/admin/customers",
  },
  {
    agentId: "SMS",
    kind: "tool-call",
    toolName: "sms.send_dlt",
    message:
      "Payment-link message sent instead of a confirmation. Nothing ships and nothing is invoiced until the money lands.",
    payload: {
      header: "JSMBPL",
      templateId: "JSMB_PAY_LINK_V1",
      to: "+91 98490 ***14",
      body:
        "JSMB: Order JSMB-2026-0451 is reserved for 48 hours. Please pay Rs.1,43,808 by UPI to confirm. Link in your account.",
      dltApproved: true,
    },
    durationMs: 600,
    delayMs: 780,
  },
  {
    agentId: "ORCH",
    kind: "complete",
    level: "warn",
    message:
      "Run closed on the refusal path: order held at Placed, no invoice, no dispatch. One decision changed the outcome.",
    payload: {
      orderNo: "JSMB-2026-0451",
      outcome: "credit-declined",
      invoiceRaised: false,
      dispatched: false,
      dueAmount: TOTAL,
    },
    durationMs: 420,
    delayMs: 420,
    focusRoute: "/admin/customers",
  },
];

export const SMOKE_SCENARIO: Scenario = {
  id: "smoke",
  title: "Web order, end to end",
  subtitle: "Catalogue → cart → OTP → quote → credit decision → invoice → SMS → dispatch",
  narration:
    "This is one order going through the whole business, and every step you see is an agent doing a job with a name on it. Anjali Traders puts ten lots in the basket. Tolak weighs it — five tonnes, a quarter of the twenty-tonne ceiling, so it stays on self-service. Pehchan signs her in on a one-time code and checks the GSTIN. Mulya prices it against the ₹20.20 standard cost and tells you the margin before anyone commits: twenty-seven thousand four hundred rupees, twenty-one per cent. Then Lenden stops. She's asking for a hundred and forty-four thousand on credit against a hundred and fifty thousand limit, and the system will not make that call on its own — it comes to Ajay. Say yes and Bill raises the GST invoice, Sandesh sends the DLT confirmation and Vahan books the truck. Say no and watch what happens instead: no invoice, no dispatch, the money stays outstanding, and Ajay's dues figure moves. Same run, different outcome, decided by the owner.",
  brdRefs: [
    "FR-W-01",
    "FR-W-04",
    "FR-W-05",
    "FR-W-08",
    "FR-W-11",
    "FR-W-13",
    "FR-W-14",
    "FR-W-15",
    "FR-W-16",
    "FR-A-13",
  ],
  estSeconds: 22,
  agents: ["ORCH", "CAT", "TON", "IDN", "PRC", "PAY", "GST", "SMS", "DSP"],
  steps: smokeSteps,
};

export const SCENARIOS: Scenario[] = [SMOKE_SCENARIO];

export const SCENARIO_BY_ID: Record<string, Scenario> = SCENARIOS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<string, Scenario>,
);

/** Customer ids a scenario may act on — re-exported so wave 3 need not dig. */
export { FIXTURE_CUSTOMER_IDS };
