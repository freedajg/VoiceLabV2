/**
 * Agent detail — route `#/agents/:agentId`.
 *
 * One agent, in full. The BRD block is the point of this page: it is the proof
 * that the twelve agents were not invented for the demo — every one of them
 * traces back to a numbered line the client wrote down.
 */
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "../../ui/cn";
import {
  AGENT_STATE_LABEL,
  Badge,
  EYEBROW,
  GUTTER,
  LANE_LABEL,
  PageHeader,
  agentStateIsLive,
  agentStateTone,
} from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { AGENTS, AGENT_BY_ID, AGENT_IDS } from "../../agents/registry";
import type { AgentDef, AgentId } from "../../contracts/agents";
import { TraceConsole } from "../command/TraceConsole";
import { brdTitle } from "../command/lib";

const isAgentId = (value: string | undefined): value is AgentId =>
  value !== undefined && (AGENT_IDS as string[]).includes(value);

/* ── Panels ────────────────────────────────────────────────────────────── */

function Panel({
  title,
  icon,
  count,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--j-radius)] border border-j-console-line bg-j-console-2 p-4 sm:p-5",
        className,
      )}
    >
      <h2 className={cn(EYEBROW, "mb-3 flex items-center gap-1.5 text-j-console-ink-2/70")}>
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">
          {icon}
        </span>
        {title}
        {count !== undefined ? (
          <span className="num j-mono text-j-console-ink-2/50">· {count}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function AgentLink({ id }: { id: AgentId }) {
  const def = AGENT_BY_ID[id];
  if (!def) return null;
  return (
    <a
      href={`#/agents/${id}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-j-console-line bg-j-console px-2.5 py-1.5 text-[12.5px] font-semibold text-j-console-ink transition-colors hover:border-j-console-ink-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: def.accent }}
      />
      {def.codename}
      <span className="j-mono text-[10px] text-j-console-ink-2/70">{def.id}</span>
    </a>
  );
}

function UnknownAgent({ requested }: { requested?: string }) {
  return (
    <div className="min-h-full bg-j-console pb-14 text-j-console-ink">
      <PageHeader
        surface="console"
        breadcrumbs={[
          { label: "Command Centre", href: "#/" },
          { label: "Agent ops", href: "#/agents" },
          { label: "Not found" },
        ]}
        eyebrow="Unknown agent"
        title="No agent by that name"
        subtitle={
          requested
            ? `Nothing in the roster answers to “${requested}”. The twelve agents that do are below.`
            : "The roster has twelve agents. Pick one below."
        }
        actions={
          <a
            href="#/agents"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-j-console-line px-3 text-[13px] font-semibold text-j-console-ink transition-colors hover:border-j-primary/50 hover:text-j-primary-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Agent ops
          </a>
        }
      />
      <div className={cn(GUTTER, "pt-6")}>
        <div className="flex flex-wrap gap-2">
          {AGENTS.map((def) => (
            <AgentLink key={def.id} id={def.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── The page ──────────────────────────────────────────────────────────── */

function Detail({ def }: { def: AgentDef }) {
  const state = useAgentStore((s) => s.states[def.id] ?? "idle");
  const invocations = useAgentStore((s) => s.invocations[def.id] ?? 0);
  const lastMessage = useAgentStore((s) => s.lastMessage[def.id]);
  const trace = useAgentStore((s) => s.trace);

  const mine = useMemo(
    () => trace.filter((e) => e.agentId === def.id).slice(-40),
    [trace, def.id],
  );
  const inbound = useMemo(
    () => AGENTS.filter((a) => a.handsOffTo.includes(def.id)).map((a) => a.id),
    [def.id],
  );

  const live = agentStateIsLive(state);

  return (
    <div className="min-h-full bg-j-console pb-14 text-j-console-ink">
      <PageHeader
        surface="console"
        breadcrumbs={[
          { label: "Command Centre", href: "#/" },
          { label: "Agent ops", href: "#/agents" },
          { label: def.codename },
        ]}
        eyebrow={`${LANE_LABEL[def.lane]} · ${def.id}`}
        title={def.codename}
        subtitle={def.name}
        actions={
          <>
            <Badge tone={agentStateTone(state)} surface="console" size="sm" dot>
              {AGENT_STATE_LABEL[state]}
            </Badge>
            <a
              href="#/agents"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-j-console-line px-3 text-[13px] font-semibold text-j-console-ink transition-colors hover:border-j-primary/50 hover:text-j-primary-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary-bright"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All agents
            </a>
          </>
        }
      />

      <div className={cn(GUTTER, "space-y-6 pt-6")}>
        {/* Brief */}
        <section className="relative overflow-hidden rounded-[var(--j-radius)] border border-j-console-line bg-j-console-2 p-5 pl-6 sm:p-6 sm:pl-8">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5"
            style={{ backgroundColor: def.accent }}
          />
          <p className="max-w-[68ch] text-balance text-[16px] leading-relaxed text-j-console-ink sm:text-[17px]">
            {def.blurb}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-j-console-ink-2">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: def.accent }}
              />
              {LANE_LABEL[def.lane]}
            </span>
            <span className="num j-mono">{invocations}× this session</span>
            <span className="j-mono">phase {def.phase}</span>
            <span className="num j-mono">{def.tools.length} tools</span>
            <span className="num j-mono">{def.guardrails.length} guardrails</span>
          </div>
          {live && lastMessage ? (
            <p className="mt-4 rounded-lg border-l-2 border-j-primary/60 bg-j-console py-2 pl-3 pr-3 text-[13px] leading-relaxed text-j-console-ink-2">
              {lastMessage}
            </p>
          ) : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* BRD — the proof */}
          <Panel
            title="What the client asked for"
            icon={<ClipboardCheck />}
            count={def.brdRefs.length}
            className="lg:col-span-2"
          >
            <ul className="grid gap-2 sm:grid-cols-2">
              {def.brdRefs.map((ref) => (
                <li
                  key={ref}
                  className="flex items-start gap-3 rounded-lg border border-j-console-line bg-j-console px-3 py-2.5"
                >
                  <span className="j-mono mt-px shrink-0 rounded bg-j-primary/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-j-primary-bright">
                    {ref}
                  </span>
                  <span className="text-[12.5px] leading-snug text-j-console-ink-2">
                    {brdTitle(ref)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-j-console-ink-2/60">
              Requirement numbers are BRD v1.0, sections 7 and 8.
            </p>
          </Panel>

          {/* Tools */}
          <Panel title="Tools it may call" icon={<Wrench />} count={def.tools.length}>
            <ul className="divide-y divide-j-console-line/70">
              {def.tools.map((tool) => (
                <li key={tool.name} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="j-mono text-[12.5px] font-semibold text-j-console-ink">
                      {tool.name}
                    </span>
                    <span className="text-[12px] text-j-console-ink-2/70">{tool.label}</span>
                  </div>
                  <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-j-console-ink-2">
                    {tool.description}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Guardrails */}
          <Panel
            title="Rules it will not break"
            icon={<ShieldCheck />}
            count={def.guardrails.length}
          >
            <ul className="space-y-2.5">
              {def.guardrails.map((rule) => (
                <li key={rule} className="flex gap-2.5">
                  <ShieldCheck
                    className="mt-[3px] h-3.5 w-3.5 shrink-0 text-j-success"
                    aria-hidden="true"
                  />
                  <span className="max-w-[62ch] text-[12.5px] leading-relaxed text-j-console-ink-2">
                    {rule}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Handoffs */}
          <Panel title="Who it works with" icon={<ArrowRight />} className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className={cn(EYEBROW, "mb-2 text-j-console-ink-2/60")}>
                  Hands work to · {def.handsOffTo.length}
                </h3>
                {def.handsOffTo.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {def.handsOffTo.map((id) => (
                      <AgentLink key={id} id={id} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-j-console-ink-2/70">
                    Nothing — {def.codename} is where the chain ends.
                  </p>
                )}
              </div>
              <div>
                <h3 className={cn(EYEBROW, "mb-2 text-j-console-ink-2/60")}>
                  Takes work from · {inbound.length}
                </h3>
                {inbound.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {inbound.map((id) => (
                      <AgentLink key={id} id={id} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-j-console-ink-2/70">
                    Nothing — jobs start here.
                  </p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <TraceConsole
          events={mine}
          title={`${def.codename} — recent activity`}
          eyebrow={`${mine.length} of this agent's entries`}
          bodyClassName="h-[360px]"
          emptyTitle={`${def.codename} has not been called yet`}
          emptyHint="Run a scenario from the command centre, or use the storefront — real actions trace too."
        />
      </div>
    </div>
  );
}

export function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  if (!isAgentId(agentId)) return <UnknownAgent requested={agentId} />;
  const def = AGENT_BY_ID[agentId];
  if (!def) return <UnknownAgent requested={agentId} />;
  return <Detail key={def.id} def={def} />;
}
