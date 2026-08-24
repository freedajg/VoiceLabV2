/**
 * Command Centre — route `#/`, the screen the demo opens on.
 *
 * Reading order is deliberate: the transport is always reachable at the top,
 * an open decision takes the whole screen when there is one, then the mesh —
 * the picture the prospect remembers — then the real books underneath it, then
 * the scenarios to launch and the trace streaming beside them.
 */
import { useMemo } from "react";
import { ArrowUpRight, Radio } from "lucide-react";
import { cn } from "../../ui/cn";
import { Badge, EYEBROW, GUTTER, PageHeader, agentStateIsLive } from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { AGENTS } from "../../agents/registry";
import { AgentMesh } from "./AgentMesh";
import { BusinessStrip } from "./BusinessStrip";
import { DecisionLog, PendingApprovals } from "./ApprovalDeck";
import { ScenarioLauncher } from "./ScenarioLauncher";
import { TraceConsole } from "./TraceConsole";
import { Transport } from "./Transport";

/** Newest slice handed to the console — the full log lives on `#/agents`. */
const CONSOLE_WINDOW = 120;

function LiveCount() {
  const states = useAgentStore((s) => s.states);
  const live = AGENTS.filter((a) => agentStateIsLive(states[a.id] ?? "idle")).length;
  return (
    <Badge tone={live > 0 ? "success" : "neutral"} surface="console" size="sm" dot>
      {live > 0 ? `${live} agents working` : "All agents idle"}
    </Badge>
  );
}

export function CommandCentre() {
  const trace = useAgentStore((s) => s.trace);
  const visible = useMemo(() => trace.slice(-CONSOLE_WINDOW), [trace]);
  const truncated = trace.length - visible.length;

  return (
    <div className="min-h-full bg-j-console pb-14 text-j-console-ink">
      <PageHeader
        surface="console"
        eyebrow="Jaggula Samson Mill Boards · live operation"
        title="Command Centre"
        subtitle="Twelve named agents run this mill in three lanes — the front office a buyer touches, the order-to-cash line that turns a basket into money, and the back office Ajay runs the business on. Everything below is deterministic: the same run, the same figures, every time."
        actions={
          <>
            <LiveCount />
            <a
              href="#/agents"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-j-console-line px-3 text-[13px] font-semibold text-j-console-ink transition-colors hover:border-j-primary/50 hover:text-j-primary-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
            >
              Agent ops
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </>
        }
      />

      <div className={cn("sticky top-0 z-20 bg-j-console/95 py-3 backdrop-blur", GUTTER)}>
        <Transport />
      </div>

      <div className={cn(GUTTER, "space-y-7")}>
        <PendingApprovals />

        <section aria-label="Agent mesh" className="space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className={cn(EYEBROW, "flex items-center gap-1.5 text-j-console-ink-2/70")}>
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              The operating team
            </h2>
            <p className="text-[11.5px] text-j-console-ink-2/60">
              Work flows top to bottom — buyer, money, books
            </p>
          </div>
          <AgentMesh size="hero" />
        </section>

        <BusinessStrip />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          <section aria-label="Scenarios" className="space-y-3">
            <div>
              <h2 className={cn(EYEBROW, "text-j-console-ink-2/70")}>Run a story</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-j-console-ink-2/70">
                Each scenario plays real work through real agents and lands on the real books.
              </p>
            </div>
            <ScenarioLauncher />
            <DecisionLog />
          </section>

          <section aria-label="Trace" className="min-w-0">
            <div className="mb-3">
              <h2 className={cn(EYEBROW, "text-j-console-ink-2/70")}>What the agents are saying</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-j-console-ink-2/70">
                Every beat, with the payload behind it. Select a line to open it.
              </p>
            </div>
            <TraceConsole
              events={visible}
              title="Trace"
              eyebrow={
                truncated > 0 ? `newest ${CONSOLE_WINDOW} of ${trace.length}` : "session log"
              }
              bodyClassName="h-[480px]"
              actions={
                <a
                  href="#/agents"
                  className="j-mono rounded border border-j-console-line px-2 py-1 text-[11px] text-j-console-ink-2 transition-colors hover:border-j-primary/50 hover:text-j-primary-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
                >
                  full log + filters
                </a>
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
}
