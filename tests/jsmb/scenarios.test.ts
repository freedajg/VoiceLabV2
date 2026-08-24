/**
 * Scenario integrity.
 *
 * Scenarios quote hard rupee figures in their trace payloads — that is what
 * makes the demo credible, and it is also what makes them fragile. These tests
 * re-derive every quoted figure from the domain engines, so a change to a
 * price, a cost line or the GST rate breaks the build instead of quietly
 * putting a wrong number on screen in front of a prospect.
 */
import { describe, expect, it } from "vitest";
import type { AgentId, Scenario, ScenarioStep } from "../../src/jsmb/contracts/agents";
import type { PricingContext } from "../../src/jsmb/contracts/engines";
import { SCENARIOS, SCENARIO_BY_ID } from "../../src/jsmb/agents/scenarios";
import { AGENT_BY_ID } from "../../src/jsmb/agents/registry";
import { ORDER_FIXTURES } from "../../src/jsmb/agents/fixtures";
import { quoteOrder, standardCostPerKg } from "../../src/jsmb/domain/pricing";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_COST_CONFIG,
  EXPECTED_MONTHLY_PAYROLL,
  PRODUCT_BY_CODE,
} from "../../src/jsmb/domain/constants";

const ctx: PricingContext = {
  costConfig: DEFAULT_COST_CONFIG,
  settings: DEFAULT_BUSINESS_SETTINGS,
};

/** Every payload value a scenario emits, flattened for spot-checking. */
function payloads(scenario: Scenario): Record<string, unknown>[] {
  return scenario.steps.map((s) => s.payload ?? {}).filter((p) => Object.keys(p).length > 0);
}

function findPayload(scenario: Scenario, key: string): Record<string, unknown> | undefined {
  return payloads(scenario).find((p) => key in p);
}

describe("scenario structure", () => {
  it("exposes four scenarios with unique ids", () => {
    expect(SCENARIOS).toHaveLength(4);
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["retail-buy", "credit-decision", "bulk-enquiry", "month-end-close"]);
  });

  it("only references agents that exist in the registry", () => {
    for (const scenario of SCENARIOS) {
      for (const step of scenario.steps) {
        expect(AGENT_BY_ID[step.agentId], `${scenario.id}: ${step.agentId}`).toBeDefined();
        if (step.targetAgentId) {
          expect(AGENT_BY_ID[step.targetAgentId], `${scenario.id}: ${step.targetAgentId}`).toBeDefined();
        }
      }
      for (const id of scenario.agents) {
        expect(AGENT_BY_ID[id as AgentId]).toBeDefined();
      }
    }
  });

  it("gives every scenario narration, BRD references and a duration", () => {
    for (const s of SCENARIOS) {
      expect(s.narration.length).toBeGreaterThan(200);
      expect(s.brdRefs.length).toBeGreaterThan(0);
      expect(s.estSeconds).toBeGreaterThan(0);
      // Every reference must look like a real BRD requirement id.
      for (const ref of s.brdRefs) expect(ref).toMatch(/^FR-[WA]-\d{2}$/);
    }
  });

  it("closes every run with an ORCH complete step", () => {
    for (const s of SCENARIOS) {
      const terminators = s.steps.filter((st) => st.agentId === "ORCH" && st.kind === "complete");
      expect(terminators.length, s.id).toBeGreaterThanOrEqual(1);
    }
  });

  /**
   * The deny branch jumps forward to the next step marked `resumeAfterDeny`.
   * A scenario offering a deny option without such a marker would silently end
   * the run — legal, but never what we want in these four.
   */
  it("pairs every deny option with a resume marker further down the array", () => {
    for (const s of SCENARIOS) {
      s.steps.forEach((step: ScenarioStep, i: number) => {
        const denies = step.approval?.options.filter((o) => o.id.toLowerCase().startsWith("deny")) ?? [];
        if (denies.length === 0) return;
        const hasResume = s.steps
          .slice(i + 1)
          .some((later) => (later.payload as { resumeAfterDeny?: boolean } | undefined)?.resumeAfterDeny);
        expect(hasResume, `${s.id} step ${i} offers deny with no resume marker`).toBe(true);
      });
    }
  });

  it("gives approvals a title, a summary and at least two options", () => {
    const approvals = SCENARIOS.flatMap((s) => s.steps).filter((st) => st.approval);
    expect(approvals.length).toBeGreaterThanOrEqual(3);
    for (const step of approvals) {
      const a = step.approval!;
      expect(a.title.length).toBeGreaterThan(10);
      expect(a.summary.length).toBeGreaterThan(40);
      expect(a.options.length).toBeGreaterThanOrEqual(2);
      expect(a.facts.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("routes only to real app paths", () => {
    const valid = /^\/(shop|admin|agents)?(\/[\w:./-]+)*$/;
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        if (step.focusRoute) expect(step.focusRoute, `${s.id}`).toMatch(valid);
      }
    }
  });
});

describe("quoted figures match the engines", () => {
  it("retail-buy: 8 bundles of caps prices to ₹5,520 with the flat delivery charge", () => {
    const fixture = ORDER_FIXTURES["retail-walkup"];
    const quote = quoteOrder(fixture.lines, ctx);

    expect(quote.totalWeightKg).toBe(200);
    expect(quote.subtotal).toBe(5520);
    // Under the 2 t free-delivery threshold, so the flat charge applies.
    expect(quote.deliveryCharge).toBe(DEFAULT_BUSINESS_SETTINGS.deliveryChargeFlat);
    expect(quote.gstAmount).toBeCloseTo(842.4, 2);
    expect(quote.total).toBeCloseTo(7862.4, 2);
    expect(quote.standardCost).toBe(4040);
    expect(quote.margin).toBe(1480);

    const quoted = findPayload(SCENARIO_BY_ID["retail-buy"], "subtotal");
    expect(quoted?.subtotal).toBe(quote.subtotal);
    expect(quoted?.total).toBeCloseTo(quote.total, 2);
    expect(quoted?.gstAmount).toBeCloseTo(quote.gstAmount, 2);
  });

  it("credit-decision: 10 lots price to ₹1,28,400 with free delivery", () => {
    const fixture = ORDER_FIXTURES["smoke-anjali"];
    const quote = quoteOrder(fixture.lines, ctx);

    expect(quote.totalWeightKg).toBe(5000);
    expect(quote.subtotal).toBe(128400);
    expect(quote.deliveryCharge).toBe(0);
    expect(quote.standardCost).toBe(101000);
    expect(quote.margin).toBe(27400);
    expect(quote.gstAmount).toBeCloseTo(15408, 2);
    expect(quote.total).toBeCloseTo(143808, 2);

    const quoted = findPayload(SCENARIO_BY_ID["credit-decision"], "margin");
    expect(quoted?.margin).toBe(quote.margin);
  });

  it("bulk-enquiry: 18 t of plain thick earns exactly ₹0.60/kg", () => {
    const fixture = ORDER_FIXTURES["vijayawada-converted"];
    const quote = quoteOrder(fixture.lines, ctx);

    expect(quote.totalWeightKg).toBe(18000);
    expect(quote.subtotal).toBe(374400);
    expect(quote.deliveryCharge).toBe(0);
    expect(quote.standardCost).toBe(363600);
    expect(quote.margin).toBe(10800);
    expect(quote.margin / quote.totalWeightKg).toBeCloseTo(0.6, 4);
    expect(quote.gstAmount).toBeCloseTo(44928, 2);
    expect(quote.total).toBeCloseTo(419328, 2);

    const quoted = findPayload(SCENARIO_BY_ID["bulk-enquiry"], "marginPerKg");
    expect(quoted?.marginPerKg).toBeCloseTo(0.6, 4);
  });

  it("bulk-enquiry: the patterned-thin comparison is arithmetically honest", () => {
    // 18 t at the BRD §6.3 patterned-thin margin of ₹7.40/kg.
    const patternedThin = PRODUCT_BY_CODE["PT-SB"];
    const marginPerKg = patternedThin.pricePerKg - standardCostPerKg(DEFAULT_COST_CONFIG);
    expect(marginPerKg).toBeCloseTo(7.4, 4);
    expect(marginPerKg * 18000).toBeCloseTo(133200, 2);

    const quoted = findPayload(SCENARIO_BY_ID["bulk-enquiry"], "sameTonnageMargin");
    expect(quoted?.sameTonnageMargin).toBeCloseTo(133200, 2);
  });
});

describe("month-end findings", () => {
  it("break-even is payroll ÷ the labour cost line — 32.25 t", () => {
    const breakEvenKg = EXPECTED_MONTHLY_PAYROLL / DEFAULT_COST_CONFIG.labour;
    expect(EXPECTED_MONTHLY_PAYROLL).toBe(129000);
    expect(breakEvenKg).toBe(32250);

    const quoted = findPayload(SCENARIO_BY_ID["month-end-close"], "breakEvenKg");
    expect(quoted?.breakEvenKg).toBe(breakEvenKg);
    expect(quoted?.breakEvenTonnes).toBe(32.25);
  });

  /**
   * The scenario's sharpest claim: a ₹0.60 rise in raw material takes standard
   * cost to ₹20.80/kg, which is exactly Plain Thick's selling price per kg, so
   * that product's margin becomes zero. If either number ever moves, this
   * fails rather than misleading a prospect.
   */
  it("raw ₹13.20 → ₹13.80 takes Plain Thick to exactly zero margin", () => {
    const raised = { ...DEFAULT_COST_CONFIG, rawMaterial: 13.8 };
    const newStandardCost = standardCostPerKg(raised);
    expect(standardCostPerKg(DEFAULT_COST_CONFIG)).toBe(20.2);
    expect(newStandardCost).toBe(20.8);

    const plainThick = PRODUCT_BY_CODE["P-PK"];
    expect(plainThick.pricePerKg).toBe(20.8);
    expect(plainThick.pricePerKg - newStandardCost).toBe(0);

    // And the other lines shift by the same ₹0.60, not by something else.
    expect(PRODUCT_BY_CODE["P-PT"].pricePerKg - newStandardCost).toBeCloseTo(2.0, 4);
    expect(PRODUCT_BY_CODE["PT-SB"].pricePerKg - newStandardCost).toBeCloseTo(6.8, 4);
  });

  it("states the re-costed margins the approval card promises", () => {
    const card = SCENARIO_BY_ID["month-end-close"].steps.find((s) => s.approval)?.approval;
    expect(card).toBeDefined();
    const facts = Object.fromEntries(card!.facts.map((f) => [f.label, f.value]));
    expect(facts["Standard cost"]).toBe("₹20.20 → ₹20.80 / kg");
    expect(facts["Plain Thick margin"]).toBe("₹0.60 → ₹0.00 / kg");
    expect(facts["Plain Thin margin"]).toBe("₹2.60 → ₹2.00 / kg");
  });
});
