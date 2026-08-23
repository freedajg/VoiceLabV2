import { forwardRef } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { chrome, focusRing, type Surface } from "./tokens";
import { controlClasses, useFieldContext } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Either pass options or `<option>` children. */
  options?: SelectOption[];
  placeholder?: string;
  surface?: Surface;
  selectSize?: "sm" | "md" | "lg";
  invalid?: boolean;
  /** Leading icon inside the control. */
  icon?: ReactNode;
}

const HEIGHTS = {
  sm: "h-9 pl-3 pr-9 text-[13px]",
  md: "h-11 pl-3.5 pr-10",
  lg: "h-12 pl-4 pr-10 text-[15px]",
} as const;

/**
 * Native `<select>` under a styled shell. Native is deliberate: on a phone it
 * gets the platform picker, which is what a buyer on a 360 px screen expects.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, surface, selectSize = "md", invalid, icon, className, children, ...rest },
  ref,
) {
  const field = useFieldContext();
  const s = surface ?? field?.surface ?? "product";
  const bad = invalid ?? field?.invalid ?? false;
  const c = chrome(s);

  return (
    <div className="relative w-full">
      {icon ? (
        <span
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 [&>svg]:h-4 [&>svg]:w-4",
            c.ink3,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <select
        {...rest}
        ref={ref}
        id={rest.id ?? field?.controlId}
        aria-describedby={rest["aria-describedby"] ?? field?.describedBy}
        aria-invalid={bad || undefined}
        required={rest.required ?? field?.required}
        disabled={rest.disabled ?? field?.disabled}
        className={cn(
          controlClasses(s, bad),
          "appearance-none",
          HEIGHTS[selectSize],
          icon && "pl-9",
          focusRing(s),
          className,
        )}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2", c.ink3)}
      />
    </div>
  );
});
