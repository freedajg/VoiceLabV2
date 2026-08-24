import { useMemo } from "react";
import { cn } from "./cn";
import { toneClasses, type Surface, type Tone } from "./tokens";

export interface SparklineProps {
  /** Oldest first. Fewer than two points renders nothing. */
  values: number[];
  tone?: Tone;
  surface?: Surface;
  width?: number;
  height?: number;
  /** 10% wash under the line — the default; turn off inside dense tables. */
  area?: boolean;
  /** Emphasised dot on the last point, ringed in the surface colour. */
  endPoint?: boolean;
  /** Baseline at y=0 when the series crosses zero (P&L, margin deltas). */
  zeroLine?: boolean;
  /** Required: describes the trend for screen readers. */
  ariaLabel: string;
  className?: string;
}

/**
 * Twelve-point trend line beside a figure. Hand-rolled inline SVG rather than a
 * chart library: a sparkline has no axes, no tooltip and no legend, and recharts
 * would cost a mount per stat tile.
 *
 * Mark specs follow the house chart rules: 2px round-capped stroke, ~10% area
 * wash, a >=8px end marker carrying a 2px surface ring so it stays legible where
 * it crosses the line.
 */
export function Sparkline({
  values,
  tone = "primary",
  surface = "product",
  width = 96,
  height = 28,
  area = true,
  endPoint = true,
  zeroLine = false,
  ariaLabel,
  className,
}: SparklineProps) {
  const geometry = useMemo(() => {
    if (values.length < 2) return null;
    const pad = 3;
    const min = Math.min(...values, zeroLine ? 0 : Infinity);
    const max = Math.max(...values, zeroLine ? 0 : -Infinity);
    const span = max - min || 1;
    const innerH = height - pad * 2;
    const innerW = width - pad * 2;
    const x = (i: number): number => pad + (i / (values.length - 1)) * innerW;
    const y = (v: number): number => pad + innerH - ((v - min) / span) * innerH;

    const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
    const fill = `${line} L${x(values.length - 1).toFixed(2)},${(height - pad).toFixed(2)} L${x(0).toFixed(2)},${(height - pad).toFixed(2)} Z`;

    return {
      line,
      fill,
      lastX: x(values.length - 1),
      lastY: y(values[values.length - 1]),
      zeroY: y(0),
      showZero: zeroLine && min < 0 && max > 0,
    };
  }, [values, width, height, zeroLine]);

  if (!geometry) return null;

  const t = toneClasses(tone, surface);
  const ringClass = surface === "console" ? "stroke-j-console-2" : "stroke-j-surface";
  const gridClass = surface === "console" ? "stroke-j-console-line" : "stroke-j-line";

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("shrink-0 overflow-visible", t.text, className)}
    >
      {geometry.showZero ? (
        <line
          x1={0}
          x2={width}
          y1={geometry.zeroY}
          y2={geometry.zeroY}
          className={gridClass}
          strokeWidth={1}
        />
      ) : null}
      {area ? <path d={geometry.fill} fill="currentColor" opacity={0.1} /> : null}
      <path
        d={geometry.line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {endPoint ? (
        <>
          <circle
            cx={geometry.lastX}
            cy={geometry.lastY}
            r={4}
            fill="currentColor"
            className={ringClass}
            strokeWidth={2}
          />
        </>
      ) : null}
    </svg>
  );
}
