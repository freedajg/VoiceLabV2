import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { chrome, EYEBROW, focusRing, toneClasses, type Surface, type Tone } from "./tokens";
import { AgentChip } from "./AgentChip";
import type { AgentId } from "../contracts/agents";

export type CardPad = "none" | "sm" | "md" | "lg";

const PAD: Record<CardPad, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-7",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: Surface;
  pad?: CardPad;
  /** Flat cards drop the lift — use inside an already-raised panel. */
  flat?: boolean;
  /** Kraft-paper wash. Product surfaces only; hero and empty states. */
  kraft?: boolean;
  /** A 3px tone stripe down the leading edge — reserve it for alerts. */
  stripe?: Tone;
}

/** The container everything sits in. `.j-card` / `.j-console-card` come from jsmb.css. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { surface = "product", pad = "md", flat = false, kraft = false, stripe, className, children, ...rest },
  ref,
) {
  const base = surface === "console" ? "j-console-card" : flat ? "j-card-flat" : "j-card";
  return (
    <div
      ref={ref}
      className={cn(
        base,
        kraft && surface === "product" && "j-kraft",
        stripe && "relative overflow-hidden",
        PAD[pad],
        className,
      )}
      {...rest}
    >
      {stripe ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-[3px]",
            toneClasses(stripe, surface).fill,
          )}
        />
      ) : null}
      {children}
    </div>
  );
});

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small uppercase label above the title. */
  eyebrow?: ReactNode;
  icon?: ReactNode;
  /** Buttons, filters, a period switcher — anything trailing. */
  actions?: ReactNode;
  /** Stamps the panel with the agent that produced it. */
  agentId?: AgentId;
  surface?: Surface;
  /** Adds the hairline under the header. */
  divided?: boolean;
  as?: "h2" | "h3" | "h4";
}

/**
 * Panel header. `agentId` is the provenance stamp — a prospect can point at any
 * panel and see which agent produced the numbers inside it.
 */
export function CardHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  agentId,
  surface = "product",
  divided = false,
  as: Heading = "h3",
  className,
  ...rest
}: CardHeaderProps) {
  const c = chrome(surface);
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-2",
        divided && cn("border-b pb-3", c.line),
        className,
      )}
      {...rest}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span
            className={cn(
              "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              toneClasses("neutral", surface).soft,
              "[&>svg]:h-[18px] [&>svg]:w-[18px]",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <div className={cn(EYEBROW, c.ink3, "mb-1")}>{eyebrow}</div>
          ) : null}
          <Heading className={cn("text-[15px] font-semibold leading-tight sm:text-base", c.ink)}>
            {title}
          </Heading>
          {subtitle ? (
            <p className={cn("mt-1 text-[13px] leading-snug", c.ink2)}>{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {agentId ? <AgentChip id={agentId} surface={surface} size="xs" /> : null}
        {actions}
      </div>
    </div>
  );
}

export interface CardLinkProps extends HTMLAttributes<HTMLDivElement> {
  surface?: Surface;
}

/** Wrapper that makes a whole card feel clickable without faking a button. */
export function CardInteractive({ surface = "product", className, ...rest }: CardLinkProps) {
  return (
    <div
      className={cn(
        "transition-shadow duration-150",
        "hover:shadow-[0_2px_4px_rgb(var(--j-ink)/0.06),0_14px_32px_-16px_rgb(var(--j-ink)/0.22)]",
        "focus-within:ring-2 focus-within:ring-j-primary focus-within:ring-offset-2",
        chrome(surface).ringOffset,
        focusRing(surface),
        className,
      )}
      {...rest}
    />
  );
}
