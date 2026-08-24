/**
 * Scenarios — the stories the runtime plays, in the order a pitch runs them.
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
 *
 * Every rupee figure quoted in a scenario is checkable against
 * `domain/constants.ts`. If a price or cost changes there, the scenarios must
 * be re-derived — `tests/jsmb/scenarios.test.ts` fails loudly if they drift.
 */
import type { Scenario } from "../../contracts/agents";
import { FIXTURE_CUSTOMER_IDS } from "../fixtures";
import { RETAIL_BUY } from "./retailBuy";
import { CREDIT_DECISION } from "./creditDecision";
import { BULK_ENQUIRY } from "./bulkEnquiry";
import { MONTH_END_CLOSE } from "./monthEndClose";

/**
 * Demo order. Each one raises the stakes on the last: no human at all, then a
 * decision the owner has to make, then an order the site must refuse, then the
 * books that explain why any of it matters.
 */
export const SCENARIOS: Scenario[] = [
  RETAIL_BUY,
  CREDIT_DECISION,
  BULK_ENQUIRY,
  MONTH_END_CLOSE,
];

export const SCENARIO_BY_ID: Record<string, Scenario> = SCENARIOS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<string, Scenario>,
);

export { RETAIL_BUY, CREDIT_DECISION, BULK_ENQUIRY, MONTH_END_CLOSE };

/** Customer ids a scenario may act on — re-exported so callers need not dig. */
export { FIXTURE_CUSTOMER_IDS };
