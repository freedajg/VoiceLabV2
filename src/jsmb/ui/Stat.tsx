import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "./cn";
import { chrome, EYEBROW, toneClasses, type Surface, type Tone } from "./tokens";
import { Sparkline } from "./Sparkline";
import { AgentChip } from "./AgentChip";
import type { AgentId } from "../contracts/agents";

export type StatSize = "sm" | "md" | "lg" | "hero";

export interface StatDelta {
  /** Pre-formatted, e.g. "+12.4%" or "-₹18,400". */
  value: string;
  direction: "up" | "down" | "flat";
  /** Whether "up" is the good direction. Dues going up is bad. */
  upIsGood?: boolean;
  /** Names the comparison — "vs last month". Never a bare percentage. */
  since?: string;
}

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Small trailing unit: "t", "bundles", "orders". */
  unit?: ReactNode;
  delta?: StatDelta;
  /** Quiet supporting line under the value. */
  hint?: ReactNode;
  /** 8–14 points; renders a sparkline beside the figure. */
  trend?: number[];
  trendLabel?: string;
  tone?: Tone;
  surface?: Surface;
  size?: StatSize;
  icon?: ReactNode;
  /** Provenance stamp — which agent produced this number. */
  agentId?: AgentId;
  className?: string;
}

const VALUE_SIZE: Record<StatSize, string> = {
  sm: "text-xl",
  md: "text-[26px] sm:text-[28px]",
  lg: "text-[32px] sm:text-[38px]",
  hero: "text-[42px] sm:text-[56px]",
};

/**
 * A figure with its label. Big honest numbers are the point of this app — a
 * prospect spot-checks them, so the value is the loudest thing in the tile and
 * everything around it stays quiet.
 *
 * Large values use proportional figures; only columns of numbers get
 * `tabular-nums` (that is the `.num` class on Table cells).
 */
export function Stat({
  label,
  value,
  unit,
  delta,
  hint,
  trend,
  trendLabel,
  tone = "neutral",
  surface = "product",
  size = "md",
  icon,
  agentId,
  className,
}: StatProps) {
  const c = chrome(surface);
  const t = toneClasses(tone, surface);

  const deltaTone: Tone =
    !delta || delta.direction === "flat"
      ? "neutral"
      : (delta.direction === "up") === (delta.upIsGood ?? true)
        ? "success"
        : "danger";
  const dt = toneClasses(deltaTone, surface);
  const DeltaIcon =
    delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md [&>svg]:h-3.5 [&>svg]:w-3.5",
                t.soft,
                "hover:bg-inherit",
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <span className={cn(EYEBROW, c.ink3, "truncate")}>{label}</span>
        </div>
        {agentId ? <AgentChip id={agentId} surface={surface} size="xs" /> : null}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={cn(
              "truncate font-semibold leading-none tracking-[-0.02em]",
              VALUE_SIZE[size],
              tone === "neutral" ? c.ink : t.text,
            )}
          >
            {value}
          </span>
          {unit ? (
            <span className={cn("shrink-0 text-sm font-medium", c.ink3)}>{unit}</span>
          ) : null}
        </div>
        {trend && trend.length > 1 ? (
          <Sparkline
            values={trend}
            tone={tone === "neutral" ? "primary" : tone}
            surface={surface}
            width={size === "sm" ? 64 : 88}
            height={size === "sm" ? 22 : 28}
            ariaLabel={trendLabel ?? `Trend for ${typeof label === "string" ? label : "this figure"}`}
          />
        ) : null}
      </div>

      {delta || hint ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta ? (
            <span className={cn("inline-flex items-center gap-1 text-[13px] font-semibold", dt.text)}>
              <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="num tabular-nums">{delta.value}</span>
            </span>
          ) : null}
          {delta?.since ? <span className={cn("text-xs", c.ink3)}>{delta.since}</span> : null}
          {hint ? <span className={cn("text-xs", c.ink3)}>{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export interface StatGridProps {
  children: ReactNode;
  /** Columns at >=sm. Mobile is always a single column. */
  columns?: 2 | 3 | 4;
  surface?: Surface;
  className?: string;
}

/** Divided row of Stats — the dashboard KPI strip. */
export function StatGrid({ children, columns = 4, surface = "product", className }: StatGridProps) {
  const c = chrome(surface);
  const cols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-[var(--j-radius)] border",
        c.line,
        surface === "console" ? "bg-j-console-line" : "bg-j-line",
        cols,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Cell wrapper for StatGrid — gives each tile the panel background. */
export function StatCell({
  surface = "product",
  className,
  children,
}: {
  surface?: Surface;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(chrome(surface).panel, "p-4 sm:p-5", className)}>{children}</div>
  );
}
