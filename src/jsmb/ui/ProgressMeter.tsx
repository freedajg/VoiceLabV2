import type { ReactNode } from "react";
import { cn } from "./cn";
import { chrome, EYEBROW, toneClasses, type Surface, type Tone } from "./tokens";

export interface ProgressMeterProps {
  value: number;
  max: number;
  /** Caller shifts this as the cap approaches — see `capStatus` in domain. */
  tone?: Tone;
  surface?: Surface;
  size?: "sm" | "md" | "lg";
  label?: ReactNode;
  /** Right-hand read-out, e.g. "12.5 t of 20 t". */
  valueLabel?: ReactNode;
  /** Quiet line under the bar — headroom, the rule being enforced. */
  hint?: ReactNode;
  /** Spoken value; defaults to "<value> of <max>". */
  valueText?: string;
  /** Faint marks at 25/50/75% so a partly-full bar is readable at a glance. */
  ticks?: boolean;
  /** Draws a hard stop line at this fraction of max, e.g. a credit limit. */
  markerAt?: number;
  markerLabel?: string;
  className?: string;
}

const TRACK = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
} as const;

/**
 * Horizontal meter. Built for the 20-tonne cart cap (FR-W-05): the fill
 * animates with `.j-meter` from jsmb.css, which already honours
 * `prefers-reduced-motion`, and the tone is the caller's — it shifts
 * neutral -> warn -> danger as the cart fills.
 */
export function ProgressMeter({
  value,
  max,
  tone = "primary",
  surface = "product",
  size = "md",
  label,
  valueLabel,
  hint,
  valueText,
  ticks = false,
  markerAt,
  markerLabel,
  className,
}: ProgressMeterProps) {
  const c = chrome(surface);
  const t = toneClasses(tone, surface);
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className={cn("w-full", className)}>
      {label || valueLabel ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          {label ? <span className={cn(EYEBROW, c.ink3)}>{label}</span> : <span />}
          {valueLabel ? (
            <span className={cn("num text-[13px] font-semibold tabular-nums", c.ink)}>
              {valueLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={Math.round(value * 100) / 100}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText ?? `${value} of ${max}`}
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          TRACK[size],
          surface === "console" ? "bg-j-console-3" : "bg-j-ink/[0.07]",
        )}
      >
        {ticks
          ? [25, 50, 75].map((at) => (
              <span
                key={at}
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 w-px",
                  surface === "console" ? "bg-j-console-line" : "bg-j-surface",
                )}
                style={{ left: `${at}%` }}
              />
            ))
          : null}

        <div
          className={cn("j-meter absolute inset-y-0 left-0 rounded-full", t.fill)}
          style={{ width: `${pct}%` }}
        />

        {markerAt !== undefined ? (
          <span
            aria-hidden="true"
            title={markerLabel}
            className={cn(
              "absolute inset-y-0 w-0.5",
              surface === "console" ? "bg-j-console-ink/70" : "bg-j-ink/60",
            )}
            style={{ left: `${Math.max(0, Math.min(100, markerAt * 100))}%` }}
          />
        ) : null}
      </div>

      {hint ? <p className={cn("mt-1.5 text-xs leading-snug", c.ink3)}>{hint}</p> : null}
    </div>
  );
}
