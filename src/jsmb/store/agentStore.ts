/**
 * agentStore — the visible agent layer, wired to React.
 *
 * It owns nothing clever: the scheduling lives in `agents/runtime.ts` and the
 * data mutations live in `agents/effects.ts`. This file is the translation
 * layer between the runtime's typed events and the state every surface reads,
 * plus the two entry points that keep the agent layer alive when the presenter
 * goes off-script — `emit()` and `pulse()`.
 *
 * Determinism: no `Date.now()`, no `Math.random()`. Trace timestamps come from
 * the run's simulated clock, or from a monotonic live clock when there is no
 * run in flight. Every timer this module creates is tracked and clearable.
 */
import { create } from "zustand";
import type {
  AgentId,
  AgentState,
  PlaybackSpeed,
  TraceEvent,
  TraceKind,
} from "../contracts/agents";
import type { AgentStore } from "../contracts/stores";
import { applyScenarioEffect } from "../agents/effects";
import { AGENTS, emptyInvocations, idleStates } from "../agents/registry";
import { createAgentRuntime, levelForKind, type RuntimeEvent } from "../agents/runtime";
import { SCENARIOS } from "../agents/scenarios";

/** A long demo must not grow without bound — keep the most recent entries. */
export const TRACE_CAP = 500;

/** Default hold for an ad-hoc `pulse`, in real ms. */
export const DEFAULT_PULSE_MS = 1400;

/** Simulated time a live `emit` occupies when it declares no duration. */
const LIVE_TICK_MS = 250;

/* ── Module-level bookkeeping (deliberately outside the store) ─────────── */

let seqCounter = 0;
const nextSeq = (): number => {
  seqCounter += 1;
  return seqCounter;
};

/** Monotonic simulated clock for events fired outside a scenario run. */
let liveClockMs = 0;

const pulseTimers = new Map<AgentId, ReturnType<typeof setTimeout>>();

const clearPulseTimers = (): void => {
  pulseTimers.forEach((handle) => clearTimeout(handle));
  pulseTimers.clear();
};

const capTrace = (trace: TraceEvent[]): TraceEvent[] =>
  trace.length > TRACE_CAP ? trace.slice(trace.length - TRACE_CAP) : trace;

/** Handoffs and tool results belong to the invocation that produced them. */
const countsAsInvocation = (kind: TraceKind): boolean =>
  kind !== "handoff" && kind !== "tool-result" && kind !== "approval-resolved";

const KIND_BY_STATE: Record<AgentState, TraceKind> = {
  idle: "emit",
  listening: "emit",
  thinking: "think",
  tool: "tool-call",
  handoff: "handoff",
  "waiting-human": "approval-request",
  done: "complete",
  error: "error",
};

const RUN_ACTIVE = new Set(["running", "paused", "waiting-human"]);

/* ── Runtime → store ───────────────────────────────────────────────────── */

function handleRuntimeEvent(event: RuntimeEvent): void {
  switch (event.type) {
    case "run-start":
      useAgentStore.setState({
        runId: event.runId,
        activeScenarioId: event.scenarioId,
        stepIndex: 0,
        clockMs: 0,
        activeEdges: [],
        focusRoute: null,
      });
      break;

    case "status":
      useAgentStore.setState({ status: event.status });
      break;

    case "step":
      useAgentStore.setState((s) => ({
        trace: capTrace([...s.trace, event.trace]),
        states: { ...s.states, [event.agentId]: event.agentState },
        lastMessage: { ...s.lastMessage, [event.agentId]: event.step.message },
        stepIndex: event.nextIndex,
        clockMs: event.clockMs,
        activeEdges:
          event.edgeKey && !s.activeEdges.includes(event.edgeKey)
            ? [...s.activeEdges, event.edgeKey]
            : s.activeEdges,
        focusRoute: event.focusRoute ?? s.focusRoute,
        invocations: countsAsInvocation(event.step.kind)
          ? { ...s.invocations, [event.agentId]: (s.invocations[event.agentId] ?? 0) + 1 }
          : s.invocations,
      }));
      break;

    case "settle":
      useAgentStore.setState((s) => {
        const current = s.states[event.agentId];
        if (current === "done" || current === "error" || current === "idle") return {};
        return { states: { ...s.states, [event.agentId]: "idle" as AgentState } };
      });
      break;

    case "edge-off":
      useAgentStore.setState((s) => ({
        activeEdges: s.activeEdges.filter((k) => k !== event.edgeKey),
      }));
      break;

    case "approval-request":
      useAgentStore.setState((s) => ({
        approvals: [...s.approvals, event.request],
        states: { ...s.states, [event.request.agentId]: "waiting-human" },
      }));
      break;

    case "approval-resolved":
      useAgentStore.setState((s) => ({
        trace: capTrace([...s.trace, event.trace]),
      }));
      break;

    case "trace":
      useAgentStore.setState((s) => ({ trace: capTrace([...s.trace, event.trace]) }));
      break;

    case "run-end":
      useAgentStore.setState({ activeEdges: [] });
      break;

    default:
      break;
  }
}

const runtime = createAgentRuntime({
  emit: handleRuntimeEvent,
  nextSeq,
  applyEffect: (effect) => applyScenarioEffect(effect),
});

/* ── The store ─────────────────────────────────────────────────────────── */

export const useAgentStore = create<AgentStore>()((set, get) => ({
  defs: AGENTS,
  states: idleStates(),
  lastMessage: {},
  trace: [],
  activeEdges: [],
  approvals: [],
  scenarios: SCENARIOS,
  activeScenarioId: null,
  status: "idle",
  speed: 1,
  stepIndex: 0,
  clockMs: 0,
  runId: null,
  focusRoute: null,
  invocations: emptyInvocations(),

  start: (scenarioId) => {
    const scenario = get().scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    runtime.abort();
    clearPulseTimers();
    set((s) => ({
      states: idleStates(),
      lastMessage: {},
      activeEdges: [],
      // Resolved approvals stay as history; an unanswered one from a previous
      // run can never be answered, so it goes.
      approvals: s.approvals.filter((a) => a.resolvedOptionId !== undefined),
      activeScenarioId: scenarioId,
      stepIndex: 0,
      clockMs: 0,
      focusRoute: null,
    }));
    runtime.setSpeed(get().speed);
    runtime.start(scenario);
  },

  pause: () => runtime.pause(),

  resume: () => runtime.resume(),

  step: () => {
    const s = get();
    if (s.status === "running" || s.status === "paused" || s.status === "waiting-human") {
      runtime.step();
      return;
    }
    // Nothing in flight — load the selected scenario and play only its first
    // beat, so "Step" works as the very first thing a presenter presses.
    const scenario =
      s.scenarios.find((x) => x.id === s.activeScenarioId) ?? s.scenarios[0] ?? undefined;
    if (!scenario) return;
    clearPulseTimers();
    set((prev) => ({
      states: idleStates(),
      lastMessage: {},
      activeEdges: [],
      approvals: prev.approvals.filter((a) => a.resolvedOptionId !== undefined),
      activeScenarioId: scenario.id,
      stepIndex: 0,
      clockMs: 0,
      focusRoute: null,
    }));
    runtime.setSpeed(get().speed);
    runtime.start(scenario, { paused: true });
  },

  abort: () => {
    runtime.abort();
    clearPulseTimers();
    set((s) => ({
      activeEdges: [],
      approvals: s.approvals.filter((a) => a.resolvedOptionId !== undefined),
    }));
  },

  setSpeed: (speed: PlaybackSpeed) => {
    runtime.setSpeed(speed);
    set({ speed });
  },

  resolveApproval: (approvalId, optionId) => {
    const target = get().approvals.find((a) => a.id === approvalId);
    if (!target || target.resolvedOptionId !== undefined) return;
    set((s) => ({
      approvals: s.approvals.map((a) =>
        a.id === approvalId ? { ...a, resolvedOptionId: optionId, resolvedAt: s.clockMs } : a,
      ),
      states: { ...s.states, [target.agentId]: "thinking" },
    }));
    runtime.resolveApproval(approvalId, optionId);
  },

  clearTrace: () => {
    runtime.abort();
    clearPulseTimers();
    liveClockMs = 0;
    set({
      trace: [],
      approvals: [],
      states: idleStates(),
      lastMessage: {},
      activeEdges: [],
      invocations: emptyInvocations(),
      stepIndex: 0,
      clockMs: 0,
      status: "idle",
      runId: null,
      focusRoute: null,
    });
  },

  /**
   * One-off trace entry for a real user action outside a scenario — the
   * storefront adding to the cart, admin flipping a cost assumption. This is
   * what keeps the agent layer alive when the presenter goes off-script.
   */
  emit: (event) => {
    const seq = nextSeq();
    const s = get();
    const inRun = s.runId !== null && RUN_ACTIVE.has(s.status);
    let atMs = event.atMs;
    if (atMs === undefined) {
      if (inRun) {
        atMs = s.clockMs;
      } else {
        liveClockMs += event.durationMs ?? LIVE_TICK_MS;
        atMs = liveClockMs;
      }
    }
    const entry: TraceEvent = {
      ...event,
      id: `tr-${seq}`,
      seq,
      atMs,
      runId: s.runId ?? "live",
    };
    set((prev) => ({
      trace: capTrace([...prev.trace, entry]),
      lastMessage: { ...prev.lastMessage, [entry.agentId]: entry.message },
      invocations: countsAsInvocation(entry.kind)
        ? { ...prev.invocations, [entry.agentId]: (prev.invocations[entry.agentId] ?? 0) + 1 }
        : prev.invocations,
    }));
  },

  /** Short ad-hoc animation plus trace, for a real user interaction. */
  pulse: (agentId, state, message, holdMs = DEFAULT_PULSE_MS) => {
    const kind = KIND_BY_STATE[state];
    get().emit({ agentId, kind, level: levelForKind(kind), message });
    set((s) => ({
      states: { ...s.states, [agentId]: state },
      lastMessage: { ...s.lastMessage, [agentId]: message },
    }));

    const existing = pulseTimers.get(agentId);
    if (existing !== undefined) clearTimeout(existing);

    const handle = setTimeout(() => {
      pulseTimers.delete(agentId);
      // Only stand down if nothing else has taken this agent over since.
      if (useAgentStore.getState().states[agentId] !== state) return;
      useAgentStore.setState((s) => ({ states: { ...s.states, [agentId]: "idle" } }));
    }, Math.max(0, holdMs));
    pulseTimers.set(agentId, handle);
  },
}));

/**
 * Tears down every timer the agent layer owns. Call from a shell unmount or a
 * hot-reload teardown — a leaked interval in a live demo is fatal.
 */
export function disposeAgentRuntime(): void {
  runtime.dispose();
  clearPulseTimers();
}

/** Read-only access to the runtime, for a presenter surface that needs it. */
export const agentRuntime = runtime;
