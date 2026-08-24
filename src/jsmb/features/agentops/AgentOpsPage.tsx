/**
 * Agent Ops — route `#/agents`.
 *
 * The command centre is the picture; this is the evidence. The same mesh at a
 * larger scale, the full roster with every tool and guardrail written out, the
 * complete trace with filters, a tool-call inspector showing what actually went
 * in and came back, and the session's own metrics.
 */
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "../../ui/cn";
import {
  AGENT_STATE_LABEL,
  Badge,
  EYEBROW,
  GUTTER,
  PageHeader,
  Select,
  Tabs,
  agentStateIsLive,
  agentStateTone,
} from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { AGENTS, AGENT_BY_ID, LANES } from "../../agents/registry";
import type { AgentDef, TraceKind, TraceLevel } from "../../contracts/agents";
import { AgentMesh } from "../command/AgentMesh";
import { DecisionLog, PendingApprovals } from "../command/ApprovalDeck";
import { TraceConsole } from "../command/TraceConsole";
import { Transport } from "../command/Transport";
import {
  KIND_LABEL,
  KIND_ORDER,
  LEVEL_LABEL,
  formatDuration,
  formatOffset,
  formatPayload,
  levelTone,
  pairToolCalls,
  sessionMetrics,
} from "../command/lib";

/** Widest window the filtered log will render at once. */
const LOG_WINDOW = 250;

const LEVELS: TraceLevel[] = ["info", "success", "warn", "error"];

/* ── Session metrics ───────────────────────────────────────────────────── */

function MetricCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-j-console-2 px-3.5 py-3">
      <div className={cn(EYEBROW, "text-j-console-ink-2/60")}>{label}</div>
      <div className="num j-mono mt-1.5 text-[22px] font-medium leading-none text-j-console-ink">
        {value}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-j-console-ink-2/60">{hint}</div> : null}
    </div>
  );
}

function SessionMetrics() {
  const trace = useAgentStore((s) => s.trace);
  const approvals = useAgentStore((s) => s.approvals);
  const m = useMemo(() => sessionMetrics(trace), [trace]);
  const answered = approvals.filter((a) => a.resolvedOptionId !== undefined).length;

  return (
    <section aria-label="Session metrics" className="space-y-2.5">
      <h2 className={cn(EYEBROW, "text-j-console-ink-2/70")}>This session</h2>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--j-radius)] border border-j-console-line bg-j-console-line sm:grid-cols-3 lg:grid-cols-6">
        <MetricCell label="Trace entries" value={String(m.entries)} hint="capped at 500" />
        <MetricCell label="Tool calls" value={String(m.toolCalls)} hint={`${m.guardrails} guardrail stops`} />
        <MetricCell label="Handoffs" value={String(m.handoffs)} hint="agent to agent" />
        <MetricCell
          label="Owner decisions"
          value={String(m.approvals)}
          hint={`${answered} answered`}
        />
        <MetricCell
          label="Simulated latency"
          value={formatDuration(m.latencyMs)}
          hint="sum of every beat"
        />
        <MetricCell
          label="Agents engaged"
          value={`${m.agentsEngaged}/${AGENTS.length}`}
          hint={m.errors > 0 ? `${m.errors} errors` : "no errors"}
        />
      </div>
    </section>
  );
}

/* ── Roster ────────────────────────────────────────────────────────────── */

function RosterCard({ def }: { def: AgentDef }) {
  const state = useAgentStore((s) => s.states[def.id] ?? "idle");
  const invocations = useAgentStore((s) => s.invocations[def.id] ?? 0);
  const live = agentStateIsLive(state);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[var(--j-radius)] border bg-j-console-2 p-4 pl-5",
        live ? "border-j-console-ink-2/40" : "border-j-console-line",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: def.accent, opacity: live ? 1 : 0.5 }}
      />
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-j-console-ink">{def.codename}</h3>
            <span className="j-mono text-[10.5px] text-j-console-ink-2/80">{def.id}</span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-j-console-ink-2">{def.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={agentStateTone(state)} surface="console" size="xs" dot>
            {AGENT_STATE_LABEL[state]}
          </Badge>
          <span className="num j-mono text-[11px] text-j-console-ink-2/70">{invocations}×</span>
        </div>
      </div>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-j-console-ink-2/85">{def.blurb}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className={cn(EYEBROW, "mb-1.5 flex items-center gap-1.5 text-j-console-ink-2/60")}>
            <Wrench className="h-3 w-3" aria-hidden="true" />
            Tools · {def.tools.length}
          </h4>
          <ul className="space-y-1">
            {def.tools.map((tool) => (
              <li key={tool.name} className="text-[11.5px] leading-snug">
                <span className="j-mono text-j-console-ink">{tool.name}</span>
                <span className="text-j-console-ink-2/70"> — {tool.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={cn(EYEBROW, "mb-1.5 flex items-center gap-1.5 text-j-console-ink-2/60")}>
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Guardrails · {def.guardrails.length}
          </h4>
          <ul className="space-y-1">
            {def.guardrails.map((rule) => (
              <li
                key={rule}
                className="flex gap-1.5 text-[11.5px] leading-snug text-j-console-ink-2/85"
              >
                <span aria-hidden="true" className="text-j-console-ink-2/40">
                  ·
                </span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <a
        href={`#/agents/${def.id}`}
        className="mt-3 inline-flex items-center gap-1 rounded text-[12px] font-semibold text-j-primary-bright hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
      >
        Open {def.codename}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </article>
  );
}

function Roster() {
  return (
    <div className="space-y-7">
      {LANES.map((lane) => (
        <section key={lane.key}>
          <header className="mb-3">
            <h3 className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: lane.accent }}
              />
              <span className="text-[15px] font-semibold text-j-console-ink">{lane.label}</span>
            </h3>
            <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-j-console-ink-2/75">
              {lane.blurb}
            </p>
          </header>
          <div className="grid gap-3 lg:grid-cols-2">
            {AGENTS.filter((a) => a.lane === lane.key).map((def) => (
              <RosterCard key={def.id} def={def} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ── Trace with filters ────────────────────────────────────────────────── */

function TraceLog() {
  const trace = useAgentStore((s) => s.trace);
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      trace.filter(
        (e) =>
          (agentFilter === "all" || e.agentId === agentFilter) &&
          (kindFilter === "all" || e.kind === kindFilter) &&
          (levelFilter === "all" || e.level === levelFilter),
      ),
    [trace, agentFilter, kindFilter, levelFilter],
  );

  const visible = useMemo(() => filtered.slice(-LOG_WINDOW), [filtered]);
  const filtering = agentFilter !== "all" || kindFilter !== "all" || levelFilter !== "all";

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          surface="console"
          selectSize="sm"
          aria-label="Filter by agent"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          options={[
            { value: "all", label: `All agents (${AGENTS.length})` },
            ...AGENTS.map((a) => ({ value: a.id, label: `${a.codename} · ${a.id}` })),
          ]}
        />
        <Select
          surface="console"
          selectSize="sm"
          aria-label="Filter by kind"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          options={[
            { value: "all", label: "Every kind of beat" },
            ...KIND_ORDER.map((k: TraceKind) => ({ value: k, label: KIND_LABEL[k] })),
          ]}
        />
        <Select
          surface="console"
          selectSize="sm"
          aria-label="Filter by level"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          options={[
            { value: "all", label: "Every level" },
            ...LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] })),
          ]}
        />
      </div>

      <TraceConsole
        events={visible}
        title="Session trace"
        eyebrow={
          filtering
            ? `${filtered.length} of ${trace.length} entries match`
            : `${trace.length} entries`
        }
        bodyClassName="h-[560px]"
        emptyTitle={filtering ? "Nothing matches those filters" : "No activity yet"}
        emptyHint={
          filtering
            ? "Widen a filter, or run a scenario from the command centre."
            : "Run a scenario and every tool call, handoff and decision streams here."
        }
        actions={
          filtering ? (
            <button
              type="button"
              onClick={() => {
                setAgentFilter("all");
                setKindFilter("all");
                setLevelFilter("all");
              }}
              className="rounded border border-j-console-line px-2 py-1 text-[11px] font-semibold text-j-console-ink-2 transition-colors hover:text-j-console-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
            >
              Clear filters
            </button>
          ) : null
        }
      />
    </div>
  );
}

/* ── Tool-call inspector ───────────────────────────────────────────────── */

function ToolInspector() {
  const trace = useAgentStore((s) => s.trace);
  const calls = useMemo(() => pairToolCalls(trace), [trace]);
  const [openId, setOpenId] = useState<string | null>(null);

  if (calls.length === 0) {
    return (
      <div className="rounded-[var(--j-radius)] border border-dashed border-j-console-line px-5 py-12 text-center">
        <p className="text-[13px] font-semibold text-j-console-ink-2">No tools have fired yet</p>
        <p className="mx-auto mt-1 max-w-[46ch] text-[12px] leading-relaxed text-j-console-ink-2/70">
          Run a scenario and every tool call lands here in order, with the arguments that went in
          and the result that came back.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--j-radius)] border border-j-console-line bg-j-console-2">
      <div className="flex items-center gap-3 border-b border-j-console-line px-3.5 py-2.5">
        <h3 className="text-[13.5px] font-semibold text-j-console-ink">Tool calls, in order</h3>
        <span className="num j-mono ml-auto text-[11px] text-j-console-ink-2/70">
          {calls.length} calls
        </span>
      </div>
      <ol className="divide-y divide-j-console-line/70">
        {calls.map((call) => {
          const def = AGENT_BY_ID[call.agentId];
          const meta = def?.tools.find((t) => t.name === call.toolName);
          const open = openId === call.callId;
          const tone = levelTone(call.level);
          return (
            <li key={call.callId}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : call.callId)}
                aria-expanded={open}
                className={cn(
                  "flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors",
                  "hover:bg-j-console-3/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-j-primary-bright",
                  open && "bg-j-console-3/70",
                )}
              >
                <span className="num j-mono w-7 shrink-0 pt-[3px] text-[11px] text-j-console-ink-2/50">
                  {String(call.ordinal).padStart(2, "0")}
                </span>
                <span
                  className="j-mono w-10 shrink-0 pt-[3px] text-[11px] font-bold"
                  style={{ color: def?.accent }}
                >
                  {call.agentId}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="j-mono text-[12.5px] font-semibold text-j-console-ink">
                      {call.toolName}
                    </span>
                    {meta ? (
                      <span className="text-[11.5px] text-j-console-ink-2/70">{meta.label}</span>
                    ) : null}
                    {!call.settled ? (
                      <Badge tone="neutral" surface="console" size="xs">
                        no result returned
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-j-console-ink-2">
                    {call.resultMessage ?? call.message}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 pt-[2px]">
                  <span className="num j-mono text-[11px] text-j-console-ink-2/60">
                    {formatOffset(call.atMs)}
                  </span>
                  {call.durationMs !== undefined ? (
                    <span className="num j-mono text-[10.5px] text-j-console-ink-2/45">
                      {formatDuration(call.durationMs)}
                    </span>
                  ) : null}
                </span>
                <ChevronRight
                  className={cn(
                    "mt-[3px] h-3.5 w-3.5 shrink-0 text-j-console-ink-2/50 transition-transform",
                    open && "rotate-90",
                  )}
                  aria-hidden="true"
                />
              </button>

              {open ? (
                <div className="j-rise border-t border-j-console-line/60 bg-j-console px-3.5 py-3">
                  {meta ? (
                    <p className="mb-3 max-w-[70ch] text-[12px] leading-relaxed text-j-console-ink-2">
                      {meta.description}
                    </p>
                  ) : null}
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <h4 className={cn(EYEBROW, "mb-1.5 text-j-console-ink-2/60")}>Arguments</h4>
                      {call.args ? (
                        <pre className="j-scroll j-mono max-h-64 overflow-auto rounded-lg border border-j-console-line bg-j-console-2 p-3 text-[11.5px] leading-relaxed text-j-console-ink-2">
                          {formatPayload(call.args)}
                        </pre>
                      ) : (
                        <p className="text-[11.5px] text-j-console-ink-2/60">
                          Called with no arguments.
                        </p>
                      )}
                    </div>
                    <div>
                      <h4 className={cn(EYEBROW, "mb-1.5 text-j-console-ink-2/60")}>Result</h4>
                      {call.result ? (
                        <pre
                          className={cn(
                            "j-scroll j-mono max-h-64 overflow-auto rounded-lg border p-3 text-[11.5px] leading-relaxed text-j-console-ink-2",
                            tone === "warn"
                              ? "border-j-warn/40 bg-j-warn/[0.07]"
                              : tone === "danger"
                                ? "border-j-danger/40 bg-j-danger/[0.07]"
                                : "border-j-console-line bg-j-console-2",
                          )}
                        >
                          {formatPayload(call.result)}
                        </pre>
                      ) : (
                        <p className="text-[11.5px] text-j-console-ink-2/60">
                          This call settled without a separate result beat.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

type OpsTab = "roster" | "trace" | "tools";

export function AgentOps() {
  const [tab, setTab] = useState<OpsTab>("roster");
  const trace = useAgentStore((s) => s.trace);
  const toolCount = useMemo(() => trace.filter((e) => e.kind === "tool-call").length, [trace]);

  return (
    <div className="min-h-full bg-j-console pb-14 text-j-console-ink">
      <PageHeader
        surface="console"
        breadcrumbs={[{ label: "Command Centre", href: "#/" }, { label: "Agent ops" }]}
        eyebrow="Inspector"
        title="Agent Ops"
        subtitle="Everything the command centre summarises, written out in full: who is on the team, what each of them may call, what none of them will do, and exactly what happened this session."
        actions={
          <a
            href="#/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-j-console-line px-3 text-[13px] font-semibold text-j-console-ink transition-colors hover:border-j-primary/50 hover:text-j-primary-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Command centre
          </a>
        }
      />

      <div className={cn("sticky top-0 z-20 bg-j-console/95 py-3 backdrop-blur", GUTTER)}>
        <Transport />
      </div>

      <div className={cn(GUTTER, "space-y-7")}>
        <PendingApprovals />
        <SessionMetrics />

        <section aria-label="Agent mesh" className="space-y-2.5">
          <h2 className={cn(EYEBROW, "text-j-console-ink-2/70")}>The mesh</h2>
          <AgentMesh size="full" />
        </section>

        <DecisionLog />

        <section aria-label="Inspector">
          <Tabs
            label="Agent inspector"
            surface="console"
            value={tab}
            onChange={setTab}
            className="mb-4"
            items={[
              { id: "roster", label: "Roster", count: AGENTS.length },
              { id: "trace", label: "Trace log", count: trace.length },
              { id: "tools", label: "Tool calls", count: toolCount },
            ]}
          />
          {tab === "roster" ? <Roster /> : null}
          {tab === "trace" ? <TraceLog /> : null}
          {tab === "tools" ? <ToolInspector /> : null}
        </section>
      </div>
    </div>
  );
}
