import { useMemo } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { chrome, EYEBROW, type Surface } from "./tokens";
import { useUiStore } from "../store/uiStore";

/**
 * Chart theming for the recharts panels in admin and the command centre.
 *
 * Recharts writes colours into SVG *presentation attributes*, where `var(--x)`
 * does not resolve — so the token values are read off the document once per
 * brand and handed over as concrete `rgb()` strings. Nothing here invents a
 * colour: every value comes from the same `--j-*` tokens as the rest of the UI.
 *
 * Series order is fixed and validated for colour-vision deficiency against both
 * brand palettes and both surfaces (see the report in this slice's handover):
 *
 *   product : primary -> lane-back -> gold -> lane-otc   (4 slots)
 *   console : primary -> lane-back -> lane-otc           (3 slots)
 *
 * A fifth/fourth series does not get a generated hue — it folds into "Other"
 * (ink-3) or the view becomes small multiples. Gold sits below 3:1 against
 * white, so any chart using slot 3 must also carry direct labels or a table
 * view; never colour alone.
 */

const PRODUCT_SERIES_VARS = ["--j-primary", "--j-lane-back", "--j-gold", "--j-lane-otc"] as const;
const CONSOLE_SERIES_VARS = ["--j-primary", "--j-lane-back", "--j-lane-otc"] as const;

export interface ChartTheme {
  /** Fixed categorical order. Index by series identity, never by rank. */
  series: string[];
  /** Neutral "Other" slot. */
  other: string;
  /** Single-hue magnitude ramp, light to dark. */
  sequential: string[];
  /** Two poles plus a neutral midpoint, for profit/loss style measures. */
  diverging: { negative: string; mid: string; positive: string };
  status: { success: string; warn: string; danger: string; info: string };
  grid: string;
  axis: string;
  /** Text tokens — labels never wear the series colour. */
  ink: string;
  ink2: string;
  surface: string;
  panel: string;
}

function readVar(name: string, fallback = "0 0 0"): string {
  if (typeof window === "undefined") return `rgb(${fallback})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `rgb(${raw || fallback})`;
}

function readVarAlpha(name: string, alpha: number, fallback = "0 0 0"): string {
  if (typeof window === "undefined") return `rgb(${fallback} / ${alpha})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `rgb(${raw || fallback} / ${alpha})`;
}

/** Resolved chart tokens for the current brand and surface. */
export function useChartTheme(surface: Surface = "product"): ChartTheme {
  const brand = useUiStore((s) => s.brand);

  return useMemo(() => {
    const isConsole = surface === "console";
    const seriesVars = isConsole ? CONSOLE_SERIES_VARS : PRODUCT_SERIES_VARS;
    return {
      series: seriesVars.map((v) => readVar(v)),
      other: readVar(isConsole ? "--j-console-ink-2" : "--j-ink-3"),
      sequential: [
        readVarAlpha("--j-primary", 0.18),
        readVarAlpha("--j-primary", 0.38),
        readVarAlpha("--j-primary", 0.62),
        readVarAlpha("--j-primary", 0.82),
        readVar("--j-primary"),
      ],
      diverging: {
        negative: readVar("--j-danger"),
        mid: readVar(isConsole ? "--j-console-line" : "--j-line-strong"),
        positive: readVar("--j-success"),
      },
      status: {
        success: readVar("--j-success"),
        warn: readVar("--j-warn"),
        danger: readVar("--j-danger"),
        info: readVar("--j-info"),
      },
      grid: readVarAlpha(isConsole ? "--j-console-line" : "--j-line", isConsole ? 0.8 : 1),
      axis: readVar(isConsole ? "--j-console-ink-2" : "--j-ink-3"),
      ink: readVar(isConsole ? "--j-console-ink" : "--j-ink"),
      ink2: readVar(isConsole ? "--j-console-ink-2" : "--j-ink-2"),
      surface: readVar(isConsole ? "--j-console-2" : "--j-surface"),
      panel: readVar(isConsole ? "--j-console" : "--j-surface-2"),
      // `brand` is the dependency that makes this re-resolve on the
      // white-label toggle; it is intentionally unused in the body.
    } satisfies ChartTheme;
  }, [surface, brand]);
}

/** Recharts prop bundles so every chart in the app shares one look. */
export function chartAxisProps(theme: ChartTheme) {
  return {
    stroke: theme.axis,
    tick: { fill: theme.axis, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const;
}

export function chartGridProps(theme: ChartTheme) {
  return {
    stroke: theme.grid,
    strokeDasharray: undefined,
    vertical: false,
  } as const;
}

export interface ChartTooltipRow {
  label: string;
  value: string;
  color?: string;
}

export interface ChartTooltipProps {
  title?: ReactNode;
  rows: ChartTooltipRow[];
  surface?: Surface;
  className?: string;
}

/**
 * Tooltip body. Pass this as recharts' `content` via a small adapter in the
 * feature, so the numbers stay formatted by `domain/format.ts`.
 */
export function ChartTooltip({ title, rows, surface = "product", className }: ChartTooltipProps) {
  const c = chrome(surface);
  return (
    <div
      className={cn(
        "min-w-[9rem] rounded-lg border px-3 py-2 shadow-lg",
        surface === "console"
          ? "border-j-console-line bg-j-console-2 text-j-console-ink"
          : "border-j-line bg-j-surface text-j-ink",
        className,
      )}
    >
      {title ? <p className={cn(EYEBROW, c.ink3, "mb-1.5")}>{title}</p> : null}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              {row.color ? (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}
              <span className={cn("truncate", c.ink2)}>{row.label}</span>
            </span>
            <span className={cn("num shrink-0 font-semibold tabular-nums", c.ink)}>{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ChartLegendItem {
  label: string;
  color: string;
}

/** Legend. Always rendered for two or more series — identity is never colour alone. */
export function ChartLegend({
  items,
  surface = "product",
  className,
}: {
  items: ChartLegendItem[];
  surface?: Surface;
  className?: string;
}) {
  const c = chrome(surface);
  if (items.length < 2) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.label} className={cn("flex items-center gap-1.5 text-xs", c.ink2)}>
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface ChartFrameProps {
  title?: ReactNode;
  /** Rendered under the plot — always give charts a legend or a table link. */
  legend?: ReactNode;
  /** Plot height in px. Charts fill their container's width. */
  height?: number;
  surface?: Surface;
  children: ReactNode;
  className?: string;
}

/** Consistent plot box: fixed height, fluid width, legend below. */
export function ChartFrame({
  title,
  legend,
  height = 240,
  surface = "product",
  children,
  className,
}: ChartFrameProps) {
  const c = chrome(surface);
  return (
    <figure className={cn("min-w-0", className)}>
      {title ? (
        <figcaption className={cn("mb-3 text-[13px] font-semibold", c.ink)}>{title}</figcaption>
      ) : null}
      <div className="w-full" style={{ height }}>
        {children}
      </div>
      {legend ? <div className="mt-3">{legend}</div> : null}
    </figure>
  );
}
