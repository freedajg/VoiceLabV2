import { useMemo } from "react";
import { ChevronRight, Radio } from "lucide-react";
import { cn } from "../ui/cn";
import { AGENT_STATE_LABEL, agentStateIsLive, agentStateTone, Badge, EYEBROW, toneClasses } from "../ui";
import { useUiStore } from "../store/uiStore";
import { useAgentStore } from "../store/agentStore";
import { AGENTS, LANES } from "../agents/registry";
import type { AgentDef, AgentId, AgentLane, AgentState, TraceEvent } from "../contracts/agents";

const LANE_ACCENT: Record<AgentLane, string> = {
  "front-office": "bg-j-lane-front",
  "order-to-cash": "bg-j-lane-otc",
  "back-office": "bg-j-lane-back",
};

/** Groups the registry into the three lanes, in the registry's own order. */
function useLanes(): { key: AgentLane; label: string; blurb: string; agents: AgentDef[] }[] {
  return useMemo(
    () =>
      LANES.map((lane) => ({
        key: lane.key as AgentLane,
        label: lane.label,
        blurb: lane.blurb,
        agents: AGENTS.filter((a) => a.lane === lane.key),
      })),
    [],
  );
}

function AgentRow({
  def,
  state,
  message,
  invocations,
}: {
  def: AgentDef;
  state: AgentState;
  message?: string;
  invocations: number;
}) {
  const inspectAgent = useUiStore((s) => s.inspectAgent);
  const tone = agentStateTone(state);
  const t = toneClasses(tone, "console");
  const live = agentStateIsLive(state);

  return (
    <li>
      <button
        type="button"
        onClick={() => inspectAgent(def.id)}
        className={cn(
          "group flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
          "hover:bg-j-console-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-console",
          live && "bg-j-console-2",
        )}
      >
        <span className="relative mt-1 inline-flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          {live ? (
            <span
              className="j-pulse-ring absolute inset-0 rounded-full"
              style={{ backgroundColor: def.accent }}
            />
          ) : null}
          <span
            className={cn("relative h-full w-full rounded-full", state === "idle" && "opacity-45")}
            style={{ backgroundColor: def.accent }}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[13px] font-semibold text-j-console-ink">
              {def.codename}
            </span>
            <span className="j-mono shrink-0 text-[10px] tracking-tight text-j-console-ink-2/70">
              {def.id}
            </span>
            {invocations > 0 ? (
              <span className="num ml-auto shrink-0 text-[10px] tabular-nums text-j-console-ink-2/70">
                {invocations}
              </span>
            ) : null}
          </span>
          <span className={cn("mt-0.5 block truncate text-[11px]", state === "idle" ? "text-j-console-ink-2/70" : t.text)}>
            {AGENT_STATE_LABEL[state]}
          </span>
          {message && state !== "idle" ? (
            <span className="mt-1 block line-clamp-2 text-[11px] leading-snug text-j-console-ink-2">
              {message}
            </span>
          ) : null}
        </span>

        <ChevronRight
          className="mt-1 h-3.5 w-3.5 shrink-0 text-j-console-ink-2/40 transition-colors group-hover:text-j-console-ink-2"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

function TraceTail({ trace }: { trace: TraceEvent[] }) {
  const inspectTrace = useUiStore((s) => s.inspectTrace);
  const tail = trace.slice(-7);

  return (
    <div className="border-t border-j-console-line px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className={cn(EYEBROW, "text-j-console-ink-2/70")}>Live trace</span>
        <a
          href="#/agents"
          className="text-[11px] font-semibold text-j-primary-bright hover:underline"
        >
          Open console
        </a>
      </div>
      {tail.length === 0 ? (
        <p className="j-mono text-[11px] leading-relaxed text-j-console-ink-2/60">
          waiting for a run…
        </p>
      ) : (
        <ol className="j-mono space-y-1 text-[11px] leading-snug">
          {tail.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => inspectTrace(e.id)}
                className="flex w-full items-start gap-1.5 rounded text-left hover:bg-j-console-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-j-primary"
              >
                <span className="shrink-0 tabular-nums text-j-console-ink-2/50">
                  {(e.atMs / 1000).toFixed(1)}s
                </span>
                <span className="shrink-0 font-semibold text-j-primary-bright">{e.agentId}</span>
                <span className="truncate text-j-console-ink-2">{e.message}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export interface AgentRailProps {
  /** Rendered inside the mobile drawer, where the rail has no border of its own. */
  embedded?: boolean;
  className?: string;
}

/**
 * The always-on agent rail.
 *
 * This is what keeps the agent layer present while the presenter is deep in the
 * storefront or the admin books: twelve agents grouped by lane, live state dots,
 * the last thing the working agent said, and a trace tail. Dark against the
 * light product surfaces on purpose — it reads as a separate system running
 * alongside, not a widget inside.
 */
export function AgentRail({ embedded = false, className }: AgentRailProps) {
  const lanes = useLanes();
  const states = useAgentStore((s) => s.states);
  const lastMessage = useAgentStore((s) => s.lastMessage);
  const trace = useAgentStore((s) => s.trace);
  const status = useAgentStore((s) => s.status);
  const invocations = useAgentStore((s) => s.invocations);

  const runTone =
    status === "running"
      ? "success"
      : status === "waiting-human"
        ? "warn"
        : status === "aborted"
          ? "danger"
          : "neutral";

  const liveCount = AGENTS.filter((a) => agentStateIsLive(states[a.id] ?? "idle")).length;

  return (
    <aside
      aria-label="Agent mesh"
      className={cn(
        "flex h-full min-h-0 flex-col bg-j-console text-j-console-ink",
        !embedded && "border-l border-j-console-line",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-j-console-line px-3 py-3">
        <Radio className="h-4 w-4 shrink-0 text-j-primary-bright" aria-hidden="true" />
        <span className="text-[13px] font-semibold">Agent mesh</span>
        <Badge tone={runTone} surface="console" size="xs" dot className="ml-auto">
          {status === "idle" ? "standby" : status}
        </Badge>
      </div>

      <div className="j-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {lanes.map((lane) => (
          <section key={lane.key} className="mb-2">
            <h3 className="flex items-center gap-2 px-2 pb-1 pt-2">
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 rounded-full", LANE_ACCENT[lane.key])}
              />
              <span className={cn(EYEBROW, "text-j-console-ink-2/70")}>{lane.label}</span>
            </h3>
            <ul>
              {lane.agents.map((def) => (
                <AgentRow
                  key={def.id}
                  def={def}
                  state={states[def.id] ?? "idle"}
                  message={lastMessage[def.id]}
                  invocations={invocations[def.id as AgentId] ?? 0}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-j-console-line px-3 py-2">
        <p className="num text-[11px] tabular-nums text-j-console-ink-2/70">
          {liveCount} of {AGENTS.length} agents active
        </p>
      </div>

      <TraceTail trace={trace} />
    </aside>
  );
}
