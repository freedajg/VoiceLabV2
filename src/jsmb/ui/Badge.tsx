import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { focusRing, toneClasses, type Surface, type Tone } from "./tokens";

export type BadgeSize = "xs" | "sm" | "md";

const BADGE_SIZES: Record<BadgeSize, string> = {
  xs: "h-5 gap-1 px-1.5 text-[10px] tracking-[0.04em] rounded",
  sm: "h-6 gap-1.5 px-2 text-[11px] rounded-md",
  md: "h-7 gap-1.5 px-2.5 text-xs rounded-md",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  surface?: Surface;
  size?: BadgeSize;
  /** Leading status dot — the fastest read for order/agent state. */
  dot?: boolean;
  icon?: ReactNode;
  /** Outline instead of a tinted fill. */
  outline?: boolean;
  /** Mono type — for order numbers, HSN codes, agent ids. */
  mono?: boolean;
}

/** Non-interactive status label. State always reads as shape + text, not colour alone. */
export function Badge({
  tone = "neutral",
  surface = "product",
  size = "sm",
  dot = false,
  icon,
  outline = false,
  mono = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  const t = toneClasses(tone, surface);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center whitespace-nowrap font-semibold",
        BADGE_SIZES[size],
        outline ? cn("border bg-transparent", t.border, t.text) : t.soft,
        "hover:bg-inherit",
        mono && "j-mono tracking-tight",
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.fill)} aria-hidden="true" />
      ) : null}
      {icon ? (
        <span className="inline-flex shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  tone?: Tone;
  surface?: Surface;
  size?: BadgeSize;
  /** Selected filter pills carry the tone; unselected stay quiet. */
  selected?: boolean;
  icon?: ReactNode;
  /** Trailing count, e.g. a facet tally. */
  count?: number;
}

const PILL_SIZES: Record<BadgeSize, string> = {
  xs: "h-6 gap-1.5 px-2.5 text-[11px]",
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-3.5 text-[13px]",
};

/**
 * Interactive filter chip. Rounded-full so it never gets confused with a
 * Button; renders as a real `<button>` with `aria-pressed`.
 */
export function Pill({
  tone = "primary",
  surface = "product",
  size = "sm",
  selected = false,
  icon,
  count,
  className,
  children,
  type = "button",
  ...rest
}: PillProps) {
  const t = toneClasses(tone, surface);
  const quiet = toneClasses("neutral", surface);
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-semibold transition-colors duration-150",
        PILL_SIZES[size],
        selected
          ? cn(t.soft, t.border, t.text)
          : cn("border-transparent", quiet.soft, quiet.text, quiet.hoverSoft),
        focusRing(surface),
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span className="inline-flex shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
      {count !== undefined ? (
        <span className={cn("num tabular-nums opacity-70")}>{count}</span>
      ) : null}
    </button>
  );
}
