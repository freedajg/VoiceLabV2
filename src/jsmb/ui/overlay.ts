import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export interface OverlayOptions {
  open: boolean;
  onClose: () => void;
  /** Cycle Tab within the panel. Modals trap; drawers do not. */
  trapFocus?: boolean;
  /** Prevent the page behind from scrolling while open. */
  lockScroll?: boolean;
}

/**
 * Escape-to-close, focus restore, optional focus trap and scroll lock.
 *
 * No timers outlive the component: every listener is torn down on close, which
 * matters because the presenter opens and closes these dozens of times a demo.
 */
export function useOverlay<T extends HTMLElement>({
  open,
  onClose,
  trapFocus = false,
  lockScroll = true,
}: OverlayOptions): RefObject<T> {
  const panelRef = useRef<T>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (!trapFocus || e.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus({ preventScroll: true });
    };
  }, [open, onClose, trapFocus, lockScroll]);

  return panelRef;
}
