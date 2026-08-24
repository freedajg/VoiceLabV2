import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { chrome, EYEBROW, GUTTER, type Surface } from "./tokens";
import { AgentChip } from "./AgentChip";
import type { AgentId } from "../contracts/agents";

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  agentId?: AgentId;
  surface?: Surface;
  /** Vertical rhythm between sections. */
  spacing?: "tight" | "normal" | "loose";
}

const SPACING = {
  tight: "space-y-3",
  normal: "space-y-4",
  loose: "space-y-6",
} as const;

/** A titled band of content. Keeps heading hierarchy consistent across slices. */
export function Section({
  title,
  subtitle,
  eyebrow,
  actions,
  agentId,
  surface = "product",
  spacing = "normal",
  className,
  children,
  ...rest
}: SectionProps) {
  const c = chrome(surface);
  const hasHeader = Boolean(title || subtitle || eyebrow || actions || agentId);
  return (
    <section className={cn(SPACING[spacing], className)} {...rest}>
      {hasHeader ? (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {eyebrow ? <div className={cn(EYEBROW, c.ink3, "mb-1.5")}>{eyebrow}</div> : null}
            {title ? (
              <h2 className={cn("text-lg font-semibold leading-tight sm:text-xl", c.ink)}>
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className={cn("mt-1 max-w-[65ch] text-sm leading-relaxed", c.ink2)}>{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {agentId ? <AgentChip id={agentId} surface={surface} size="xs" /> : null}
            {actions}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export interface Crumb {
  label: string;
  /** Hash route, e.g. "#/admin". Omit for the current page. */
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  agentId?: AgentId;
  surface?: Surface;
  breadcrumbs?: Crumb[];
  /** Tabs, a period switcher or a toolbar rendered under the title. */
  below?: ReactNode;
  className?: string;
}

/**
 * The top of every routed page. Mobile-first: the title wraps and the actions
 * drop under it rather than squeezing at 360 px.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  agentId,
  surface = "product",
  breadcrumbs,
  below,
  className,
}: PageHeaderProps) {
  const c = chrome(surface);
  return (
    <header className={cn("border-b pb-5 pt-6 sm:pb-6 sm:pt-8", c.line, GUTTER, className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className={cn("flex flex-wrap items-center gap-1.5 text-xs", c.ink3)}>
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className={cn("rounded hover:underline", c.ink2)}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
                {i < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? <div className={cn(EYEBROW, c.ink3, "mb-2")}>{eyebrow}</div> : null}
          <h1
            className={cn(
              "text-balance text-[26px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[32px]",
              c.ink,
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className={cn("mt-2 max-w-[62ch] text-sm leading-relaxed sm:text-[15px]", c.ink2)}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions || agentId ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {agentId ? <AgentChip id={agentId} surface={surface} size="sm" /> : null}
            {actions}
          </div>
        ) : null}
      </div>

      {below ? <div className="mt-5">{below}</div> : null}
    </header>
  );
}
