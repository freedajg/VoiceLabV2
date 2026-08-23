import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";
import { chrome, focusRing, type Surface } from "./tokens";
import { controlClasses, useFieldContext } from "./Field";

export type InputSize = "sm" | "md" | "lg";

const HEIGHTS: Record<InputSize, string> = {
  sm: "h-9 px-3",
  md: "h-11 px-3.5",
  lg: "h-12 px-4 text-[15px]",
};

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  surface?: Surface;
  inputSize?: InputSize;
  invalid?: boolean;
  /** Static leading affix — "₹", "+91", a search glyph. */
  prefix?: ReactNode;
  /** Static trailing affix — "kg", "/bundle". */
  suffix?: ReactNode;
  /** Tabular figures + mono. For phone numbers, GSTINs, order refs. */
  mono?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { surface, inputSize = "md", invalid, prefix, suffix, mono = false, className, ...rest },
  ref,
) {
  const field = useFieldContext();
  const s = surface ?? field?.surface ?? "product";
  const bad = invalid ?? field?.invalid ?? false;
  const c = chrome(s);

  const input = (
    <input
      {...rest}
      ref={ref}
      id={rest.id ?? field?.controlId}
      aria-describedby={rest["aria-describedby"] ?? field?.describedBy}
      aria-invalid={bad || undefined}
      required={rest.required ?? field?.required}
      disabled={rest.disabled ?? field?.disabled}
      className={cn(
        controlClasses(s, bad),
        HEIGHTS[inputSize],
        mono && "j-mono tabular-nums tracking-tight",
        prefix ? "rounded-l-none border-l-0" : undefined,
        suffix ? "rounded-r-none border-r-0" : undefined,
        focusRing(s),
        className,
      )}
    />
  );

  if (!prefix && !suffix) return input;

  const affix = cn(
    "inline-flex shrink-0 select-none items-center border px-3 text-sm font-medium",
    HEIGHTS[inputSize],
    s === "console"
      ? "border-j-console-line bg-j-console-2 text-j-console-ink-2"
      : "border-j-line bg-j-surface-2 text-j-ink-2",
    c.ink2,
  );

  return (
    <div className="flex w-full items-stretch">
      {prefix ? <span className={cn(affix, "rounded-l-xl")} aria-hidden="true">{prefix}</span> : null}
      {input}
      {suffix ? <span className={cn(affix, "rounded-r-xl")} aria-hidden="true">{suffix}</span> : null}
    </div>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  surface?: Surface;
  invalid?: boolean;
}

/** Multi-line sibling of TextInput — the enquiry form's "requirement" box. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { surface, invalid, className, rows = 4, ...rest },
  ref,
) {
  const field = useFieldContext();
  const s = surface ?? field?.surface ?? "product";
  const bad = invalid ?? field?.invalid ?? false;
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={rows}
      id={rest.id ?? field?.controlId}
      aria-describedby={rest["aria-describedby"] ?? field?.describedBy}
      aria-invalid={bad || undefined}
      required={rest.required ?? field?.required}
      disabled={rest.disabled ?? field?.disabled}
      className={cn(
        controlClasses(s, bad),
        "resize-y px-3.5 py-2.5 leading-relaxed",
        focusRing(s),
        className,
      )}
    />
  );
});
