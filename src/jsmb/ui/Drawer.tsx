import { useId } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";
import { chrome, type Surface } from "./tokens";
import { IconButton } from "./Button";
import { useOverlay } from "./overlay";

export type DrawerSide = "right" | "left" | "bottom";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Small line under the title — role, count, timestamp. */
  subtitle?: ReactNode;
  /** Chips or buttons on the header's trailing edge. */
  headerActions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  surface?: Surface;
  /** Tailwind width class for left/right drawers. */
  width?: string;
  className?: string;
}

/**
 * Side sheet. Escape closes and focus moves inside, but focus is not trapped —
 * a drawer is a companion panel, and the presenter keeps working behind it.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  children,
  footer,
  side = "right",
  surface = "console",
  width = "w-full sm:w-[26rem]",
  className,
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useOverlay<HTMLDivElement>({ open, onClose, trapFocus: false });
  const c = chrome(surface);

  if (!open) return null;

  const position =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl"
      : side === "left"
        ? cn("inset-y-0 left-0", width)
        : cn("inset-y-0 right-0", width);

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-j-ink/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "j-rise absolute flex flex-col overflow-hidden",
          position,
          surface === "console"
            ? "border-j-console-line bg-j-console text-j-console-ink"
            : "border-j-line bg-j-surface text-j-ink",
          side === "right" && "border-l",
          side === "left" && "border-r",
          side === "bottom" && "border-t",
          "shadow-[0_0_60px_-10px_rgb(0_0_0/0.5)]",
          className,
        )}
      >
        <div className={cn("flex items-start justify-between gap-3 border-b px-4 py-3.5", c.line)}>
          <div className="min-w-0">
            <h2 id={titleId} className={cn("truncate text-[15px] font-semibold", c.ink)}>
              {title}
            </h2>
            {subtitle ? (
              <p className={cn("mt-0.5 truncate text-xs", c.ink2)}>{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerActions}
            <IconButton label="Close panel" icon={<X />} size="sm" surface={surface} onClick={onClose} />
          </div>
        </div>

        <div className="j-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer ? (
          <div className={cn("border-t px-4 py-3", c.line)}>{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
