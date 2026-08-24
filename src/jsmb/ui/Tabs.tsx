import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "./cn";
import { chrome, focusRing, type Surface } from "./tokens";

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  /** Trailing tally, e.g. open enquiries. */
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Names the tablist, e.g. "Admin modules". */
  label: string;
  surface?: Surface;
  variant?: "underline" | "pill";
  size?: "sm" | "md";
  className?: string;
  /** Id prefix so panels can point back with `aria-labelledby`. */
  idPrefix?: string;
}

/**
 * Tabs with full arrow-key roving focus. Horizontal scroll on a phone rather
 * than wrapping, so the row stays one line at 360 px.
 */
export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  label,
  surface = "product",
  variant = "underline",
  size = "md",
  className,
  idPrefix = "tab",
}: TabsProps<T>) {
  const c = chrome(surface);
  const listRef = useRef<HTMLDivElement>(null);

  const move = (delta: number): void => {
    const enabled = items.filter((i) => !i.disabled);
    if (enabled.length === 0) return;
    const at = enabled.findIndex((i) => i.id === value);
    const next = enabled[(at + delta + enabled.length) % enabled.length];
    onChange(next.id);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#${idPrefix}-${next.id}`)
      ?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      const first = items.find((i) => !i.disabled);
      if (first) onChange(first.id);
    } else if (e.key === "End") {
      e.preventDefault();
      const last = [...items].reverse().find((i) => !i.disabled);
      if (last) onChange(last.id);
    }
  };

  const height = size === "sm" ? "h-9" : "h-11";

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "j-scroll -mx-1 flex items-center overflow-x-auto px-1",
        variant === "underline" ? cn("gap-5 border-b", c.line) : "gap-1",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            id={`${idPrefix}-${item.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${idPrefix}panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-semibold transition-colors duration-150",
              "disabled:pointer-events-none disabled:opacity-40",
              height,
              variant === "underline"
                ? cn(
                    "-mb-px border-b-2 px-0.5",
                    selected
                      ? "border-j-primary text-j-primary"
                      : cn("border-transparent", c.ink3, surface === "console" ? "hover:text-j-console-ink" : "hover:text-j-ink"),
                  )
                : cn(
                    "rounded-lg px-3",
                    selected
                      ? surface === "console"
                        ? "bg-j-console-3 text-j-console-ink"
                        : "bg-j-ink/[0.06] text-j-ink"
                      : cn(c.ink3, surface === "console" ? "hover:text-j-console-ink" : "hover:text-j-ink"),
                  ),
              focusRing(surface),
            )}
          >
            {item.icon ? (
              <span className="inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "num inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums",
                  selected
                    ? "bg-j-primary/12 text-j-primary"
                    : surface === "console"
                      ? "bg-j-console-3 text-j-console-ink-2"
                      : "bg-j-ink/[0.06] text-j-ink-3",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  /** Must match the `TabItem.id` this panel belongs to. */
  tabId: string;
  active: boolean;
  idPrefix?: string;
  className?: string;
  children: ReactNode;
}

export function TabPanel({ tabId, active, idPrefix = "tab", className, children }: TabPanelProps) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}panel-${tabId}`}
      aria-labelledby={`${idPrefix}-${tabId}`}
      tabIndex={0}
      className={cn("j-rise focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}
