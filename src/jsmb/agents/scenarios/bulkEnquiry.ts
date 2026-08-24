/**
 * Scenario 3 — the order the website is not allowed to take.
 *
 * A 35 t requirement hits the 20 t ceiling, gets captured as a lead instead of
 * being lost, and Ajay converts the first tranche himself. Along the way it
 * exposes the uncomfortable truth in JSMB's own price list: plain thick earns
 * ₹0.60 a kilo, so eighteen tonnes of it is worth ₹10,800.
 *
 * See ./index.ts for the scenario authoring rules.
 */
import type { Scenario, ScenarioStep } from "../../contracts/agents";

/*
 * Sri Vijaya Packaging, Vijayawada. Enquiry is 35 t of plain thick, 32 oz.
 * First tranche converted by Ajay:
 *   36 lots P-PK = 720 bundles = 18,000 kg @ ₹520/bundle = ₹3,74,400
 *   ────────────────────────────────────────────────────────────────
 *   18 t is over the 2 t free-delivery threshold → no delivery charge
 *   GST 12% ₹44,928 · payable ₹4,19,328
 *   standard cost 18,000 × ₹20.20 = ₹3,63,600 · margin ₹10,800
 *   margin per kg ₹0.60 — exactly the BRD §6.3 figure for Plain Thick
 * The comparison that lands: the same 18 t in patterned thin would earn
 * ₹7.40/kg = ₹1,33,200. Twelve times the money on the same tonnage.
 */
const ENQUIRY_TONNES = 35;
const TRANCHE_KG = 18000;
const SUBTOTAL = 374400;
const GST_AMOUNT = 44928;
const TOTAL = 419328;
const STANDARD_COST = 363600;
const MARGIN = 10800;
const MARGIN_PER_KG = 0.6;
const PATTERNED_THIN_EQUIVALENT = 133200;

const steps: ScenarioStep[] = [
  {
    agentId: "ORCH",
    kind: "spawn",
    message:
      "Basket on the storefront is asking for thirty-five tonnes. That is above what the site is allowed to sell.",
    payload: { channel: "storefront", buyer: "Sri Vijaya Packaging Works", city: "Vijayawada" },
    durationMs: 400,
    delayMs: 520,
    focusRoute: "/shop/cart",
  },
  {
    agentId: "TON",
    kind: "tool-call",
    toolName: "tonnage.check",
    message: "35,000 kg against a 20,000 kg ceiling. 175% of cap — this cannot go through checkout.",
    payload: {
      requestedKg: 35000,
      capKg: 20000,
      capBundles: 800,
      capLots: 40,
      capUsedPct: 175,
      withinCap: false,
    },
    durationMs: 560,
    delayMs: 700,
  },
  {
    agentId: "TON",
    kind: "guardrail",
    level: "warn",
    message:
      "Checkout blocked. The twenty-tonne rule is a hard limit — I do not have the authority to let this past.",
    payload: {
      guardrail: "Never lets an order past 20 t — routes to enquiry instead",
      brdRef: "FR-W-05",
      action: "block-checkout",
    },
    durationMs: 480,
    delayMs: 640,
  },
  {
    agentId: "TON",
    kind: "handoff",
    targetAgentId: "LED",
    message:
      "Sampark, take it. A blocked basket is a lead, not a lost sale — that is the whole point of the rule.",
    durationMs: 180,
    delayMs: 300,
    focusRoute: "/shop/enquiry",
  },
  {
    agentId: "LED",
    kind: "tool-call",
    toolName: "enquiry.capture",
    message:
      "Large-order enquiry captured: 35 t plain thick, 32 oz, over six weeks. Tranches acceptable.",
    payload: {
      name: "K. Srinivas — Sri Vijaya Packaging Works",
      phone: "+91 90004 ***12",
      address: "Plot 14, Auto Nagar Industrial Estate, Vijayawada",
      estTonnage: ENQUIRY_TONNES,
      region: "andhra-pradesh",
      status: "new",
    },
    durationMs: 700,
    delayMs: 860,
    effect: { type: "add-enquiry", enquiryRef: "bulk-vijayawada" },
  },
  {
    agentId: "LED",
    kind: "emit",
    level: "success",
    message:
      "It is on Ajay's enquiry board with a timestamp. Under the old process this was a missed phone call.",
    payload: { funnel: "new", brdRefs: ["FR-W-06", "FR-W-17"] },
    durationMs: 400,
    delayMs: 560,
    focusRoute: "/admin/enquiries",
  },
  {
    agentId: "LED",
    kind: "handoff",
    targetAgentId: "PRC",
    message: "Mulya, what is a first tranche of eighteen tonnes actually worth to us?",
    durationMs: 180,
    delayMs: 300,
  },
  {
    agentId: "PRC",
    kind: "tool-call",
    toolName: "pricing.quote",
    message:
      "36 lots plain thick — 18 tonnes, ₹3,74,400 of board. Over two tonnes, so delivery is free.",
    payload: {
      lines: [{ code: "P-PK", size: "32 oz", unit: "lot", qty: 36, bundles: 720, weightKg: TRANCHE_KG }],
      subtotal: SUBTOTAL,
      deliveryCharge: 0,
      gstRate: 0.12,
      gstAmount: GST_AMOUNT,
      total: TOTAL,
    },
    durationMs: 720,
    delayMs: 880,
  },
  {
    agentId: "PRC",
    kind: "emit",
    level: "warn",
    message:
      "Margin ₹10,800 on ₹3,74,400. That is ₹0.60 a kilo — eighteen tonnes of work for under eleven thousand rupees.",
    payload: {
      standardCostPerKg: 20.2,
      standardCost: STANDARD_COST,
      margin: MARGIN,
      marginPerKg: MARGIN_PER_KG,
      marginPct: 2.9,
      brdRef: "FR-A-13",
      note: "Plain Thick is the thinnest-margin line in the book (BRD §6.3).",
    },
    durationMs: 620,
    delayMs: 820,
  },
  {
    agentId: "PRC",
    kind: "emit",
    level: "info",
    message:
      "For comparison: the same eighteen tonnes in patterned thin would earn ₹1,33,200. Twelve times the money, identical tonnage.",
    payload: {
      plainThickMarginPerKg: 0.6,
      patternedThinMarginPerKg: 7.4,
      sameTonnageMargin: PATTERNED_THIN_EQUIVALENT,
      differenceMultiple: 12.3,
    },
    durationMs: 540,
    delayMs: 760,
  },
  {
    agentId: "PRC",
    kind: "handoff",
    targetAgentId: "PAY",
    message: "New buyer, no credit history with us. Lenden, check before we commit anything.",
    durationMs: 180,
    delayMs: 300,
  },
  {
    agentId: "PAY",
    kind: "tool-call",
    toolName: "credit.check",
    message: "Sri Vijaya Packaging is not credit-approved and has no limit set. I cannot offer terms.",
    payload: { creditApproved: false, creditLimit: 0, outstandingDues: 0, requested: TOTAL },
    durationMs: 520,
    delayMs: 660,
  },
  {
    agentId: "PAY",
    kind: "approval-request",
    level: "warn",
    message: "This needs Ajay. Approving credit for a new Andhra buyer is an owner decision.",
    durationMs: 380,
    delayMs: 400,
    focusRoute: "/admin/enquiries",
    approval: {
      agentId: "PAY",
      title: "Approve credit for a new buyer?",
      summary:
        "Sri Vijaya Packaging Works wants 35 t over six weeks and needs terms to start. Approving sets a credit limit and unlocks pay-on-delivery for them at checkout. The first tranche is 18 t at ₹4,19,328.",
      facts: [
        { label: "Buyer", value: "Sri Vijaya Packaging Works, Vijayawada" },
        { label: "Enquiry", value: "35 t plain thick, 32 oz, over six weeks" },
        { label: "First tranche", value: "18 t · ₹4,19,328 incl. GST", emphasis: true },
        { label: "Margin on tranche", value: "₹10,800 · ₹0.60/kg · 2.9%", emphasis: true },
        { label: "Credit history with JSMB", value: "None — first order" },
        { label: "Proposed limit", value: "₹4,50,000" },
      ],
      options: [
        { id: "approve-credit", label: "Approve ₹4.5L limit", tone: "primary" },
        { id: "deny-credit", label: "Prepaid only", tone: "danger" },
      ],
    },
  },
  {
    agentId: "PAY",
    kind: "tool-call",
    toolName: "credit.approve",
    level: "success",
    message: "Credit limit ₹4,50,000 set. Pay-on-delivery now appears for this buyer at checkout.",
    payload: { creditApproved: true, creditLimit: 450000, brdRef: "FR-A-04" },
    durationMs: 520,
    delayMs: 660,
    effect: { type: "approve-credit", customerId: "CUST-SC-VIJAYA", limit: 450000 },
  },
  {
    agentId: "LED",
    kind: "tool-call",
    toolName: "enquiry.convert",
    level: "success",
    message: "Enquiry converted. First tranche raised as a real order against the Andhra region.",
    payload: {
      enquiryId: "ENQ-SC-0031",
      orderNo: "JSMB-2026-0453",
      trancheKg: TRANCHE_KG,
      remainingKg: 35000 - TRANCHE_KG,
      region: "andhra-pradesh",
      fulfillmentSource: "own-mill",
    },
    durationMs: 700,
    delayMs: 860,
    effect: { type: "place-order", orderRef: "vijayawada-converted" },
  },
  {
    agentId: "LED",
    kind: "emit",
    message: "Funnel moved: new → converted. 17 t still open on the enquiry for the next tranche.",
    payload: { funnel: "converted", remainingTonnes: 17 },
    durationMs: 360,
    delayMs: 500,
    effect: { type: "convert-enquiry", enquiryRef: "bulk-vijayawada", orderRef: "vijayawada-converted" },
  },
  {
    agentId: "GST",
    kind: "tool-call",
    toolName: "invoice.generate",
    message:
      "Andhra buyer, Telangana seller — so this one is inter-state. IGST ₹44,928 in a single line, not a CGST-SGST split.",
    payload: {
      hsn: "48239019",
      gstRate: 0.12,
      taxableValue: SUBTOTAL,
      cgst: 0,
      sgst: 0,
      igst: GST_AMOUNT,
      total: TOTAL,
      buyerGstin: "37AAGCS8821K1ZP",
      placeOfSupply: "Andhra Pradesh",
    },
    durationMs: 720,
    delayMs: 880,
    effect: { type: "issue-invoice", orderRef: "vijayawada-converted" },
  },
  {
    agentId: "DSP",
    kind: "emit",
    message:
      "Booked against region Andhra Pradesh, sourced from the mill. The V3 Bengaluru model plugs in right here.",
    payload: {
      status: "confirmed",
      region: "andhra-pradesh",
      fulfillmentSource: "own-mill",
      note: "region and fulfillment_source are on the order from day one (BRD §9).",
    },
    durationMs: 440,
    delayMs: 580,
    effect: { type: "advance-order", orderRef: "vijayawada-converted", status: "confirmed" },
  },
  {
    agentId: "ORCH",
    kind: "complete",
    level: "success",
    message:
      "A basket the site had to refuse became an ₹18-tonne order and a customer with terms — plus a warning about what plain thick actually earns.",
    payload: {
      enquiryTonnes: ENQUIRY_TONNES,
      convertedKg: TRANCHE_KG,
      revenue: SUBTOTAL,
      margin: MARGIN,
      marginPerKg: MARGIN_PER_KG,
      openTonnes: 17,
    },
    durationMs: 460,
    delayMs: 460,
    focusRoute: "/admin/sales",
  },

  /* ── Refusal path ───────────────────────────────────────────────────────
     Ajay declines terms. The lead is not lost — it stays in the funnel on a
     prepaid basis — but nothing is invoiced and nothing ships.             */
  {
    agentId: "PAY",
    kind: "emit",
    level: "warn",
    message: "Credit declined. Quoting prepaid only — the buyer may still take it, but on our terms.",
    payload: { resumeAfterDeny: true, creditApproved: false, terms: "prepaid" },
    durationMs: 480,
    delayMs: 620,
  },
  {
    agentId: "LED",
    kind: "tool-call",
    toolName: "enquiry.update",
    message:
      "Enquiry moved to Contacted with a prepaid quote attached. It stays on the board rather than dying.",
    payload: { funnel: "contacted", terms: "prepaid", estTonnage: ENQUIRY_TONNES },
    durationMs: 560,
    delayMs: 720,
    focusRoute: "/admin/enquiries",
  },
  {
    agentId: "ORCH",
    kind: "complete",
    level: "warn",
    message:
      "Refusal path: no order, no invoice, no dispatch — but the lead is still alive and Ajay carries no risk on a first-time Andhra buyer.",
    payload: {
      outcome: "credit-declined",
      orderRaised: false,
      invoiceRaised: false,
      leadStatus: "contacted",
      riskTaken: 0,
    },
    durationMs: 440,
    delayMs: 440,
    focusRoute: "/admin/enquiries",
  },
];

export const BULK_ENQUIRY: Scenario = {
  id: "bulk-enquiry",
  title: "The order the site must refuse",
  subtitle: "35 t hits the cap → captured as a lead → Ajay converts an 18 t first tranche",
  narration:
    "Now the case that matters commercially. A Vijayawada packaging works wants thirty-five tonnes. Tolak weighs it and stops — the twenty-tonne ceiling is a hard rule and no agent can override it. But watch what happens instead of an error page: Sampark turns the blocked basket into a captured lead with a name, a number and a timestamp on Ajay's board. That is the difference between a rule and a wall. Then Mulya prices a first tranche and tells you something the client has never seen laid out: eighteen tonnes of plain thick earns ten thousand eight hundred rupees. Sixty paise a kilo. The same eighteen tonnes in patterned thin would earn one lakh thirty-three thousand. Twelve times the money for the same work through the same machine. Lenden then refuses to extend terms to a first-time buyer on her own authority and brings it to Ajay. Approve, and the enquiry converts, the order is raised against Andhra Pradesh, and the invoice comes out as IGST rather than a CGST-SGST split because it crosses a state line. Decline, and the lead survives on prepaid terms with no risk taken. Both paths are real.",
  brdRefs: [
    "FR-W-05",
    "FR-W-06",
    "FR-W-17",
    "FR-W-18",
    "FR-A-04",
    "FR-A-05",
    "FR-A-13",
    "FR-W-15",
  ],
  estSeconds: 26,
  agents: ["ORCH", "TON", "LED", "PRC", "PAY", "GST", "DSP"],
  steps,
};
