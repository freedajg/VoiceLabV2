/**
 * Shared vocabulary for the two agent surfaces — the command centre and agent
 * ops. Pure functions only: no store reads, no clocks, no randomness. Every
 * elapsed figure on screen comes from the simulated `atMs` on a trace event,
 * never from the wall clock.
 */
import type {
  AgentId,
  TraceEvent,
  TraceKind,
  TraceLevel,
} from "../../contracts/agents";
import type { Tone } from "../../ui";

/* ── Time ──────────────────────────────────────────────────────────────── */

/** Simulated run clock, fixed width: 12480 → "00:12.4". */
export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safe % 1000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/** Trace gutter offset, fixed width to the centisecond: 12480 → "00:12.48". */
export function formatOffset(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((safe % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(
    centis,
  ).padStart(2, "0")}`;
}

/** Simulated durations, in the units a viewer reads at a glance. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

/* ── Trace vocabulary ──────────────────────────────────────────────────── */

/** Short console token for each kind. Fixed vocabulary, mono, upper case. */
export const KIND_TOKEN: Record<TraceKind, string> = {
  spawn: "SPAWN",
  think: "THINK",
  "tool-call": "CALL",
  "tool-result": "RESULT",
  handoff: "HANDOFF",
  emit: "EMIT",
  "approval-request": "ASK",
  "approval-resolved": "ANSWER",
  guardrail: "GUARD",
  error: "ERROR",
  complete: "DONE",
};

export const KIND_LABEL: Record<TraceKind, string> = {
  spawn: "Run opened",
  think: "Reasoning",
  "tool-call": "Tool call",
  "tool-result": "Tool result",
  handoff: "Handoff",
  emit: "Emit",
  "approval-request": "Approval requested",
  "approval-resolved": "Approval answered",
  guardrail: "Guardrail",
  error: "Error",
  complete: "Run closed",
};

export const KIND_ORDER: TraceKind[] = [
  "spawn",
  "think",
  "tool-call",
  "tool-result",
  "handoff",
  "emit",
  "approval-request",
  "approval-resolved",
  "guardrail",
  "error",
  "complete",
];

export const LEVEL_LABEL: Record<TraceLevel, string> = {
  info: "Info",
  success: "Success",
  warn: "Warning",
  error: "Error",
};

/** Trace levels map onto the shared tone scale the whole kit already speaks. */
export function levelTone(level: TraceLevel): Tone {
  switch (level) {
    case "success":
      return "success";
    case "warn":
      return "warn";
    case "error":
      return "danger";
    case "info":
      return "neutral";
  }
}

/** Console text fill for an SVG element, mirroring CONSOLE_TONES.text. */
export const TONE_FILL: Record<Tone, string> = {
  neutral: "fill-j-console-ink-2",
  primary: "fill-j-primary-bright",
  accent: "fill-j-accent-soft",
  success: "fill-j-success-soft",
  warn: "fill-j-warn-soft",
  danger: "fill-j-danger-soft",
  info: "fill-j-info-soft",
};

/* ── Session metrics ───────────────────────────────────────────────────── */

export interface SessionMetrics {
  entries: number;
  toolCalls: number;
  handoffs: number;
  approvals: number;
  guardrails: number;
  errors: number;
  /** Sum of the simulated durations declared by each beat. */
  latencyMs: number;
  agentsEngaged: number;
  /** Simulated timestamp of the newest entry. */
  lastAtMs: number;
}

export function sessionMetrics(trace: TraceEvent[]): SessionMetrics {
  const engaged = new Set<AgentId>();
  let toolCalls = 0;
  let handoffs = 0;
  let approvals = 0;
  let guardrails = 0;
  let errors = 0;
  let latencyMs = 0;

  for (const e of trace) {
    engaged.add(e.agentId);
    latencyMs += e.durationMs ?? 0;
    if (e.kind === "tool-call") toolCalls += 1;
    else if (e.kind === "handoff") handoffs += 1;
    else if (e.kind === "approval-request") approvals += 1;
    else if (e.kind === "guardrail") guardrails += 1;
    if (e.level === "error") errors += 1;
  }

  return {
    entries: trace.length,
    toolCalls,
    handoffs,
    approvals,
    guardrails,
    errors,
    latencyMs,
    agentsEngaged: engaged.size,
    lastAtMs: trace.length > 0 ? trace[trace.length - 1].atMs : 0,
  };
}

/* ── Tool-call pairing ─────────────────────────────────────────────────── */

export interface ToolInvocation {
  /** 1-based order in the session — the thing a prospect counts. */
  ordinal: number;
  callId: string;
  agentId: AgentId;
  toolName: string;
  atMs: number;
  durationMs?: number;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  resultMessage?: string;
  message: string;
  level: TraceLevel;
  /** True when a matching tool-result came back. */
  settled: boolean;
}

/**
 * Pairs every `tool-call` with the next `tool-result` from the same agent for
 * the same tool. The runtime does not always emit a result — a call that
 * settles silently still shows, marked unsettled, rather than disappearing.
 */
export function pairToolCalls(trace: TraceEvent[]): ToolInvocation[] {
  const out: ToolInvocation[] = [];
  const claimed = new Set<string>();

  for (let i = 0; i < trace.length; i += 1) {
    const call = trace[i];
    if (call.kind !== "tool-call") continue;

    let result: TraceEvent | undefined;
    for (let j = i + 1; j < trace.length; j += 1) {
      const candidate = trace[j];
      if (candidate.kind === "tool-call" && candidate.agentId === call.agentId) break;
      if (
        candidate.kind === "tool-result" &&
        candidate.agentId === call.agentId &&
        (candidate.toolName === undefined || candidate.toolName === call.toolName) &&
        !claimed.has(candidate.id)
      ) {
        result = candidate;
        claimed.add(candidate.id);
        break;
      }
    }

    out.push({
      ordinal: out.length + 1,
      callId: call.id,
      agentId: call.agentId,
      toolName: call.toolName ?? "—",
      atMs: call.atMs,
      durationMs: call.durationMs,
      args: call.payload,
      result: result?.payload,
      resultMessage: result?.message,
      message: call.message,
      level: result?.level ?? call.level,
      settled: result !== undefined,
    });
  }

  return out;
}

/* ── Text ──────────────────────────────────────────────────────────────── */

/**
 * Greedy word wrap for SVG labels, which have no line box of their own.
 * Deterministic and measurement-free — it counts characters, not pixels, which
 * is close enough for a fixed-size caption under a node.
 */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current.length > 0) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current.length > 0) lines.push(current);

  if (lines.length === maxLines) {
    const consumed = lines.join(" ").length;
    if (consumed < text.trim().length) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] =
        last.length > maxChars - 1 ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
    }
  }
  return lines;
}

/** Payload rendered for the inspector. Stable key order, two-space indent. */
export function formatPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

/* ── BRD index ─────────────────────────────────────────────────────────── */

/**
 * Short titles for every functional requirement in BRD v1.0 §7 and §8. This is
 * what turns an agent's `brdRefs` from a list of codes into the proof that
 * every agent traces back to something the client asked for.
 */
export const BRD_TITLE: Record<string, string> = {
  "FR-W-01": "Product catalogue — all seven variants with price per bundle and per kg",
  "FR-W-02": "Vibrant, friendly buying experience",
  "FR-W-03": "Mobile-first — usable at 360 px with no horizontal scroll",
  "FR-W-04": "Order in bundles or lots, converted to kg and tonnes automatically",
  "FR-W-05": "Live tonnage with a hard 20-tonne cap",
  "FR-W-06": "Large-order redirect to the enquiry form",
  "FR-W-07": "Pattern selection with the pattern charge applied",
  "FR-W-08": "Phone + OTP sign-in, no password",
  "FR-W-09": "Customer account with current and past orders",
  "FR-W-10": "Capture GSTIN and company details for invoicing",
  "FR-W-11": "Checkout — review cart, address, tax and total before confirming",
  "FR-W-12": "Online payment via Razorpay (UPI, card, net-banking)",
  "FR-W-13": "Pay-on-delivery and credit for approved trade buyers only",
  "FR-W-14": "Order-confirmation SMS over a DLT-registered sender",
  "FR-W-15": "GST-compliant invoice on full payment",
  "FR-W-16": "Order states — Placed → Confirmed → Dispatched → Delivered",
  "FR-W-17": "Large-order enquiry form, stored and shown to admin",
  "FR-W-18": "Contact / deal enquiry feeding the same funnel",
  "FR-A-01": "Single admin login for the owner",
  "FR-A-02": "Dashboard home — today's orders, revenue, dues, enquiries, alerts",
  "FR-A-03": "Customer database with GSTIN, orders and paid/due amounts",
  "FR-A-04": "Flag a customer as trade / credit-approved with a limit",
  "FR-A-05": "Single-customer order and payment ledger",
  "FR-A-06": "Bundles and lots sold per product, by period",
  "FR-A-07": "Revenue by product and period, reconciling to orders",
  "FR-A-08": "Export the sales report",
  "FR-A-09": "Employee master with joining, termination and daily wage",
  "FR-A-10": "Daily attendance entry counting working days",
  "FR-A-11": "Salary = daily wage × days actually worked",
  "FR-A-12": "Dussehra bonus entry per employee and year",
  "FR-A-13": "Cost price, selling price and profit per product and per order",
  "FR-A-14": "Period P&L — actual revenue less actual costs",
  "FR-A-15": "Editable cost assumptions that re-flow every downstream figure",
};

export function brdTitle(ref: string): string {
  return BRD_TITLE[ref] ?? "Requirement from BRD v1.0";
}
