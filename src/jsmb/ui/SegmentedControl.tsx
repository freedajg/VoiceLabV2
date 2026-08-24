import type { ReactNode } from "react";
import { cn } from "./cn";
import { chrome, focusRing, type Surface } from "./tokens";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Screen-reader name when `label` is an icon or an abbreviation. */
  srLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Buying unit". */
  label: string;
  surface?: Surface;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}

const SIZES = {
  sm: { pad: "p-0.5", item: "h-8 px-2.5 text-xs" },
  md: { pad: "p-1", item: "h-9 px-3.5 text-[13px]" },
} as const;

/**
 * Two-to-four mutually exclusive choices: bundle vs lot, daily/weekly/monthly,
 * plain vs patterned. A radiogroup, not tabs — it filters, it does not navigate.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  label,
  surface = "product",
  size = "md",
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const c = chrome(surface);
  const sz = SIZES[size];

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border",
        sz.pad,
        surface === "console" ? "border-j-console-line bg-j-console-3" : "border-j-line bg-j-surface-2",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.srLabel}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors duration-150",
              "disabled:pointer-events-none disabled:opacity-40",
              sz.item,
              fullWidth && "flex-1",
              selected
                ? surface === "console"
                  ? "bg-j-console text-j-console-ink shadow-sm"
                  : "bg-j-surface text-j-ink shadow-sm ring-1 ring-j-line"
                : cn(c.ink3, surface === "console" ? "hover:text-j-console-ink" : "hover:text-j-ink"),
              focusRing(surface),
            )}
          >
            {o.icon ? (
              <span className="inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
                {o.icon}
              </span>
            ) : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
