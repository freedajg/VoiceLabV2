/**
 * Scenario 4 — the books. Attendance closes, payroll lands, and the P&L says
 * something the standard-cost model cannot.
 *
 * Two findings drive this run, and both fall out of JSMB's own figures:
 *
 *   1. Break-even. The cost model carries labour at ₹4.00/kg. Real payroll is
 *      ₹1,29,000 a month. ₹1,29,000 ÷ ₹4.00 = 32,250 kg — so below roughly
 *      32.25 t in a month, the labour line under-recovers and actual profit
 *      falls short of the modelled figure. Ajay has never had this number.
 *
 *   2. Fragility. Raw material is ₹13.20/kg of a ₹20.20 standard cost. Move it
 *      to ₹13.80 and standard cost becomes ₹20.80 — which is exactly what
 *      Plain Thick sells for per kg (₹520 ÷ 25). That product's margin goes to
 *      zero. Not "thin". Zero. A sixty-paise move in waste paper erases a
 *      whole line.
 *
 * See ./index.ts for the scenario authoring rules.
 */
import type { Scenario, ScenarioStep } from "../../contracts/agents";

const MONTHLY_PAYROLL = 129000;
const LABOUR_PER_KG = 4.0;
const BREAK_EVEN_KG = MONTHLY_PAYROLL / LABOUR_PER_KG; // 32,250 kg
const RAW_BEFORE = 13.2;
const RAW_AFTER = 13.8;
const STD_BEFORE = 20.2;
const STD_AFTER = 20.8;

const steps: ScenarioStep[] = [
  {
    agentId: "ORCH",
    kind: "spawn",
    message: "Month end. Closing June and running the books — attendance first, then the P&L.",
    payload: { period: "June 2026", trigger: "month-end close" },
    durationMs: 400,
    delayMs: 520,
    focusRoute: "/admin/employees",
  },
  {
    agentId: "ORCH",
    kind: "handoff",
    targetAgentId: "WRK",
    message: "Shram, close the attendance register.",
    durationMs: 160,
    delayMs: 280,
  },
  {
    agentId: "WRK",
    kind: "tool-call",
    toolName: "attendance.close",
    message: "June register closed across the active roster. Manual entry today, biometric in V2.",
    payload: {
      month: "2026-06",
      headcount: 8,
      source: "manual",
      brdRefs: ["FR-A-10"],
      v2Note: "Biometric device integration replaces this entry step without changing the maths.",
    },
    durationMs: 760,
    delayMs: 900,
    effect: { type: "close-attendance", month: "2026-06" },
  },
  {
    agentId: "WRK",
    kind: "tool-call",
    toolName: "payroll.compute",
    message:
      "Pay is daily wage × days worked. One operator, two machine specialists, five helpers — ₹1,29,000 for the month.",
    payload: {
      basis: "daily wage × days worked",
      divisor: 26,
      divisorNote: "BRD D5 — divisor still to be confirmed by Ajay; editable in Settings.",
      roster: [
        { role: "Operator", count: 1, monthly: 23000 },
        { role: "Machine Specialist", count: 2, monthly: 18000 },
        { role: "Helper", count: 5, monthly: 14000 },
      ],
      total: MONTHLY_PAYROLL,
    },
    durationMs: 820,
    delayMs: 980,
  },
  {
    agentId: "WRK",
    kind: "emit",
    message: "Dussehra bonuses are recorded separately and land in the same period.",
    payload: { festival: "Dussehra", brdRef: "FR-A-12" },
    durationMs: 360,
    delayMs: 480,
  },
  {
    agentId: "WRK",
    kind: "handoff",
    targetAgentId: "FIN",
    message: "Hisab, payroll is ₹1,29,000. Take it straight — do not book it twice off the bill ledger.",
    durationMs: 200,
    delayMs: 320,
    focusRoute: "/admin/pnl",
  },
  {
    agentId: "FIN",
    kind: "tool-call",
    toolName: "pnl.compute",
    message:
      "June closed: revenue ex-GST against real costs — raw material, electricity, maintenance, transport, and payroll from Module 3.",
    payload: {
      period: "June 2026",
      revenueBasis: "ex-GST — GST is collected, not earned",
      costLines: ["raw-material", "electricity", "maintenance", "transport", "payroll"],
      payrollSource: "Employees module (FR-A-11), never the bill ledger",
      brdRef: "FR-A-14",
    },
    durationMs: 900,
    delayMs: 1050,
  },
  {
    agentId: "FIN",
    kind: "emit",
    level: "warn",
    message:
      "Here is the number nobody has had before: the ₹4-a-kilo labour line only covers ₹1,29,000 of payroll at 32.25 tonnes a month.",
    payload: {
      monthlyPayroll: MONTHLY_PAYROLL,
      labourPerKg: LABOUR_PER_KG,
      breakEvenKg: BREAK_EVEN_KG,
      breakEvenTonnes: BREAK_EVEN_KG / 1000,
      meaning:
        "Ship less than 32.25 t in a month and the standard model flatters the real profit. Ship more and it understates it.",
    },
    durationMs: 780,
    delayMs: 1000,
  },
  {
    agentId: "FIN",
    kind: "emit",
    message:
      "That is the whole reason the module shows two views. The modelled margin prices an order. The actual P&L tells you whether the month worked.",
    payload: { view1: "per-order margin at standard cost", view2: "period P&L at actual cost", brdRef: "FR-A-14" },
    durationMs: 560,
    delayMs: 740,
  },
  {
    agentId: "FIN",
    kind: "handoff",
    targetAgentId: "ORCH",
    message: "Ajay, one thing needs your call before I lock the assumptions.",
    durationMs: 180,
    delayMs: 300,
    focusRoute: "/admin/settings",
  },
  {
    agentId: "FIN",
    kind: "approval-request",
    level: "warn",
    message: "Waste paper has moved. Do I re-cost the book at the new rate?",
    durationMs: 400,
    delayMs: 400,
    approval: {
      agentId: "FIN",
      title: "Raw material has moved to ₹13.80/kg. Re-cost?",
      summary:
        "Suppliers have lifted paper-plate waste. Raw material goes ₹13.20 → ₹13.80, which takes standard cost from ₹20.20 to ₹20.80 a kilo. Plain Thick sells at ₹20.80 a kilo. Applying this takes that product's margin to exactly zero.",
      facts: [
        { label: "Raw material", value: "₹13.20 → ₹13.80 / kg" },
        { label: "Standard cost", value: "₹20.20 → ₹20.80 / kg", emphasis: true },
        { label: "Plain Thick margin", value: "₹0.60 → ₹0.00 / kg", emphasis: true },
        { label: "Plain Thin margin", value: "₹2.60 → ₹2.00 / kg" },
        { label: "Patterned Thin margin", value: "₹7.40 → ₹6.80 / kg" },
        { label: "Affected", value: "Every quote, invoice and P&L line, immediately" },
      ],
      options: [
        { id: "apply-cost", label: "Apply new cost", tone: "primary" },
        { id: "deny-cost", label: "Hold at ₹13.20", tone: "neutral" },
      ],
    },
  },
  {
    agentId: "FIN",
    kind: "tool-call",
    toolName: "costconfig.update",
    level: "warn",
    message: "Applied. Standard cost is ₹20.80 a kilo and every margin in the book has just re-flowed.",
    payload: {
      rawMaterialBefore: RAW_BEFORE,
      rawMaterialAfter: RAW_AFTER,
      standardCostBefore: STD_BEFORE,
      standardCostAfter: STD_AFTER,
      brdRef: "FR-A-15",
    },
    durationMs: 820,
    delayMs: 1000,
    effect: { type: "update-cost", patch: { rawMaterial: RAW_AFTER } },
  },
  {
    agentId: "PRC",
    kind: "emit",
    level: "error",
    message:
      "Plain Thick now earns nothing. It sells at ₹20.80 a kilo and costs ₹20.80 a kilo. Sixty paise of waste paper erased a whole line.",
    payload: {
      product: "P-PK — Plain Thick",
      sellPerKg: 20.8,
      costPerKg: STD_AFTER,
      marginPerKg: 0,
      marginPerBundle: 0,
      wasPerBundle: 15,
    },
    durationMs: 700,
    delayMs: 900,
    focusRoute: "/admin/pnl",
  },
  {
    agentId: "PRC",
    kind: "emit",
    message:
      "Patterned thin still earns ₹6.80 a kilo. If costs stay here, the mix has to move toward pattern work.",
    payload: {
      plainThin: 2.0,
      plainThick: 0,
      patternedThinSweetBox: 6.8,
      patternedThickPortfolio: 3.6,
      recommendation: "Shift mix toward patterned lines, or reprice plain thick.",
    },
    durationMs: 620,
    delayMs: 820,
  },
  {
    agentId: "ORCH",
    kind: "complete",
    level: "success",
    message:
      "June closed, payroll booked, break-even known, and one supplier price change traced all the way to a product that no longer pays for itself.",
    payload: {
      period: "June 2026",
      payroll: MONTHLY_PAYROLL,
      breakEvenTonnes: BREAK_EVEN_KG / 1000,
      costChangeApplied: true,
      productsAtZeroMargin: ["P-PK"],
    },
    durationMs: 460,
    delayMs: 460,
    focusRoute: "/admin/pnl",
  },

  /* ── Refusal path ───────────────────────────────────────────────────────
     Ajay holds the old rate. The finding does not disappear — it is logged
     against the period so the variance has an explanation later.           */
  {
    agentId: "FIN",
    kind: "emit",
    level: "warn",
    message:
      "Held at ₹13.20. Quotes keep the old margin, but the real purchase price is higher — so expect the variance to widen.",
    payload: {
      resumeAfterDeny: true,
      rawMaterialHeldAt: RAW_BEFORE,
      actualMarketRate: RAW_AFTER,
      consequence: "Standard profit will overstate actual profit until this is reconciled.",
    },
    durationMs: 620,
    delayMs: 800,
  },
  {
    agentId: "ORCH",
    kind: "complete",
    level: "warn",
    message:
      "June closed on the old assumptions. The gap is now recorded — that is exactly what the standard-versus-actual variance is for.",
    payload: { period: "June 2026", costChangeApplied: false, varianceWillWiden: true },
    durationMs: 440,
    delayMs: 440,
    focusRoute: "/admin/pnl",
  },
];

export const MONTH_END_CLOSE: Scenario = {
  id: "month-end-close",
  title: "Month end, and a sixty-paise problem",
  subtitle: "Attendance → ₹1,29,000 payroll → period P&L → break-even → a cost change that re-flows everything",
  narration:
    "This is the back office, and it is where the money actually is. Shram closes June's attendance and computes payroll the way the client asked — daily wage times days worked — and lands on one lakh twenty-nine thousand across the eight-person roster. Hisab takes that figure straight from the Employees module, never off the bill ledger, because booking payroll twice would halve the profit. Then it produces the number Ajay has never had: the cost model carries labour at four rupees a kilo, real payroll is one twenty-nine, so the labour line only breaks even at thirty-two and a quarter tonnes a month. Below that, the model is flattering him. Now the part to watch closely. Waste paper has gone up sixty paise. Hisab will not change the costing on its own — it asks. Approve it and standard cost goes from twenty rupees twenty to twenty rupees eighty a kilo, and Plain Thick, which sells at exactly twenty rupees eighty a kilo, drops to zero margin. Not thin. Zero. Every quote, invoice and P&L line on the screen re-flows while you watch. That is one editable assumption, honestly modelled, showing the owner something about his own business he could not see before.",
  brdRefs: ["FR-A-09", "FR-A-10", "FR-A-11", "FR-A-12", "FR-A-13", "FR-A-14", "FR-A-15"],
  estSeconds: 28,
  agents: ["ORCH", "WRK", "FIN", "PRC"],
  steps,
};
