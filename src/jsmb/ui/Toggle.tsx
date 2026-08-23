import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { chrome, focusRing, toneClasses, type Surface, type Tone } from "./tokens";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label. Pass `hideLabel` to keep it for screen readers only. */
  label: ReactNode;
  description?: ReactNode;
  hideLabel?: boolean;
  disabled?: boolean;
  surface?: Surface;
  tone?: Tone;
  size?: "sm" | "md";
  /** Puts the switch before the label — the default is label first. */
  switchFirst?: boolean;
  className?: string;
}

const SIZES = {
  sm: { track: "h-5 w-9", knob: "h-4 w-4", travel: "translate-x-4" },
  md: { track: "h-6 w-11", knob: "h-5 w-5", travel: "translate-x-5" },
} as const;

/**
 * On/off switch. `role="switch"` on a real button, with the label wired via
 * `aria-labelledby` — the presenter toggles live in the top bar, so this has to
 * be reachable by keyboard without hunting.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  hideLabel = false,
  disabled = false,
  surface = "product",
  tone = "primary",
  size = "md",
  switchFirst = false,
  className,
}: ToggleProps) {
  const labelId = useId();
  const descId = useId();
  const c = chrome(surface);
  const t = toneClasses(tone, surface);
  const sz = SIZES[size];

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={description ? descId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200",
        "disabled:cursor-not-allowed disabled:opacity-45",
        sz.track,
        checked
          ? t.fill
          : surface === "console"
            ? "bg-j-console-line"
            : "bg-j-line-strong",
        focusRing(surface),
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none ml-0.5 inline-block rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none",
          sz.knob,
          checked ? sz.travel : "translate-x-0",
        )}
      />
    </button>
  );

  const text = (
    <span className={cn("min-w-0", hideLabel && "sr-only")}>
      <span id={labelId} className={cn("block text-[13px] font-semibold", c.ink)}>
        {label}
      </span>
      {description ? (
        <span id={descId} className={cn("mt-0.5 block text-xs leading-snug", c.ink3)}>
          {description}
        </span>
      ) : null}
    </span>
  );

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {switchFirst ? (
        <>
          {control}
          {text}
        </>
      ) : (
        <>
          {text}
          {control}
        </>
      )}
    </div>
  );
}
