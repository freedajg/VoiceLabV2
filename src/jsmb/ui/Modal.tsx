import { useId } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";
import { chrome, type Surface } from "./tokens";
import { IconButton } from "./Button";
import { useOverlay } from "./overlay";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const WIDTHS: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons row pinned to the bottom of the panel. */
  footer?: ReactNode;
  size?: ModalSize;
  surface?: Surface;
  /** Clicking the scrim closes. Turn off for destructive confirmations. */
  dismissOnBackdrop?: boolean;
  className?: string;
}

/**
 * Centred dialog. Focus is trapped, Escape closes, the page behind is locked
 * and focus returns to whatever opened it.
 *
 * On a phone it becomes a bottom sheet — a centred box at 360 px wastes the
 * screen and puts the actions out of thumb reach.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  surface = "product",
  dismissOnBackdrop = true,
  className,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useOverlay<HTMLDivElement>({ open, onClose, trapFocus: true });
  const c = chrome(surface);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-j-ink/50 backdrop-blur-[2px]"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "j-rise relative flex max-h-[92vh] w-full flex-col overflow-hidden",
          "rounded-t-2xl sm:rounded-[var(--j-radius)]",
          surface === "console"
            ? "border border-j-console-line bg-j-console-2 text-j-console-ink"
            : "bg-j-surface text-j-ink shadow-[0_24px_64px_-24px_rgb(var(--j-ink)/0.4)]",
          WIDTHS[size],
          className,
        )}
      >
        <div className={cn("flex items-start justify-between gap-4 border-b px-5 py-4", c.line)}>
          <div className="min-w-0">
            <h2 id={titleId} className={cn("text-base font-semibold leading-tight", c.ink)}>
              {title}
            </h2>
            {description ? (
              <p id={descId} className={cn("mt-1 text-[13px] leading-relaxed", c.ink2)}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close" icon={<X />} size="sm" surface={surface} onClick={onClose} />
        </div>

        <div className="j-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div
            className={cn(
              "flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4",
              c.line,
              surface === "console" ? "bg-j-console" : "bg-j-surface-2",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
