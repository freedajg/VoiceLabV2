import { createContext, useContext } from "react";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "./cn";
import { chrome, EYEBROW, focusRing, type Surface } from "./tokens";

interface TableCtx {
  surface: Surface;
  dense: boolean;
}

const TableContext = createContext<TableCtx>({ surface: "product", dense: false });

export type SortDirection = "asc" | "desc";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  surface?: Surface;
  /** Tighter rows for long admin grids. */
  dense?: boolean;
  /** Header sticks while the body scrolls. Needs a bounded-height wrapper. */
  stickyHeader?: boolean;
  /** Zebra striping — only worth it past ~10 rows. */
  striped?: boolean;
  /** Applied to the scroll container, not the table. */
  wrapperClassName?: string;
  /** Caption for screen readers; visually hidden unless `showCaption`. */
  caption?: ReactNode;
  showCaption?: boolean;
}

/**
 * Table with its own horizontal scroll container, so a wide admin grid never
 * makes the page scroll sideways at 360 px.
 */
export function Table({
  surface = "product",
  dense = false,
  stickyHeader = false,
  striped = false,
  wrapperClassName,
  caption,
  showCaption = false,
  className,
  children,
  ...rest
}: TableProps) {
  const c = chrome(surface);
  return (
    <TableContext.Provider value={{ surface, dense }}>
      <div className={cn("j-scroll w-full overflow-x-auto", wrapperClassName)}>
        <table
          className={cn(
            "w-full border-collapse text-left text-sm",
            stickyHeader && "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10",
            striped &&
              (surface === "console"
                ? "[&_tbody_tr:nth-child(even)]:bg-j-console-ink/[0.03]"
                : "[&_tbody_tr:nth-child(even)]:bg-j-surface-2"),
            c.ink,
            className,
          )}
          {...rest}
        >
          {caption ? (
            <caption
              className={cn(
                "pb-3 text-left text-[13px]",
                c.ink2,
                !showCaption && "sr-only",
              )}
            >
              {caption}
            </caption>
          ) : null}
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
}

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-aligns and switches on tabular figures. */
  numeric?: boolean;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  sortDirection?: SortDirection | null;
  onSort?: () => void;
}

export function Th({
  numeric = false,
  align,
  sortable = false,
  sortDirection = null,
  onSort,
  className,
  children,
  ...rest
}: ThProps) {
  const { surface, dense } = useContext(TableContext);
  const c = chrome(surface);
  const a = align ?? (numeric ? "right" : "left");

  const label = (
    <span className={cn("inline-flex items-center gap-1", a === "right" && "flex-row-reverse")}>
      {children}
      {sortable ? (
        <span aria-hidden="true" className="opacity-60">
          {sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ChevronsUpDown className="h-3 w-3" />
          )}
        </span>
      ) : null}
    </span>
  );

  return (
    <th
      scope="col"
      aria-sort={
        sortable
          ? sortDirection === "asc"
            ? "ascending"
            : sortDirection === "desc"
              ? "descending"
              : "none"
          : undefined
      }
      className={cn(
        EYEBROW,
        "whitespace-nowrap border-b font-semibold",
        surface === "console" ? "bg-j-console-2" : "bg-j-surface",
        c.line,
        c.ink3,
        dense ? "px-3 py-2" : "px-3 py-2.5 sm:px-4",
        a === "right" && "text-right",
        a === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn("rounded", EYEBROW, "hover:text-j-primary", focusRing(surface))}
        >
          {label}
        </button>
      ) : (
        label
      )}
    </th>
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  align?: "left" | "center" | "right";
  /** Secondary ink — for metadata columns. */
  muted?: boolean;
  strong?: boolean;
  /** Mono type: order ids, GSTINs, HSN codes, txn refs. */
  mono?: boolean;
  /** Stops the cell wrapping. */
  nowrap?: boolean;
}

export function Td({
  numeric = false,
  align,
  muted = false,
  strong = false,
  mono = false,
  nowrap = false,
  className,
  children,
  ...rest
}: TdProps) {
  const { surface, dense } = useContext(TableContext);
  const c = chrome(surface);
  const a = align ?? (numeric ? "right" : "left");
  return (
    <td
      className={cn(
        "border-b align-middle",
        c.line,
        dense ? "px-3 py-2 text-[13px]" : "px-3 py-3 text-sm sm:px-4",
        numeric && "num tabular-nums",
        mono && "j-mono text-[12px] tracking-tight",
        muted ? c.ink2 : c.ink,
        strong && "font-semibold",
        nowrap && "whitespace-nowrap",
        a === "right" && "text-right",
        a === "center" && "text-center",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

/** Row helper that adds a hover wash — use for rows that drill into a detail. */
export function Tr({
  interactive = false,
  className,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  const { surface } = useContext(TableContext);
  return (
    <tr
      className={cn(
        interactive &&
          (surface === "console"
            ? "cursor-pointer hover:bg-j-console-ink/[0.05]"
            : "cursor-pointer hover:bg-j-primary-soft/60"),
        className,
      )}
      {...rest}
    />
  );
}
