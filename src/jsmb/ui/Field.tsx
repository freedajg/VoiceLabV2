import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "./cn";
import { chrome, type Surface } from "./tokens";

export interface FieldContextValue {
  /** Id the control must adopt so the `<label>` points at it. */
  controlId: string;
  /** Space-separated ids of hint + error text. */
  describedBy?: string;
  invalid: boolean;
  surface: Surface;
  required: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Controls call this to inherit id, aria-describedby and invalid state from the
 * wrapping `<Field>`. Every control still works standalone — the hook simply
 * returns null and the caller falls back to its own props.
 */
export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  /** Quiet helper text under the control. */
  hint?: ReactNode;
  /** When set, the control turns danger-toned and this replaces the hint. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  surface?: Surface;
  /** Trailing element on the label row — a unit switch, a "why?" link. */
  labelAction?: ReactNode;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Labelled control wrapper. Nothing in this app ships an unlabelled input —
 * the label, hint and error are wired to the control through context so the
 * caller cannot forget the `aria-describedby`.
 */
export function Field({
  label,
  children,
  hint,
  error,
  required = false,
  disabled = false,
  surface = "product",
  labelAction,
  hideLabel = false,
  className,
}: FieldProps) {
  const base = useId();
  const controlId = `${base}-control`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const c = chrome(surface);
  const invalid = Boolean(error);
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider
      value={{ controlId, describedBy, invalid, surface, required, disabled }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className={cn("flex items-baseline justify-between gap-3", hideLabel && "sr-only")}>
          <label htmlFor={controlId} className={cn("text-[13px] font-semibold", c.ink)}>
            {label}
            {required ? (
              <span className={cn("ml-1", surface === "console" ? "text-j-danger-soft" : "text-j-danger")}>
                *
              </span>
            ) : null}
          </label>
          {labelAction}
        </div>

        {children}

        {error ? (
          <p
            id={errorId}
            role="alert"
            className={cn(
              "flex items-start gap-1.5 text-xs",
              surface === "console" ? "text-j-danger-soft" : "text-j-danger",
            )}
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={hintId} className={cn("text-xs leading-relaxed", c.ink3)}>
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/** Shared shell classes for text-like controls, so input and select match. */
export function controlClasses(surface: Surface, invalid: boolean): string {
  return cn(
    "w-full rounded-xl border text-sm transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
    surface === "console"
      ? "border-j-console-line bg-j-console-3 text-j-console-ink placeholder:text-j-console-ink-2"
      : "border-j-line bg-j-surface text-j-ink placeholder:text-j-ink-3",
    invalid && (surface === "console" ? "border-j-danger/70" : "border-j-danger"),
  );
}
