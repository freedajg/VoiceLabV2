import { Minus, Plus } from "lucide-react";
import { cn } from "./cn";
import { chrome, focusRing, type Surface } from "./tokens";
import { useFieldContext } from "./Field";

export interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Trailing unit shown inside the control — "bundles", "lots", "kg". */
  unit?: string;
  surface?: Surface;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Required when there is no wrapping `<Field>`. */
  "aria-label"?: string;
  id?: string;
  className?: string;
}

const SIZES = {
  sm: { box: "h-9", btn: "h-9 w-9", text: "text-sm" },
  md: { box: "h-11", btn: "h-11 w-11", text: "text-[15px]" },
  lg: { box: "h-12", btn: "h-12 w-12", text: "text-base" },
} as const;

/**
 * Quantity control for bundles and lots. Real buttons on either side of a real
 * number input, so it works with a keyboard, a screen reader and a thumb.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
  surface,
  size = "md",
  disabled,
  id,
  className,
  ...aria
}: NumberStepperProps) {
  const field = useFieldContext();
  const s = surface ?? field?.surface ?? "product";
  const c = chrome(s);
  const sz = SIZES[size];
  const isDisabled = disabled ?? field?.disabled ?? false;

  const clamp = (n: number): number => Math.min(max, Math.max(min, n));
  const set = (n: number): void => {
    if (Number.isFinite(n)) onChange(clamp(n));
  };

  const btn = cn(
    "inline-flex shrink-0 items-center justify-center transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-35",
    sz.btn,
    s === "console"
      ? "text-j-console-ink hover:bg-j-console-ink/10"
      : "text-j-ink-2 hover:bg-j-ink/[0.06]",
    focusRing(s),
  );

  return (
    <div
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-xl border",
        sz.box,
        s === "console" ? "border-j-console-line bg-j-console-3" : "border-j-line bg-j-surface",
        isDisabled && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        className={cn(btn, "rounded-l-xl")}
        onClick={() => set(value - step)}
        disabled={isDisabled || value <= min}
        aria-label={`Decrease by ${step}`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1">
        <input
          id={id ?? field?.controlId}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={isDisabled}
          aria-label={aria["aria-label"]}
          aria-describedby={field?.describedBy}
          onChange={(e) => set(Number(e.target.value))}
          className={cn(
            "num w-full min-w-[2.5ch] border-0 bg-transparent p-0 text-center font-semibold tabular-nums",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            "focus:outline-none focus-visible:outline-none",
            sz.text,
            c.ink,
          )}
        />
        {unit ? (
          <span className={cn("shrink-0 whitespace-nowrap text-xs", c.ink3)}>{unit}</span>
        ) : null}
      </div>

      <button
        type="button"
        className={cn(btn, "rounded-r-xl")}
        onClick={() => set(value + step)}
        disabled={isDisabled || value >= max}
        aria-label={`Increase by ${step}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
