import { useId } from "react";
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "./cn";
import { chrome, focusRing, type Surface } from "./tokens";
import { IconButton } from "./Button";

export interface DataGridToolbarProps {
  /** Wire this and a search box appears. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Accessible label — defaults to the placeholder. */
    label?: string;
  };
  /** Pills, selects, period switchers. Wrap freely; they reflow at 360 px. */
  filters?: ReactNode;
  /** Export, add, refresh. */
  actions?: ReactNode;
  /** "42 of 120 orders" — the honest count above every grid. */
  count?: { shown: number; total: number; noun: string };
  surface?: Surface;
  className?: string;
}

/**
 * The strip above every admin grid: search, filters, count, actions. One row on
 * desktop, stacked on a phone, and the filter row scrolls rather than wraps
 * into a wall.
 */
export function DataGridToolbar({
  search,
  filters,
  actions,
  count,
  surface = "product",
  className,
}: DataGridToolbarProps) {
  const c = chrome(surface);
  const searchId = useId();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search ? (
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor={searchId} className="sr-only">
              {search.label ?? search.placeholder ?? "Search"}
            </label>
            <Search
              aria-hidden="true"
              className={cn("pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", c.ink3)}
            />
            <input
              id={searchId}
              type="search"
              value={search.value}
              placeholder={search.placeholder ?? "Search"}
              onChange={(e) => search.onChange(e.target.value)}
              className={cn(
                "h-10 w-full rounded-xl border pl-9 pr-9 text-sm",
                "placeholder:text-j-ink-3",
                surface === "console"
                  ? "border-j-console-line bg-j-console-3 text-j-console-ink placeholder:text-j-console-ink-2"
                  : "border-j-line bg-j-surface text-j-ink",
                "[&::-webkit-search-cancel-button]:appearance-none",
                focusRing(surface),
              )}
            />
            {search.value ? (
              <IconButton
                label="Clear search"
                icon={<X />}
                size="xs"
                surface={surface}
                onClick={() => search.onChange("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              />
            ) : null}
          </div>
        ) : null}

        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>

      {filters || count ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {filters ? (
            <div className="j-scroll -mx-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1 pb-0.5">
              {filters}
            </div>
          ) : null}
          {count ? (
            <p className={cn("num shrink-0 text-xs tabular-nums", c.ink3)}>
              {count.shown === count.total
                ? `${count.total} ${count.noun}`
                : `${count.shown} of ${count.total} ${count.noun}`}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
