/**
 * Barrel for the agent layer. Feature surfaces should import from here rather
 * than reaching into individual modules.
 */
export {
  AGENTS,
  AGENT_BY_ID,
  AGENT_IDS,
  AGENTS_BY_LANE,
  LANES,
  LANE_ACCENT,
  MESH_EDGES,
  edgeKey,
  emptyInvocations,
  idleStates,
} from "./registry";
export type { LaneDef } from "./registry";

export {
  APPROVAL_RESUME_MS,
  DEFAULT_STEP_MS,
  EDGE_HOLD_MS,
  RESUME_AFTER_DENY,
  createAgentRuntime,
  isDenial,
  levelForKind,
  stateForKind,
  stepGapMs,
  stepSpanMs,
} from "./runtime";
export type {
  AgentRuntime,
  EffectApplier,
  RuntimeEvent,
  RuntimeOptions,
  StartOptions,
  TimerApi,
  TimerHandle,
} from "./runtime";

export { applyScenarioEffect, describeEffect } from "./effects";
export type { DataAccess, EffectResult } from "./effects";

export {
  ENQUIRY_FIXTURES,
  FIXTURE_CUSTOMERS,
  FIXTURE_CUSTOMER_IDS,
  ORDER_FIXTURES,
  buildFixtureEnquiry,
  buildFixtureOrder,
  fixtureCustomer,
  fixtureEnquiryId,
  fixtureOrderId,
  getEnquiryFixture,
  getOrderFixture,
} from "./fixtures";
export type { EnquiryFixture, OrderFixture } from "./fixtures";

export {
  SCENARIOS,
  SCENARIO_BY_ID,
  RETAIL_BUY,
  CREDIT_DECISION,
  BULK_ENQUIRY,
  MONTH_END_CLOSE,
} from "./scenarios";
