/**
 * Scenario launcher.
 *
 * Renders whatever `scenarios` holds — one smoke run today, four full stories
 * once wave 3 lands. Nothing here knows a scenario id. Each card carries what a
 * presenter needs in the two seconds before they press Run: what it shows, who
 * it lights up, how long it takes, which BRD lines it proves, and the script to
 * read over the top of it.
 */
import { useState } from "react";
import { ChevronDown, Play, Quote, Timer } from "lucide-react";
import { cn } from "../../ui/cn";
import { AgentChip, Badge, Button, EYEBROW } from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import type { Scenario } from "../../contracts/agents";
import { brdTitle } from "./lib";

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const [scriptOpen, setScriptOpen] = useState(false);
  const start = useAgentStore((s) => s.start);
  const status = useAgentStore((s) => s.status);
  const activeScenarioId = useAgentStore((s) => s.activeScenarioId);
  const stepIndex = useAgentStore((s) => s.stepIndex);

  const isActive = activeScenarioId === scenario.id;
  const inFlight =
    isActive && (status === "running" || status === "paused" || status === "waiting-human");
  const done = isActive && status === "complete";
  const progress = Math.min(1, stepIndex / Math.max(1, scenario.steps.length));

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[var(--j-radius)] border bg-j-console-2 transition-colors",
        inFlight ? "border-j-primary/60" : "border-j-console-line",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className={cn(EYEBROW, "mb-1.5 text-j-console-ink-2/60")}>Scenario</div>
            <h3 className="text-balance text-[17px] font-semibold leading-tight text-j-console-ink">
              {scenario.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {done ? (
              <Badge tone="success" surface="console" size="xs" dot>
                Played
              </Badge>
            ) : null}
            {inFlight ? (
              <Badge tone="primary" surface="console" size="xs" dot>
                {status === "waiting-human" ? "Blocked" : status}
              </Badge>
            ) : null}
            <Badge tone="neutral" surface="console" size="xs" icon={<Timer />} mono>
              ~{scenario.estSeconds}s
            </Badge>
          </div>
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-j-console-ink-2">{scenario.subtitle}</p>

        <div className="mt-4">
          <div className={cn(EYEBROW, "mb-2 text-j-console-ink-2/60")}>
            Agents it lights up · {scenario.agents.length}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scenario.agents.map((id) => (
              <AgentChip key={id} id={id} surface="console" size="xs" />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className={cn(EYEBROW, "mb-2 text-j-console-ink-2/60")}>
            BRD requirements proved · {scenario.brdRefs.length}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {scenario.brdRefs.map((ref) => (
              <li key={ref}>
                <span
                  title={brdTitle(ref)}
                  className="j-mono inline-block rounded border border-j-console-line px-1.5 py-0.5 text-[10.5px] text-j-console-ink-2"
                >
                  {ref}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Presenter script — kept on the card so nobody reads off a phone. */}
        <div className="mt-4 rounded-lg border-l-2 border-j-primary/60 bg-j-console/60 py-2.5 pl-3 pr-2.5">
          <div className={cn(EYEBROW, "mb-1.5 flex items-center gap-1.5 text-j-primary-bright")}>
            <Quote className="h-3 w-3" aria-hidden="true" />
            Say this
          </div>
          <p
            className={cn(
              "text-[12.5px] leading-relaxed text-j-console-ink-2",
              scriptOpen ? "" : "line-clamp-3",
            )}
          >
            {scenario.narration}
          </p>
          <button
            type="button"
            onClick={() => setScriptOpen((v) => !v)}
            aria-expanded={scriptOpen}
            className="mt-1.5 inline-flex items-center gap-1 rounded text-[11.5px] font-semibold text-j-primary-bright hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
          >
            {scriptOpen ? "Collapse the script" : "Read the whole script"}
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", scriptOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            surface="console"
            tone="primary"
            variant={inFlight ? "soft" : "solid"}
            size="md"
            onClick={() => start(scenario.id)}
            iconLeft={<Play />}
          >
            {inFlight ? "Restart run" : done ? "Run again" : "Run scenario"}
          </Button>
          <span className="num j-mono text-[11.5px] text-j-console-ink-2/70">
            {scenario.steps.length} beats
          </span>
        </div>
      </div>

      {inFlight || done ? (
        <div className="h-[3px] w-full bg-j-console-3">
          <div
            className="j-meter h-full bg-j-primary-bright"
            style={{ width: `${(progress * 100).toFixed(1)}%` }}
          />
        </div>
      ) : null}
    </article>
  );
}

export function ScenarioLauncher({ className }: { className?: string }) {
  const scenarios = useAgentStore((s) => s.scenarios);

  if (scenarios.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[var(--j-radius)] border border-dashed border-j-console-line px-5 py-8 text-center",
          className,
        )}
      >
        <p className="text-[13px] font-semibold text-j-console-ink-2">No scenarios loaded</p>
        <p className="mt-1 text-[12px] text-j-console-ink-2/70">
          The agent layer is live — every real action on the storefront and in admin still traces.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", scenarios.length > 1 && "sm:grid-cols-2 xl:grid-cols-1", className)}>
      {scenarios.map((scenario) => (
        <ScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </div>
  );
}
