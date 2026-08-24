/**
 * The twelve agents — the visible operating team.
 *
 * Every string in this file is read aloud in a pitch, so it is written for a
 * non-technical mill owner, not for a developer. Codenames are Hindi/Urdu
 * working words: Kagaz (paper), Tolak (weigher), Pehchan (identity),
 * Mulya (value), Lenden (transaction), Sandesh (message), Vahan (vehicle),
 * Sampark (contact), Shram (labour), Hisab (accounts).
 *
 * Layout note: positions are normalised 0–1 on the mesh canvas and are laid out
 * as three horizontal bands with the orchestrator as a hub above them —
 *   front-office  y ≈ 0.20   (what the buyer touches)
 *   order-to-cash y ≈ 0.52   (money and paperwork)
 *   back-office   y ≈ 0.85   (what Ajay runs the business on)
 * x values are chosen so handoff edges flow downward and left-to-right with as
 * few crossings as possible. This layout *is* the diagram a prospect looks at.
 */
import type { AgentDef, AgentId, AgentLane } from "../contracts/agents";

/* ── Lane accents — mirror the --j-lane-* tokens in jsmb.css ───────────── */

export const LANE_ACCENT: Record<AgentLane, string> = {
  "front-office": "#E0761F",
  "order-to-cash": "#6C80F5",
  "back-office": "#1AA695",
};

export interface LaneDef {
  key: AgentLane;
  label: string;
  blurb: string;
  accent: string;
}

export const LANES: LaneDef[] = [
  {
    key: "front-office",
    label: "Front Office",
    blurb: "Everything the buyer touches — catalogue, cart, tonnage and identity.",
    accent: LANE_ACCENT["front-office"],
  },
  {
    key: "order-to-cash",
    label: "Order to Cash",
    blurb: "Turning a confirmed basket into money in the bank and a board on a truck.",
    accent: LANE_ACCENT["order-to-cash"],
  },
  {
    key: "back-office",
    label: "Back Office",
    blurb: "What Ajay runs the mill on — leads, people and the real profit figure.",
    accent: LANE_ACCENT["back-office"],
  },
];

/* ── The roster ────────────────────────────────────────────────────────── */

export const AGENTS: AgentDef[] = [
  {
    id: "ORCH",
    codename: "Samson",
    name: "Orchestrator",
    lane: "front-office",
    blurb:
      "Takes every incoming job — a website order, an enquiry, a month-end close — and decides which agents run, in what order, and when to stop and ask Ajay.",
    tools: [
      {
        name: "run.spawn",
        label: "Start a run",
        description: "Opens a new job, gives it a run id and picks the first agent to work on it.",
      },
      {
        name: "route.dispatch",
        label: "Route work",
        description: "Hands the job to the next agent and records the handoff in the trace.",
      },
      {
        name: "policy.check",
        label: "Check policy",
        description: "Decides whether a step can run automatically or has to go to Ajay first.",
      },
      {
        name: "run.summarise",
        label: "Close the run",
        description: "Writes the one-line outcome — order number, amount, and who did what.",
      },
    ],
    guardrails: [
      "Never lets two agents write to the same order at the same time.",
      "Anything above the owner-approval threshold stops here and waits for Ajay.",
      "Every run ends with a written outcome — no job is left silently open.",
    ],
    brdRefs: ["FR-A-02"],
    handsOffTo: ["CAT", "TON", "IDN"],
    accent: LANE_ACCENT["front-office"],
    position: { x: 0.5, y: 0.05 },
    phase: "V1",
  },
  {
    id: "CAT",
    codename: "Kagaz",
    name: "Catalogue & Concierge",
    lane: "front-office",
    blurb:
      "Knows all seven board variants, their ounce sizes, pattern charges and per-kg prices, and helps a buyer land on the right one.",
    tools: [
      {
        name: "catalogue.lookup",
        label: "Look up a product",
        description: "Fetches a variant by code with its sizes, price per bundle and price per kg.",
      },
      {
        name: "catalogue.filter",
        label: "Filter the range",
        description: "Narrows the seven variants by plain/patterned and thin/thick.",
      },
      {
        name: "pattern.price_delta",
        label: "Price a pattern",
        description: "Adds the pattern charge — ₹120 sweet-box and caps, ₹90 portfolio, ₹40 file and cutting.",
      },
      {
        name: "unit.explain",
        label: "Explain the units",
        description: "Converts between bundles and lots for the buyer — 1 lot = 20 bundles = 500 kg.",
      },
    ],
    guardrails: [
      "Quotes only the seven catalogued variants — never invents a size or a pattern.",
      "Never shows a price without the pattern charge already applied.",
      "Thick sells below thin per kg by design; it never 'corrects' that price.",
    ],
    brdRefs: ["FR-W-01", "FR-W-02", "FR-W-07"],
    handsOffTo: ["TON"],
    accent: LANE_ACCENT["front-office"],
    position: { x: 0.18, y: 0.2 },
    phase: "V1",
  },
  {
    id: "TON",
    codename: "Tolak",
    name: "Order & Tonnage Validator",
    lane: "front-office",
    blurb:
      "The weighbridge. Converts every basket into kilograms, keeps the running tonnage on screen and enforces the 20-tonne self-service ceiling.",
    tools: [
      {
        name: "tonnage.convert",
        label: "Convert to kg",
        description: "Turns bundles and lots into kilograms at 25 kg a bundle, 500 kg a lot.",
      },
      {
        name: "tonnage.cap_check",
        label: "Check the 20 t cap",
        description: "Compares the basket against 20,000 kg — 800 bundles, 40 lots.",
      },
      {
        name: "cart.validate",
        label: "Validate the basket",
        description: "Checks every line has a real size, a positive quantity and a priced unit.",
      },
      {
        name: "enquiry.route",
        label: "Escalate a bulk order",
        description: "Sends an over-cap basket to the large-order enquiry form instead of checkout.",
      },
    ],
    guardrails: [
      "Never lets an order past 20 t — routes it to the enquiry desk instead.",
      "Never rounds tonnage in the buyer's favour; kilograms are exact.",
      "Blocks checkout the moment the cap is breached, not at the payment page.",
    ],
    brdRefs: ["FR-W-04", "FR-W-05", "FR-W-06"],
    handsOffTo: ["IDN", "LED"],
    accent: LANE_ACCENT["front-office"],
    position: { x: 0.42, y: 0.2 },
    phase: "V1",
  },
  {
    id: "IDN",
    codename: "Pehchan",
    name: "Identity & Trust",
    lane: "front-office",
    blurb:
      "Signs buyers in with a phone number and a one-time code, and captures the GSTIN and company details the invoice will need.",
    tools: [
      {
        name: "otp.issue",
        label: "Send an OTP",
        description: "Issues a six-minute one-time code to the buyer's mobile via the DLT sender.",
      },
      {
        name: "otp.verify",
        label: "Verify an OTP",
        description: "Checks the code, counts the attempt and opens the customer session.",
      },
      {
        name: "gstin.validate",
        label: "Validate a GSTIN",
        description: "Checks the 15-character GSTIN format and its state code before it reaches an invoice.",
      },
      {
        name: "customer.upsert",
        label: "Save the buyer",
        description: "Creates or updates the customer record with address, company and region.",
      },
    ],
    guardrails: [
      "No password is ever stored — phone plus one-time code only.",
      "Three failed codes in a row locks the number for the rest of the session.",
      "A malformed GSTIN is rejected at sign-up, never at invoicing time.",
      "A buyer can only ever see their own orders.",
    ],
    brdRefs: ["FR-W-08", "FR-W-10"],
    handsOffTo: ["PRC"],
    accent: LANE_ACCENT["front-office"],
    position: { x: 0.66, y: 0.2 },
    phase: "V1",
  },
  {
    id: "PRC",
    codename: "Mulya",
    name: "Pricing & Margin",
    lane: "order-to-cash",
    blurb:
      "Prices the basket line by line, applies the delivery policy and tells you the margin on the order before anyone commits to it.",
    tools: [
      {
        name: "pricing.quote",
        label: "Quote the basket",
        description: "Prices every line, adds delivery and GST and returns the payable total.",
      },
      {
        name: "cost.standard",
        label: "Standard cost",
        description: "Builds the ₹20.20/kg standard cost from the editable cost assumptions.",
      },
      {
        name: "margin.evaluate",
        label: "Check the margin",
        description: "Compares margin per kg against the target and flags a thin order.",
      },
      {
        name: "delivery.charge",
        label: "Apply delivery",
        description: "Free at or above the delivery threshold, flat charge below it.",
      },
    ],
    guardrails: [
      "Always prices from the live cost assumptions — never a cached ₹20.20.",
      "Flags any order under the target margin instead of quietly quoting it.",
      "Never discounts below standard cost; a loss-making quote needs Ajay.",
    ],
    brdRefs: ["FR-A-13", "FR-W-11"],
    handsOffTo: ["PAY"],
    accent: LANE_ACCENT["order-to-cash"],
    position: { x: 0.11, y: 0.52 },
    phase: "V1",
  },
  {
    id: "PAY",
    codename: "Lenden",
    name: "Payments & Credit",
    lane: "order-to-cash",
    blurb:
      "Takes the money — UPI, card or net-banking through Razorpay — or books the order against an approved buyer's credit line and tracks the dues.",
    tools: [
      {
        name: "payment.razorpay_charge",
        label: "Collect online",
        description: "Raises a Razorpay charge for UPI, card or net-banking and records the result.",
      },
      {
        name: "credit.check",
        label: "Check credit",
        description: "Reads the buyer's approval flag, limit and outstanding dues before allowing credit.",
      },
      {
        name: "payment.record_cod",
        label: "Book pay-on-delivery",
        description: "Records a COD or credit order as due rather than paid.",
      },
      {
        name: "ledger.dues",
        label: "Roll up dues",
        description: "Totals what a customer owes across every open order.",
      },
    ],
    guardrails: [
      "COD or credit only for admin-approved buyers, never above the credit limit.",
      "A failed payment leaves the order pending — it is never marked paid optimistically.",
      "Any credit release above the owner threshold stops and asks Ajay first.",
      "Card details are never seen or stored; the gateway holds them.",
    ],
    brdRefs: ["FR-W-12", "FR-W-13"],
    handsOffTo: ["GST"],
    accent: LANE_ACCENT["order-to-cash"],
    position: { x: 0.31, y: 0.52 },
    phase: "V1",
  },
  {
    id: "GST",
    codename: "Bill",
    name: "Billing & Compliance",
    lane: "order-to-cash",
    blurb:
      "Issues the GST invoice on full payment — seller and buyer GSTIN, HSN, taxable value, CGST/SGST or IGST, and the total in words and figures.",
    tools: [
      {
        name: "invoice.generate",
        label: "Raise the invoice",
        description: "Builds a numbered GST invoice from the order and the buyer's details.",
      },
      {
        name: "gst.split",
        label: "Split the tax",
        description: "CGST plus SGST inside Telangana, IGST for an inter-state sale.",
      },
      {
        name: "hsn.resolve",
        label: "Resolve the HSN",
        description: "Picks the HSN code for the board being sold from the settings.",
      },
      {
        name: "invoice.deliver",
        label: "Send the invoice",
        description: "Makes the PDF downloadable and re-sendable to the buyer.",
      },
    ],
    guardrails: [
      "Refuses to issue an invoice without a seller GSTIN.",
      "Bills a prepaid order only once the payment succeeds, and a credit order only once the credit is released — never against a pending payment.",
      "Invoice numbers are sequential and never reused, even after a cancellation.",
      "Uses the GST rate on file; it never guesses a rate for a new product.",
    ],
    brdRefs: ["FR-W-15"],
    handsOffTo: ["SMS", "FIN"],
    accent: LANE_ACCENT["order-to-cash"],
    position: { x: 0.5, y: 0.52 },
    phase: "V1",
  },
  {
    id: "SMS",
    codename: "Sandesh",
    name: "Notifications (DLT)",
    lane: "order-to-cash",
    blurb:
      "Sends the messages a buyer actually reads — the one-time code and the order confirmation — through a DLT-registered sender with approved templates.",
    tools: [
      {
        name: "sms.send_dlt",
        label: "Send an SMS",
        description: "Sends a transactional message on the registered header with its template id.",
      },
      {
        name: "template.resolve",
        label: "Fill a template",
        description: "Fills an approved DLT template with the order number, items and amount.",
      },
      {
        name: "dlt.header_check",
        label: "Check the sender",
        description: "Confirms the header and template are registered before anything is sent.",
      },
      {
        name: "sms.status",
        label: "Check delivery",
        description: "Reads back the delivery receipt for a sent message.",
      },
    ],
    guardrails: [
      "Only ever sends approved DLT templates — no free-text marketing.",
      "Never puts a full one-time code or a card number in a message body it logs.",
      "One confirmation per order; a retry re-sends, it does not duplicate.",
    ],
    brdRefs: ["FR-W-14"],
    handsOffTo: ["DSP"],
    accent: LANE_ACCENT["order-to-cash"],
    position: { x: 0.69, y: 0.52 },
    phase: "V1",
  },
  {
    id: "DSP",
    codename: "Vahan",
    name: "Dispatch & Fulfilment",
    lane: "order-to-cash",
    blurb:
      "Moves the order through Placed → Confirmed → Dispatched → Delivered, plans the load and keeps the buyer's status page honest.",
    tools: [
      {
        name: "dispatch.plan",
        label: "Plan the load",
        description: "Works out bundles per trip and the vehicle needed for the tonnage.",
      },
      {
        name: "order.advance",
        label: "Advance the order",
        description: "Moves the order to its next lifecycle state and stamps who did it.",
      },
      {
        name: "delivery.eta",
        label: "Estimate delivery",
        description: "Gives a delivery window from the destination city and the load size.",
      },
      {
        name: "pod.capture",
        label: "Record delivery",
        description: "Captures proof of delivery and closes the order.",
      },
    ],
    guardrails: [
      "Never dispatches an order that is unpaid and not credit-approved.",
      "Order states only move forward; a correction is a new event, not a rewrite.",
      "Never promises a delivery date outside the served regions.",
    ],
    brdRefs: ["FR-W-16"],
    handsOffTo: ["FIN"],
    accent: LANE_ACCENT["order-to-cash"],
    position: { x: 0.88, y: 0.52 },
    phase: "V1",
  },
  {
    id: "LED",
    codename: "Sampark",
    name: "Enquiry & Lead",
    lane: "back-office",
    blurb:
      "Catches every enquiry the website cannot process itself — bulk orders over 20 t and general deal requests — and works them from New to Converted.",
    tools: [
      {
        name: "enquiry.capture",
        label: "Capture an enquiry",
        description: "Stores name, phone, address, requirement and estimated tonnage with a timestamp.",
      },
      {
        name: "enquiry.score",
        label: "Score the lead",
        description: "Ranks the enquiry by tonnage, region and how complete the contact details are.",
      },
      {
        name: "enquiry.advance",
        label: "Move the lead",
        description: "Marks an enquiry Contacted, Converted or Closed.",
      },
      {
        name: "enquiry.convert",
        label: "Convert to an order",
        description: "Turns a worked enquiry into a real order and links the two records.",
      },
    ],
    guardrails: [
      "Never loses an enquiry — every submission lands in the funnel, duplicates included.",
      "Never quotes a price itself; pricing always goes through Mulya.",
      "Only marks an enquiry Converted when a real order id exists to point at.",
    ],
    brdRefs: ["FR-W-17", "FR-W-18"],
    handsOffTo: ["PRC"],
    accent: LANE_ACCENT["back-office"],
    position: { x: 0.08, y: 0.85 },
    phase: "V1",
  },
  {
    id: "WRK",
    codename: "Shram",
    name: "Workforce & Payroll",
    lane: "back-office",
    blurb:
      "Keeps the seven-person roster, marks attendance day by day, and turns days worked into wages and Dussehra bonuses.",
    tools: [
      {
        name: "attendance.mark",
        label: "Mark attendance",
        description: "Records a single employee present or absent for a date.",
      },
      {
        name: "attendance.close",
        label: "Close the month",
        description: "Counts working days for every active employee and locks the month.",
      },
      {
        name: "payroll.compute",
        label: "Compute payroll",
        description: "Daily wage times days worked, plus bonuses, for the selected period.",
      },
      {
        name: "bonus.record",
        label: "Record a bonus",
        description: "Books a festival bonus against an employee and a year.",
      },
    ],
    guardrails: [
      "Wages are always daily wage times days actually worked — never a flat month.",
      "A terminated employee stops accruing from the date of termination, to the day.",
      "The working-days divisor is a setting, not a hardcoded 26 — changing it re-flows every wage.",
      "Never edits a closed month; a correction is booked as an adjustment.",
    ],
    brdRefs: ["FR-A-09", "FR-A-10", "FR-A-11", "FR-A-12"],
    handsOffTo: ["FIN"],
    accent: LANE_ACCENT["back-office"],
    position: { x: 0.46, y: 0.86 },
    phase: "V1",
  },
  {
    id: "FIN",
    codename: "Hisab",
    name: "Finance & P&L",
    lane: "back-office",
    blurb:
      "Reconciles what was actually sold against what was actually spent — payroll, raw material, power, maintenance, transport — and shows the real profit for any period.",
    tools: [
      {
        name: "pnl.compute",
        label: "Compute the P&L",
        description: "Revenue less actual costs for a day, week, month or year, against the modelled figure.",
      },
      {
        name: "sales.rollup",
        label: "Roll up sales",
        description: "Bundles, lots, tonnage and revenue by product and by period.",
      },
      {
        name: "cost.actuals",
        label: "Pull actual costs",
        description: "Gathers booked payroll, purchases and bills for the period.",
      },
      {
        name: "variance.explain",
        label: "Explain the gap",
        description: "Says why the real profit differs from the ₹20.20/kg model.",
      },
    ],
    guardrails: [
      "Never mixes the modelled margin with the actual profit — both are shown, always labelled.",
      "Revenue is only counted once the order is placed, and reconciles to the order list to the rupee.",
      "Changing a cost assumption re-states the model, never the recorded actuals.",
    ],
    brdRefs: ["FR-A-14", "FR-A-15"],
    handsOffTo: [],
    accent: LANE_ACCENT["back-office"],
    position: { x: 0.8, y: 0.85 },
    phase: "V1",
  },
];

export const AGENT_BY_ID: Record<AgentId, AgentDef> = AGENTS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<AgentId, AgentDef>,
);

export const AGENT_IDS: AgentId[] = AGENTS.map((a) => a.id);

/** Agents in a lane, in canvas order — used by the mesh and the side-rail. */
export const AGENTS_BY_LANE: Record<AgentLane, AgentDef[]> = {
  "front-office": AGENTS.filter((a) => a.lane === "front-office"),
  "order-to-cash": AGENTS.filter((a) => a.lane === "order-to-cash"),
  "back-office": AGENTS.filter((a) => a.lane === "back-office"),
};

/** Every static handoff edge, as `"FROM>TO"` — the same key the runtime lights. */
export const MESH_EDGES: string[] = AGENTS.flatMap((a) =>
  a.handsOffTo.map((to) => `${a.id}>${to}`),
);

export const edgeKey = (from: AgentId, to: AgentId): string => `${from}>${to}`;

/** Zeroed per-agent tally — the starting shape for invocation counters. */
export const emptyInvocations = (): Record<AgentId, number> =>
  AGENTS.reduce(
    (acc, a) => ({ ...acc, [a.id]: 0 }),
    {} as Record<AgentId, number>,
  );

/** Every agent idle — the starting shape for the state map. */
export const idleStates = (): Record<AgentId, "idle"> =>
  AGENTS.reduce(
    (acc, a) => ({ ...acc, [a.id]: "idle" as const }),
    {} as Record<AgentId, "idle">,
  );
