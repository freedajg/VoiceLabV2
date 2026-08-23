/**
 * The agent runtime — a deterministic, fully controllable step player.
 *
 * It knows nothing about React. It walks a `Scenario`'s steps, waits between
 * them, applies each step's declarative effect to the business data, and emits
 * typed `RuntimeEvent`s that a store turns into state. Every timer it creates
 * is tracked and cleared on abort, so nothing can outlive a demo.
 *
 * Two properties are load-bearing:
 *
 * 1. **The trace timeline is simulated, never wall-clock.** `atMs` accumulates
 *    from each step's declared duration, so the trace is byte-identical at 0.5×
 *    and at 4×. Playback speed only changes how long a human waits.
 * 2. **An approval genuinely blocks.** The player stops, the request is queued,
 *    and nothing advances until `resolveApproval` is called. Denying is a real
 *    branch, not theatre — see `resolveApproval` below.
 */
import type {
  AgentId,
  AgentState,
  ApprovalRequest,
  PlaybackSpeed,
  RunStatus,
  Scenario,
  ScenarioEffect,
  ScenarioStep,
  TraceEvent,
  TraceKind,
  TraceLevel,
} from "../contracts/agents";

/* ── Tunables ──────────────────────────────────────────────────────────── */

/** Gap used when a step declares neither `delayMs` nor `durationMs`. */
export const DEFAULT_STEP_MS = 600;
/** How long a handoff edge stays lit, before speed scaling. */
export const EDGE_HOLD_MS = 900;
/** Beat between resolving an approval and the run picking back up. */
export const APPROVAL_RESUME_MS = 450;

/* ── Events the runtime emits ──────────────────────────────────────────── */

export type RuntimeEvent =
  | { type: "run-start"; runId: string; scenarioId: string }
  | { type: "status"; status: RunStatus }
  | {
      type: "step";
      index: number;
      /** Index the player will play next; drives the progress read-out. */
      nextIndex: number;
      step: ScenarioStep;
      agentId: AgentId;
      agentState: AgentState;
      trace: TraceEvent;
      /** Simulated clock *after* this step, in ms. */
      clockMs: number;
      edgeKey: string | null;
      focusRoute: string | null;
    }
  /** The named agent's turn is over — return it to idle. */
  | { type: "settle"; agentId: AgentId }
  | { type: "edge-off"; edgeKey: string }
  | { type: "approval-request"; request: ApprovalRequest }
  | { type: "approval-resolved"; approvalId: string; optionId: string; trace: TraceEvent }
  /** A trace entry with no step behind it (run summaries, deny notices). */
  | { type: "trace"; trace: TraceEvent }
  | { type: "run-end"; status: "complete" | "aborted"; reason: string };

/* ── Injection seams (kept small, and only for testing) ────────────────── */

export type TimerHandle = ReturnType<typeof setTimeout>;

export interface TimerApi {
  set: (fn: () => void, ms: number) => TimerHandle;
  clear: (handle: TimerHandle) => void;
}

const realTimers: TimerApi = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle),
};

/** Applies a step's effect to the business data and returns what it did. */
export type EffectApplier = (effect: ScenarioEffect) => Record<string, unknown> | null;

export interface RuntimeOptions {
  emit: (event: RuntimeEvent) => void;
  /** Session-wide monotonic counter, owned by the caller so live emits share it. */
  nextSeq: () => number;
  applyEffect?: EffectApplier;
  timers?: TimerApi;
  defaultStepMs?: number;
  edgeHoldMs?: number;
}

export interface StartOptions {
  /** Load the scenario and play only its first beat, then hold. */
  paused?: boolean;
}

export interface AgentRuntime {
  start: (scenario: Scenario, opts?: StartOptions) => void;
  pause: () => void;
  resume: () => void;
  /** Advances exactly one step. Works while paused; ignored while blocked. */
  step: () => void;
  abort: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  resolveApproval: (approvalId: string, optionId: string) => void;
  getStatus: () => RunStatus;
  getSpeed: () => PlaybackSpeed;
  /** Clears every outstanding timer. Call from an unmount / teardown path. */
  dispose: () => void;
}

/* ── Kind → state / level defaults ─────────────────────────────────────── */

const STATE_BY_KIND: Record<TraceKind, AgentState> = {
  spawn: "thinking",
  think: "thinking",
  "tool-call": "tool",
  "tool-result": "tool",
  handoff: "handoff",
  emit: "listening",
  "approval-request": "waiting-human",
  "approval-resolved": "thinking",
  guardrail: "thinking",
  error: "error",
  complete: "done",
};

const LEVEL_BY_KIND: Record<TraceKind, TraceLevel> = {
  spawn: "info",
  think: "info",
  "tool-call": "info",
  "tool-result": "success",
  handoff: "info",
  emit: "info",
  "approval-request": "warn",
  "approval-resolved": "success",
  guardrail: "warn",
  error: "error",
  complete: "success",
};

export const stateForKind = (kind: TraceKind): AgentState => STATE_BY_KIND[kind];
export const levelForKind = (kind: TraceKind): TraceLevel => LEVEL_BY_KIND[kind];

/** Simulated time a step occupies on the trace timeline. */
export const stepSpanMs = (step: ScenarioStep, fallback = DEFAULT_STEP_MS): number =>
  step.durationMs ?? step.delayMs ?? fallback;

/** Real-world wait before the *next* step, before speed scaling. */
export const stepGapMs = (step: ScenarioStep, fallback = DEFAULT_STEP_MS): number =>
  step.delayMs ?? step.durationMs ?? fallback;

/** A resolved option id starting with `deny` takes the refusal branch. */
export const isDenial = (optionId: string): boolean => optionId.toLowerCase().startsWith("deny");

/** Marker a scenario step carries to say "the deny branch resumes here". */
export const RESUME_AFTER_DENY = "resumeAfterDeny";

const isResumePoint = (step: ScenarioStep): boolean =>
  step.payload?.[RESUME_AFTER_DENY] === true;

/**
 * A `complete` step from the orchestrator closes the run, so a scenario can put
 * alternate branch tails after it. Any other agent may emit `complete` for its
 * own sub-task without ending anything, and ORCH can opt out with
 * `payload: { endsRun: false }`.
 */
const endsRun = (step: ScenarioStep): boolean =>
  step.kind === "complete" && step.agentId === "ORCH" && step.payload?.["endsRun"] !== false;

/* ── The player ────────────────────────────────────────────────────────── */

export function createAgentRuntime(options: RuntimeOptions): AgentRuntime {
  const timers = options.timers ?? realTimers;
  const defaultStepMs = options.defaultStepMs ?? DEFAULT_STEP_MS;
  const edgeHoldMs = options.edgeHoldMs ?? EDGE_HOLD_MS;
  const emit = options.emit;

  const live = new Set<TimerHandle>();

  let scenario: Scenario | null = null;
  let index = 0;
  let status: RunStatus = "idle";
  let speed: PlaybackSpeed = 1;
  let clockMs = 0;
  let runId: string | null = null;
  let runCounter = 0;
  let lastActing: AgentId | null = null;
  let pending: ApprovalRequest | null = null;

  /* -- timers ------------------------------------------------------------ */

  const after = (ms: number, fn: () => void): TimerHandle => {
    let handle: TimerHandle | null = null;
    handle = timers.set(() => {
      if (handle !== null) live.delete(handle);
      fn();
    }, Math.max(0, Math.round(ms)));
    live.add(handle);
    return handle;
  };

  let tick: TimerHandle | null = null;

  const cancelTick = (): void => {
    if (tick !== null) {
      timers.clear(tick);
      live.delete(tick);
      tick = null;
    }
  };

  const clearAllTimers = (): void => {
    cancelTick();
    live.forEach((handle) => timers.clear(handle));
    live.clear();
  };

  const setStatus = (next: RunStatus): void => {
    if (status === next) return;
    status = next;
    emit({ type: "status", status });
  };

  /* -- trace helpers ----------------------------------------------------- */

  const makeTrace = (
    agentId: AgentId,
    kind: TraceKind,
    message: string,
    extra?: Partial<Omit<TraceEvent, "id" | "seq" | "atMs" | "runId" | "agentId" | "kind" | "message">>,
  ): TraceEvent => {
    const seq = options.nextSeq();
    return {
      id: `tr-${seq}`,
      seq,
      atMs: clockMs,
      runId: runId ?? "live",
      agentId,
      kind,
      level: extra?.level ?? levelForKind(kind),
      message,
      ...(extra?.toolName !== undefined ? { toolName: extra.toolName } : {}),
      ...(extra?.targetAgentId !== undefined ? { targetAgentId: extra.targetAgentId } : {}),
      ...(extra?.payload !== undefined ? { payload: extra.payload } : {}),
      ...(extra?.durationMs !== undefined ? { durationMs: extra.durationMs } : {}),
    };
  };

  /* -- scheduling -------------------------------------------------------- */

  const scheduleNext = (gapMs: number): void => {
    cancelTick();
    const handle = after(gapMs / speed, () => {
      tick = null;
      if (status !== "running") return;
      playNext();
    });
    tick = handle;
  };

  const finish = (endStatus: "complete" | "aborted", reason: string): void => {
    clearAllTimers();
    setStatus(endStatus);
    pending = null;
    emit({ type: "run-end", status: endStatus, reason });
  };

  /**
   * Applies the step at `index`, advances the cursor and returns the gap the
   * caller should wait before the following step. Returns null when the run
   * has stopped (finished, or blocked on an approval).
   */
  const applyStep = (): number | null => {
    if (!scenario) return null;
    const step = scenario.steps[index];
    if (!step) {
      finish("complete", "All steps played.");
      return null;
    }

    const span = stepSpanMs(step, defaultStepMs);
    const gap = stepGapMs(step, defaultStepMs);

    // Effect first, so its result can travel in the trace payload.
    let effectResult: Record<string, unknown> | null = null;
    if (step.effect && step.effect.type !== "none" && options.applyEffect) {
      effectResult = options.applyEffect(step.effect);
    }

    const payload: Record<string, unknown> | undefined =
      step.payload || effectResult
        ? { ...(step.payload ?? {}), ...(effectResult ? { result: effectResult } : {}) }
        : undefined;

    const agentState = step.state ?? stateForKind(step.kind);
    const edge =
      step.kind === "handoff" && step.targetAgentId
        ? `${step.agentId}>${step.targetAgentId}`
        : null;

    const trace = makeTrace(step.agentId, step.kind, step.message, {
      level: step.level,
      toolName: step.toolName,
      targetAgentId: step.targetAgentId,
      payload,
      durationMs: step.durationMs,
    });

    if (lastActing && lastActing !== step.agentId) {
      emit({ type: "settle", agentId: lastActing });
    }
    lastActing = step.agentId;

    clockMs += span;
    index += 1;

    emit({
      type: "step",
      index: index - 1,
      nextIndex: index,
      step,
      agentId: step.agentId,
      agentState,
      trace,
      clockMs,
      edgeKey: edge,
      focusRoute: step.focusRoute ?? null,
    });

    if (edge) {
      const key = edge;
      after(edgeHoldMs / speed, () => emit({ type: "edge-off", edgeKey: key }));
    }

    if (step.approval) {
      const request: ApprovalRequest = {
        ...step.approval,
        id: `apr-${trace.seq}`,
        runId: runId ?? "live",
        agentId: step.agentId,
        createdAt: clockMs,
      };
      pending = request;
      cancelTick();
      setStatus("waiting-human");
      emit({ type: "approval-request", request });
      return null;
    }

    if (endsRun(step)) {
      finish("complete", step.message);
      return null;
    }

    if (index >= scenario.steps.length) {
      finish("complete", "All steps played.");
      return null;
    }

    return gap;
  };

  const playNext = (): void => {
    const gap = applyStep();
    if (gap === null) return;
    if (status === "running") scheduleNext(gap);
  };

  /* -- public API -------------------------------------------------------- */

  const start = (next: Scenario, opts?: StartOptions): void => {
    clearAllTimers();
    scenario = next;
    index = 0;
    clockMs = 0;
    lastActing = null;
    pending = null;
    runCounter += 1;
    runId = `run-${next.id}-${runCounter}`;
    status = opts?.paused ? "paused" : "running";
    emit({ type: "run-start", runId, scenarioId: next.id });
    emit({ type: "status", status });
    // First beat fires immediately — pressing Play should feel instant. When
    // started paused it is the only beat that plays, so a presenter can walk
    // the run one step at a time from the very beginning.
    playNext();
  };

  const pause = (): void => {
    if (status !== "running") return;
    cancelTick();
    setStatus("paused");
  };

  const resume = (): void => {
    if (status !== "paused" || !scenario) return;
    setStatus("running");
    scheduleNext(0);
  };

  const stepOnce = (): void => {
    if (!scenario) return;
    if (status === "waiting-human") return; // an approval genuinely blocks
    if (status === "complete" || status === "aborted") return;
    cancelTick();
    const wasRunning = status === "running";
    if (status === "idle") setStatus("paused");
    const gap = applyStep();
    if (gap === null) return;
    if (wasRunning && status === "running") scheduleNext(gap);
  };

  const abort = (): void => {
    if (status === "idle" || status === "complete" || status === "aborted") {
      clearAllTimers();
      return;
    }
    if (lastActing) emit({ type: "settle", agentId: lastActing });
    lastActing = null;
    finish("aborted", "Run stopped by the presenter.");
  };

  const setSpeed = (next: PlaybackSpeed): void => {
    // Deliberately does not reschedule the pending wait: a speed change takes
    // effect on the next gap, never retroactively.
    speed = next;
  };

  const resolveApproval = (approvalId: string, optionId: string): void => {
    if (!pending || pending.id !== approvalId || !scenario) return;
    const request = pending;
    pending = null;

    const chosen = request.options.find((o) => o.id === optionId);
    const denied = isDenial(optionId);
    const label = chosen?.label ?? optionId;

    const trace = makeTrace(request.agentId, "approval-resolved", `Ajay chose "${label}".`, {
      level: denied ? "warn" : "success",
      payload: {
        approvalId,
        optionId,
        decision: denied ? "denied" : "approved",
        title: request.title,
      },
    });
    emit({ type: "approval-resolved", approvalId, optionId, trace });

    if (denied) {
      const resumeAt = scenario.steps.findIndex((s, i) => i >= index && isResumePoint(s));
      if (resumeAt === -1) {
        emit({
          type: "trace",
          trace: makeTrace(
            request.agentId,
            "guardrail",
            "Owner declined — no fallback path defined, so the run stops here.",
            { level: "warn", payload: { approvalId, optionId } },
          ),
        });
        finish("complete", "Run closed: the owner declined.");
        return;
      }
      const skipped = resumeAt - index;
      if (skipped > 0) {
        emit({
          type: "trace",
          trace: makeTrace(
            request.agentId,
            "guardrail",
            `Owner declined — skipping ${skipped} step${skipped === 1 ? "" : "s"} to the fallback path.`,
            { level: "warn", payload: { approvalId, optionId, skippedSteps: skipped } },
          ),
        });
      }
      index = resumeAt;
    }

    setStatus("running");
    scheduleNext(APPROVAL_RESUME_MS);
  };

  return {
    start,
    pause,
    resume,
    step: stepOnce,
    abort,
    setSpeed,
    resolveApproval,
    getStatus: () => status,
    getSpeed: () => speed,
    dispose: clearAllTimers,
  };
}
