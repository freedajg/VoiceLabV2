import type { ReactNode } from "react";
import { cn } from "./cn";
import { chrome, toneClasses, type Surface, type Tone } from "./tokens";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** A Button, usually. */
  action?: ReactNode;
  /** Secondary link-style escape hatch. */
  secondaryAction?: ReactNode;
  surface?: Surface;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  /** Kraft-paper wash behind the panel. Product surfaces only. */
  kraft?: boolean;
  className?: string;
}

const SIZE_PAD = {
  sm: "px-5 py-8",
  md: "px-6 py-12",
  lg: "px-6 py-16 sm:py-20",
} as const;

/**
 * Nothing-here panel. Used for genuinely empty tables, filtered-out lists and
 * the wave-2 route placeholders.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  surface = "product",
  tone = "neutral",
  size = "md",
  kraft = false,
  className,
}: EmptyStateProps) {
  const c = chrome(surface);
  const t = toneClasses(tone, surface);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--j-radius)] border border-dashed text-center",
        c.line,
        kraft && surface === "product" ? "j-kraft" : c.panel,
        SIZE_PAD[size],
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl",
            t.soft,
            "hover:bg-inherit",
            "[&>svg]:h-5 [&>svg]:w-5",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <p className={cn("text-balance text-[15px] font-semibold", c.ink)}>{title}</p>
      {description ? (
        <p className={cn("mt-2 max-w-[46ch] text-[13px] leading-relaxed", c.ink2)}>{description}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
