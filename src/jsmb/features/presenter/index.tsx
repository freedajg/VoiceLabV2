/**
 * Presenter mode — the controls the person pitching actually touches.
 *
 * Everything here is designed for someone standing up, talking, with a laptop
 * they are not looking at closely:
 *
 *   · one row, always in the same place, never reflowing as state changes
 *   · the four scenarios reachable in a single click each, in pitch order
 *   · the narration for the running scenario available without leaving the
 *     screen the audience is looking at
 *   · a reset that puts everything back to identical numbers for the next
 *     prospect, guarded so it cannot be hit by accident mid-run
 *
 * It reads and drives the same runtime as the command centre; nothing here is
 * a parallel implementation.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  Pause,
  Play,
  RotateCcw,
  Square,
  StepForward,
} from "lucide-react";
import { cn } from "../../ui/cn";
import { Button, EYEBROW, IconButton, Modal, SegmentedControl } from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { useDataStore } from "../../store/dataStore";
import { useCartStore } from "../../store/cartStore";
import { formatClock } from "../command/lib";
import type { PlaybackSpeed } from "../../contracts/agents";

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export function PresenterControls() {
  const scenarios = useAgentStore((s) => s.scenarios);
  const activeScenarioId = useAgentStore((s) => s.activeScenarioId);
  const status = useAgentStore((s) => s.status);
  const speed = useAgentStore((s) => s.speed);
  const clockMs = useAgentStore((s) => s.clockMs);
  const stepIndex = useAgentStore((s) => s.stepIndex);
  const focusRoute = useAgentStore((s) => s.focusRoute);
  const start = useAgentStore((s) => s.start);
  const pause = useAgentStore((s) => s.pause);
  const resume = useAgentStore((s) => s.resume);
  const stepOnce = useAgentStore((s) => s.step);
  const abort = useAgentStore((s) => s.abort);
  const setSpeed = useAgentStore((s) => s.setSpeed);
  const clearTrace = useAgentStore((s) => s.clearTrace);
  const resetDemo = useDataStore((s) => s.resetDemo);
  const clearCart = useCartStore((s) => s.clearCart);
  const signOut = useCartStore((s) => s.signOut);

  const [narrationOpen, setNarrationOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const navigate = useNavigate();

  const active = scenarios.find((s) => s.id === activeScenarioId) ?? null;
  const running = status === "running";
  const blocked = status === "waiting-human";
  const busy = running || status === "paused" || blocked;

  /**
   * Follow the running scenario's focus route. This is the difference between
   * a presenter narrating a trace log and the audience watching the actual
   * screen the agent is working on — the app walks itself through the story.
   */
  useEffect(() => {
    if (focusRoute) navigate(focusRoute);
  }, [focusRoute, navigate]);

  function handleReset() {
    abort();
    resetDemo();
    clearTrace();
    clearCart();
    signOut();
    setConfirmReset(false);
    navigate("/");
    toast.success("Demo reset", {
      description: "Seeded data restored, trace cleared, cart emptied. Same numbers as last time.",
    });
  }

  return (
    <>
      {/* Scenario picker — one click each, in the order a pitch runs them. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {scenarios.map((s, i) => {
          const isActive = s.id === activeScenarioId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => start(s.id)}
              title={`${s.title} — ${s.subtitle}`}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary",
                isActive
                  ? "border-j-primary/60 bg-j-primary/15 text-j-console-ink"
                  : "border-j-console-line text-j-console-ink-2 hover:border-j-console-ink-2/50 hover:text-j-console-ink",
              )}
            >
              <span className="j-mono text-[10px] opacity-60">S{i + 1}</span>
              <span className="hidden max-w-[13ch] truncate md:inline">{s.title}</span>
            </button>
          );
        })}
      </div>

      <span className="hidden h-6 w-px shrink-0 bg-j-console-line sm:block" />

      {/* Transport. Positions never move, so muscle memory works mid-pitch. */}
      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label={running ? "Pause" : "Play"}
          icon={running ? <Pause /> : <Play />}
          size="sm"
          surface="console"
          disabled={!active || blocked}
          onClick={() => (running ? pause() : active ? resume() : undefined)}
        />
        <IconButton
          label="Step one beat"
          icon={<StepForward />}
          size="sm"
          surface="console"
          disabled={!active || blocked}
          onClick={stepOnce}
        />
        <IconButton
          label="Stop"
          icon={<Square />}
          size="sm"
          surface="console"
          disabled={!busy}
          onClick={abort}
        />
      </div>

      <span
        className="j-mono shrink-0 text-[13px] tabular-nums text-j-console-ink-2"
        aria-label="Simulated clock"
      >
        {formatClock(clockMs)}
      </span>

      {active && (
        <span className="j-mono hidden shrink-0 text-[11px] text-j-console-ink-2/70 lg:inline">
          step {String(stepIndex).padStart(2, "0")}/{String(active.steps.length).padStart(2, "0")}
        </span>
      )}

      <SegmentedControl
        surface="console"
        size="sm"
        value={String(speed)}
        onChange={(v) => setSpeed(Number(v) as PlaybackSpeed)}
        options={SPEEDS.map((s) => ({ value: String(s), label: `${s}×` }))}
        label="Playback speed"
        className="shrink-0"
      />

      <span className="hidden h-6 w-px shrink-0 bg-j-console-line sm:block" />

      <Button
        surface="console"
        variant="ghost"
        size="sm"
        iconLeft={<BookOpen />}
        disabled={!active}
        onClick={() => setNarrationOpen(true)}
        className="shrink-0"
      >
        <span className="hidden sm:inline">Script</span>
      </Button>

      <Button
        surface="console"
        variant="ghost"
        size="sm"
        iconLeft={<RotateCcw />}
        onClick={() => setConfirmReset(true)}
        className="shrink-0"
      >
        <span className="hidden sm:inline">Reset</span>
      </Button>

      {/* The presenter's own script. Kept out of the audience's way until
          asked for, then given the whole modal — it is meant to be read. */}
      <Modal
        open={narrationOpen && !!active}
        onClose={() => setNarrationOpen(false)}
        title={active?.title ?? "Script"}
        size="lg"
        surface="console"
      >
        {active && (
          <div className="space-y-5">
            <p className="text-sm text-j-console-ink-2">{active.subtitle}</p>
            <p className="text-[15px] leading-relaxed text-j-console-ink">{active.narration}</p>
            <div>
              <p className={cn(EYEBROW, "mb-2 text-j-console-ink-2/70")}>
                Requirements demonstrated
              </p>
              <div className="flex flex-wrap gap-1.5">
                {active.brdRefs.map((ref) => (
                  <span
                    key={ref}
                    className="j-mono rounded border border-j-console-line px-1.5 py-0.5 text-[11px] text-j-console-ink-2"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-j-console-ink-2/70">
              About {active.estSeconds}s at 1×. {active.steps.length} beats,{" "}
              {active.agents.length} agents.
            </p>
          </div>
        )}
      </Modal>

      {/* Reset is guarded: hitting it by accident mid-pitch would be worse
          than any bug, because the story would restart with no explanation. */}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset the demo?"
        size="sm"
        surface="console"
      >
        <div className="space-y-4">
          <p className="text-sm text-j-console-ink-2">
            Restores the seeded dataset, clears the trace and empties the cart. Every figure returns
            to exactly what it was at the start — the demo is deterministic, so the next run shows
            identical numbers.
          </p>
          {busy && (
            <p className="text-sm font-medium text-j-warn">A scenario is still running. It will be stopped.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button surface="console" variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button surface="console" iconLeft={<Check />} onClick={handleReset}>
              Reset demo
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
