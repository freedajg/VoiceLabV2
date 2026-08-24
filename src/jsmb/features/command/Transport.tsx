/**
 * Transport — the instrument strip the presenter drives the demo from.
 *
 * Run state, the simulated clock, play / pause / step / abort, and the playback
 * speed, in one fixed row that never moves as the page below it changes. The
 * clock is the run's own simulated time, never the wall clock, so the same run
 * reads identically at 0.5× and 4×.
 */
import { Eraser, Pause, Play, SkipForward, Square } from "lucide-react";
import { cn } from "../../ui/cn";
import { Badge, Button, EYEBROW, SegmentedControl } from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import type { PlaybackSpeed, RunStatus } from "../../contracts/agents";
import { formatClock } from "./lib";

const STATUS_LABEL: Record<RunStatus, string> = {
  idle: "Standby",
  running: "Running",
  paused: "Paused",
  "waiting-human": "Waiting for Ajay",
  complete: "Complete",
  aborted: "Aborted",
};

const STATUS_TONE = {
  idle: "neutral",
  running: "success",
  paused: "info",
  "waiting-human": "warn",
  complete: "success",
  aborted: "danger",
} as const;

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];
const speedLabel = (s: PlaybackSpeed): string => `${s}×`;

export interface TransportProps {
  className?: string;
}

export function Transport({ className }: TransportProps) {
  const status = useAgentStore((s) => s.status);
  const speed = useAgentStore((s) => s.speed);
  const clockMs = useAgentStore((s) => s.clockMs);
  const stepIndex = useAgentStore((s) => s.stepIndex);
  const scenarios = useAgentStore((s) => s.scenarios);
  const activeScenarioId = useAgentStore((s) => s.activeScenarioId);
  const focusRoute = useAgentStore((s) => s.focusRoute);
  const traceLength = useAgentStore((s) => s.trace.length);
  const start = useAgentStore((s) => s.start);
  const pause = useAgentStore((s) => s.pause);
  const resume = useAgentStore((s) => s.resume);
  const step = useAgentStore((s) => s.step);
  const abort = useAgentStore((s) => s.abort);
  const setSpeed = useAgentStore((s) => s.setSpeed);
  const clearTrace = useAgentStore((s) => s.clearTrace);

  const scenario = scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];
  const totalSteps = scenario?.steps.length ?? 0;
  const inFlight = status === "running" || status === "paused" || status === "waiting-human";
  const progress = totalSteps > 0 ? Math.min(1, stepIndex / totalSteps) : 0;
  const blocked = status === "waiting-human";

  function handlePrimary() {
    if (status === "running") {
      pause();
      return;
    }
    if (status === "paused") {
      resume();
      return;
    }
    if (scenario) start(scenario.id);
  }

  const primaryLabel =
    status === "running"
      ? "Pause"
      : status === "paused"
        ? "Resume"
        : blocked
          ? "Blocked"
          : "Run scenario";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--j-radius)] border border-j-console-line bg-j-console-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-3.5 py-3 sm:px-4">
        {/* Clock */}
        <div className="flex items-baseline gap-2">
          <span className="num j-mono text-[26px] font-medium leading-none tracking-tight text-j-console-ink">
            {formatClock(clockMs)}
          </span>
          <span className={cn(EYEBROW, "text-j-console-ink-2/60")}>sim</span>
        </div>

        <div className="flex flex-col gap-1">
          <Badge tone={STATUS_TONE[status]} surface="console" size="sm" dot>
            {STATUS_LABEL[status]}
          </Badge>
          <span className="num j-mono text-[10.5px] text-j-console-ink-2/70">
            step {String(Math.min(stepIndex, totalSteps)).padStart(2, "0")}/
            {String(totalSteps).padStart(2, "0")} · {traceLength} entries
          </span>
        </div>

        {/* Transport buttons */}
        <div className="flex items-center gap-2">
          <Button
            surface="console"
            tone={status === "running" ? "neutral" : blocked ? "warn" : "primary"}
            variant={status === "running" ? "soft" : "solid"}
            size="sm"
            disabled={blocked || !scenario}
            onClick={handlePrimary}
            iconLeft={status === "running" ? <Pause /> : <Play />}
          >
            {primaryLabel}
          </Button>
          <Button
            surface="console"
            tone="neutral"
            variant="outline"
            size="sm"
            disabled={blocked || !scenario}
            onClick={step}
            iconLeft={<SkipForward />}
          >
            Step
          </Button>
          <Button
            surface="console"
            tone="danger"
            variant="ghost"
            size="sm"
            disabled={!inFlight}
            onClick={abort}
            iconLeft={<Square />}
          >
            Abort
          </Button>
          <Button
            surface="console"
            tone="neutral"
            variant="ghost"
            size="sm"
            disabled={traceLength === 0 && !inFlight}
            onClick={clearTrace}
            iconLeft={<Eraser />}
          >
            Clear
          </Button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {focusRoute ? (
            <a
              href={`#${focusRoute}`}
              className="j-mono hidden rounded-lg border border-j-console-line px-2 py-1 text-[11px] text-j-console-ink-2 transition-colors hover:border-j-primary/50 hover:text-j-primary-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright md:inline-block"
            >
              on screen: {focusRoute}
            </a>
          ) : null}
          <div className="flex items-center gap-2">
            <span className={cn(EYEBROW, "hidden text-j-console-ink-2/60 sm:inline")}>Speed</span>
            <SegmentedControl
              label="Playback speed"
              surface="console"
              size="sm"
              value={String(speed)}
              onChange={(value) => {
                const next = Number(value);
                const match = SPEEDS.find((s) => s === next);
                if (match !== undefined) setSpeed(match);
              }}
              options={SPEEDS.map((s) => ({ value: String(s), label: speedLabel(s) }))}
            />
          </div>
        </div>
      </div>

      {/* Run progress — the only always-on motion on the page. */}
      <div className="h-[3px] w-full bg-j-console-3">
        <div
          className="j-meter h-full"
          style={{
            width: `${(progress * 100).toFixed(1)}%`,
            backgroundColor: blocked
              ? "rgb(var(--j-warn))"
              : status === "aborted"
                ? "rgb(var(--j-danger))"
                : "rgb(var(--j-primary-bright))",
          }}
        />
      </div>
    </div>
  );
}
