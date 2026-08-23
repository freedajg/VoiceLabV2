import { useMemo } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, ShieldCheck, Wrench } from "lucide-react";
import { cn } from "../ui/cn";
import {
  AGENT_STATE_LABEL,
  AgentChip,
  Badge,
  Button,
  Drawer,
  EYEBROW,
  agentStateTone,
  toneClasses,
} from "../ui";
import { useUiStore } from "../store/uiStore";
import { useAgentStore } from "../store/agentStore";
import { AGENT_BY_ID } from "../agents/registry";
import { LANE_LABEL } from "../ui/tokens";
import type { AgentDef, AgentId } from "../contracts/agents";

function Block({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-j-console-line px-4 py-4 first:border-t-0">
      <h3 className={cn(EYEBROW, "mb-2.5 flex items-center gap-1.5 text-j-console-ink-2/70")}>
        {icon ? <span className="[&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">{icon}</span> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Agent inspector. Opened by any `AgentChip` anywhere in the app, which is how
 * a viewer gets from a number on a P&L to the agent that produced it.
 */
export function AgentDetailDrawer() {
  const inspectedAgentId = useUiStore((s) => s.inspectedAgentId);
  const inspectAgent = useUiStore((s) => s.inspectAgent);
  const states = useAgentStore((s) => s.states);
  const trace = useAgentStore((s) => s.trace);
  const lastMessage = useAgentStore((s) => s.lastMessage);

  const def: AgentDef | undefined = inspectedAgentId
    ? (AGENT_BY_ID[inspectedAgentId] as AgentDef | undefined)
    : undefined;

  const recent = useMemo(
    () => (inspectedAgentId ? trace.filter((e) => e.agentId === inspectedAgentId).slice(-12) : []),
    [trace, inspectedAgentId],
  );

  const state = inspectedAgentId ? (states[inspectedAgentId] ?? "idle") : "idle";
  const tone = agentStateTone(state);

  return (
    <Drawer
      open={Boolean(inspectedAgentId)}
      onClose={() => inspectAgent(null)}
      surface="console"
      side="right"
      width="w-full sm:w-[24rem]"
      title={def?.codename ?? inspectedAgentId ?? "Agent"}
      subtitle={def ? `${def.name} · ${LANE_LABEL[def.lane]}` : undefined}
      headerActions={
        <Badge tone={tone} surface="console" size="xs" dot>
          {AGENT_STATE_LABEL[state]}
        </Badge>
      }
      footer={
        inspectedAgentId ? (
          <Button
            surface="console"
            variant="soft"
            tone="primary"
            size="sm"
            block
            iconRight={<ArrowUpRight />}
            onClick={() => {
              inspectAgent(null);
              window.location.hash = `#/agents/${inspectedAgentId}`;
            }}
          >
            Open full agent view
          </Button>
        ) : null
      }
    >
      {!def ? (
        <div className="px-4 py-6 text-[13px] text-j-console-ink-2">
          No definition registered for <span className="j-mono">{inspectedAgentId}</span>.
        </div>
      ) : (
        <>
          <Block title="What it does">
            <p className="text-[13px] leading-relaxed text-j-console-ink-2">{def.blurb}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge surface="console" size="xs" mono>
                {def.id}
              </Badge>
              <Badge surface="console" size="xs" tone={def.phase === "V1" ? "success" : "neutral"}>
                {def.phase}
              </Badge>
            </div>
            {lastMessage[def.id] ? (
              <p className="mt-3 border-l-2 border-j-primary/60 pl-3 text-[13px] italic leading-relaxed text-j-console-ink">
                “{lastMessage[def.id]}”
              </p>
            ) : null}
          </Block>

          <Block title="Tools" icon={<Wrench />}>
            {def.tools.length === 0 ? (
              <p className="text-[13px] text-j-console-ink-2/70">No tools — reasoning only.</p>
            ) : (
              <ul className="space-y-2.5">
                {def.tools.map((tool) => (
                  <li key={tool.name}>
                    <p className="j-mono text-[12px] font-semibold text-j-console-ink">{tool.name}</p>
                    <p className="text-[12px] leading-snug text-j-console-ink-2">{tool.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Guardrails" icon={<ShieldCheck />}>
            <ul className="space-y-1.5">
              {def.guardrails.map((rule) => (
                <li key={rule} className="flex gap-2 text-[12px] leading-snug text-j-console-ink-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-j-warn" aria-hidden="true" />
                  {rule}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Hands off to">
            {def.handsOffTo.length === 0 ? (
              <p className="text-[13px] text-j-console-ink-2/70">Terminal — reports back to the orchestrator.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {def.handsOffTo.map((id: AgentId) => (
                  <AgentChip key={id} id={id} surface="console" size="xs" />
                ))}
              </div>
            )}
          </Block>

          <Block title="BRD coverage">
            <div className="flex flex-wrap gap-1.5">
              {def.brdRefs.map((ref) => (
                <Badge key={ref} surface="console" size="xs" mono tone="accent">
                  {ref}
                </Badge>
              ))}
            </div>
          </Block>

          <Block title="Recent trace">
            {recent.length === 0 ? (
              <p className="j-mono text-[12px] text-j-console-ink-2/60">nothing yet this session</p>
            ) : (
              <ol className="j-mono space-y-1.5 text-[11px] leading-snug">
                {recent.map((e) => {
                  const t = toneClasses(
                    e.level === "error" ? "danger" : e.level === "warn" ? "warn" : e.level === "success" ? "success" : "neutral",
                    "console",
                  );
                  return (
                    <li key={e.id} className="flex gap-2">
                      <span className="shrink-0 tabular-nums text-j-console-ink-2/50">
                        {(e.atMs / 1000).toFixed(1)}s
                      </span>
                      <span className={cn("min-w-0 flex-1", t.text)}>{e.message}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Block>
        </>
      )}
    </Drawer>
  );
}
