/**
 * Agent-runtime contracts — the visible "multi-agent system" layer.
 *
 * OWNED BY THE ARCHITECT. src/jsmb/agents/* implements these; every feature
 * surface reads them. The runtime is deterministic: identical seed, identical
 * trace, every single run.
 */

/* ── Identity ──────────────────────────────────────────────────────────── */

/** The twelve agents. Each maps to explicit BRD functional requirements. */
export type AgentId =
  | "ORCH" // Samson — Orchestrator
  | "CAT" // Catalogue & Concierge
  | "TON" // Order & Tonnage Validator
  | "IDN" // Identity & Trust
  | "PRC" // Pricing & Margin
  | "PAY" // Payments & Credit
  | "GST" // Billing & Compliance
  | "SMS" // Notifications (DLT)
  | "DSP" // Dispatch & Fulfilment
  | "LED" // Enquiry & Lead
  | "WRK" // Workforce & Payroll
  | "FIN"; // Finance & P&L

export type AgentLane = "front-office" | "order-to-cash" | "back-office";

/** Lifecycle rendered on every agent node and card. */
export type AgentState =
  | "idle"
  | "listening"
  | "thinking"
  | "tool"
  | "handoff"
  | "waiting-human"
  | "done"
  | "error";

export interface AgentTool {
  name: string;
  label: string;
  description: string;
}

export interface AgentDef {
  id: AgentId;
  /** Short display codename, e.g. "Samson". */
  codename: string;
  /** Full role title, e.g. "Order & Tonnage Validator". */
  name: string;
  lane: AgentLane;
  /** One-sentence description of the job this agent owns. */
  blurb: string;
  /** Tool names this agent may call — shown in the inspector. */
  tools: AgentTool[];
  /** Hard rules the agent will not break, e.g. "never allow >20 t". */
  guardrails: string[];
  /** BRD requirement ids this agent satisfies, e.g. ["FR-W-04", "FR-W-05"]. */
  brdRefs: string[];
  /** Agents this one commonly hands off to — draws the static mesh edges. */
  handsOffTo: AgentId[];
  /** Tailwind-free hex accent for the node, edge and badge. */
  accent: string;
  /** Normalised 0–1 position on the mesh canvas. */
  position: { x: number; y: number };
  /** Which V-phase introduces this agent; V3 nodes render as "planned". */
  phase: "V1" | "V2" | "V3";
}

/* ── Trace ─────────────────────────────────────────────────────────────── */

export type TraceKind =
  | "spawn"
  | "think"
  | "tool-call"
  | "tool-result"
  | "handoff"
  | "emit"
  | "approval-request"
  | "approval-resolved"
  | "guardrail"
  | "error"
  | "complete";

export type TraceLevel = "info" | "success" | "warn" | "error";

export interface TraceEvent {
  id: string;
  /** Monotonic ordering within a run. */
  seq: number;
  /** Simulated wall-clock offset from run start, in ms. */
  atMs: number;
  runId: string;
  agentId: AgentId;
  kind: TraceKind;
  level: TraceLevel;
  /** Human-readable one-liner shown in the console. */
  message: string;
  /** Tool invoked, when kind is tool-call / tool-result. */
  toolName?: string;
  /** Receiving agent, when kind is handoff. */
  targetAgentId?: AgentId;
  /** Structured body shown in the expandable inspector. */
  payload?: Record<string, unknown>;
  /** Simulated duration, used for the latency read-out. */
  durationMs?: number;
}

/* ── Human in the loop ─────────────────────────────────────────────────── */

export interface ApprovalOption {
  id: string;
  label: string;
  tone: "primary" | "danger" | "neutral";
}

export interface ApprovalRequest {
  id: string;
  runId: string;
  agentId: AgentId;
  title: string;
  summary: string;
  /** Label/value rows rendered in the approval card. */
  facts: { label: string; value: string; emphasis?: boolean }[];
  options: ApprovalOption[];
  createdAt: number;
  resolvedOptionId?: string;
  resolvedAt?: number;
}

/* ── Scenarios ─────────────────────────────────────────────────────────── */

/**
 * A scenario step is one beat of the story. The runtime plays steps in order,
 * waiting `delayMs` (scaled by playback speed) between them and applying each
 * step's optional side effect to the business data.
 */
export interface ScenarioStep {
  agentId: AgentId;
  kind: TraceKind;
  message: string;
  level?: TraceLevel;
  toolName?: string;
  targetAgentId?: AgentId;
  payload?: Record<string, unknown>;
  /** Simulated think/tool time attributed to this step. */
  durationMs?: number;
  /** Gap before the NEXT step fires, in unscaled ms. Defaults to durationMs. */
  delayMs?: number;
  /** Agent state to display while this step runs. Defaults from `kind`. */
  state?: AgentState;
  /** Blocks the run until the named approval is resolved. */
  approval?: Omit<ApprovalRequest, "id" | "runId" | "createdAt" | "resolvedOptionId" | "resolvedAt">;
  /** Applied to the business data when the step fires. Keyed effect, resolved
   *  by the runtime against a registry so scenarios stay serialisable. */
  effect?: ScenarioEffect;
  /** Route the UI should be showing for this beat, e.g. "/shop/cart". */
  focusRoute?: string;
}

/** Declarative side effects a step can apply. The runtime owns dispatching. */
export type ScenarioEffect =
  | { type: "none" }
  | { type: "place-order"; orderRef: string }
  | { type: "record-payment"; orderRef: string; mode: "razorpay" | "cod" | "credit" }
  | { type: "issue-invoice"; orderRef: string }
  | { type: "advance-order"; orderRef: string; status: "confirmed" | "dispatched" | "delivered" }
  | { type: "add-enquiry"; enquiryRef: string }
  | { type: "convert-enquiry"; enquiryRef: string; orderRef: string }
  | { type: "approve-credit"; customerId: string; limit: number }
  | { type: "close-attendance"; month: string }
  | { type: "update-cost"; patch: Record<string, number> };

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  /** What the presenter should say while this plays. */
  narration: string;
  brdRefs: string[];
  estSeconds: number;
  /** Agents lit up by this scenario, for the launcher card. */
  agents: AgentId[];
  steps: ScenarioStep[];
}

/* ── Runtime ───────────────────────────────────────────────────────────── */

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export type RunStatus = "idle" | "running" | "paused" | "waiting-human" | "complete" | "aborted";

export interface AgentRuntimeMetrics {
  /** Per-agent tally across the session, powering the mesh badges. */
  invocations: Record<AgentId, number>;
  toolCalls: number;
  handoffs: number;
  approvals: number;
  /** Sum of simulated durations, in ms. */
  totalLatencyMs: number;
}
