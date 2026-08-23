import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { chrome, focusRing, type Surface } from "./tokens";
import { useUiStore } from "../store/uiStore";
import { AGENT_BY_ID } from "../agents/registry";
import type { AgentDef, AgentId, AgentState } from "../contracts/agents";
import { agentStateIsLive } from "./tokens";

export type AgentChipSize = "xs" | "sm" | "md";

const SIZES: Record<AgentChipSize, string> = {
  xs: "h-6 gap-1.5 pl-1.5 pr-2 text-[11px] rounded-md",
  sm: "h-7 gap-2 pl-2 pr-2.5 text-xs rounded-lg",
  md: "h-9 gap-2 pl-2.5 pr-3 text-[13px] rounded-lg",
};

const DOTS: Record<AgentChipSize, string> = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
};

export interface AgentChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "id" | "onClick" | "onSelect"> {
  id: AgentId;
  size?: AgentChipSize;
  surface?: Surface;
  /** Append the full role title after the codename. */
  showRole?: boolean;
  /** Show the raw agent id in mono instead of the codename. */
  mono?: boolean;
  /** Live state — draws the breathing halo while the agent is working. */
  state?: AgentState;
  /** Replaces the default "open the inspector" behaviour. */
  onSelect?: (id: AgentId) => void;
}

/**
 * The provenance glue.
 *
 * Every panel, row and figure an agent produced carries one of these. Clicking
 * it opens that agent's detail drawer, so a viewer can point at any number on
 * screen and get to the agent that made it in one tap.
 */
export function AgentChip({
  id,
  size = "sm",
  surface = "product",
  showRole = false,
  mono = false,
  state,
  onSelect,
  className,
  ...rest
}: AgentChipProps) {
  const inspectAgent = useUiStore((s) => s.inspectAgent);
  const def = AGENT_BY_ID[id] as AgentDef | undefined;
  const c = chrome(surface);
  const codename = def?.codename ?? id;
  const live = state !== undefined && agentStateIsLive(state);

  return (
    <button
      type="button"
      onClick={() => (onSelect ? onSelect(id) : inspectAgent(id))}
      title={def ? `${def.codename} — ${def.name}` : id}
      className={cn(
        "inline-flex max-w-full items-center border font-semibold transition-colors duration-150",
        SIZES[size],
        surface === "console"
          ? "border-j-console-line bg-j-console-3/70 text-j-console-ink hover:bg-j-console-3"
          : "border-j-line bg-j-surface-2 text-j-ink-2 hover:border-j-line-strong hover:text-j-ink",
        focusRing(surface),
        className,
      )}
      {...rest}
    >
      <span className={cn("relative inline-flex shrink-0", DOTS[size])} aria-hidden="true">
        {live ? (
          <span
            className="j-pulse-ring absolute inset-0 rounded-full"
            style={{ backgroundColor: def?.accent }}
          />
        ) : null}
        <span
          className="relative inline-block h-full w-full rounded-full"
          style={{ backgroundColor: def?.accent }}
        />
      </span>
      <span className={cn("truncate", mono && "j-mono tracking-tight")}>
        {mono ? id : codename}
      </span>
      {showRole && def ? (
        <span className={cn("truncate font-normal", c.ink3)}>· {def.name}</span>
      ) : null}
    </button>
  );
}

export interface AgentDotProps {
  id: AgentId;
  state?: AgentState;
  size?: "sm" | "md";
  className?: string;
}

/** Just the accent dot — for dense table rows where a chip is too heavy. */
export function AgentDot({ id, state, size = "sm", className }: AgentDotProps) {
  const def = AGENT_BY_ID[id] as AgentDef | undefined;
  const live = state !== undefined && agentStateIsLive(state);
  return (
    <span
      className={cn("relative inline-flex", size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5", className)}
      aria-hidden="true"
    >
      {live ? (
        <span
          className="j-pulse-ring absolute inset-0 rounded-full"
          style={{ backgroundColor: def?.accent }}
        />
      ) : null}
      <span
        className="relative inline-block h-full w-full rounded-full"
        style={{ backgroundColor: def?.accent }}
      />
    </span>
  );
}
