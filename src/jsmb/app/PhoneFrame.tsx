import type { ReactNode } from "react";
import { cn } from "../ui/cn";
import { useBrand } from "./brand";

export interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
}

/**
 * Presenter aid: a real phone bezel around the storefront so a mobile-first
 * design (FR-W-03) reads as mobile-first on a projector instead of as a
 * narrow column on a laptop.
 *
 * The device viewport is 390 x 844 — the same box the 360 px requirement is
 * checked against, with the content scrolling inside the bezel rather than the
 * page scrolling behind it.
 */
export function PhoneFrame({ children, className }: PhoneFrameProps) {
  const brand = useBrand();
  return (
    <div
      className={cn(
        "flex min-h-full items-start justify-center bg-j-console px-4 py-6 sm:py-10",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "relative w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-[2.75rem]",
            "border-[10px] border-j-console-3 bg-j-canvas",
            "shadow-[0_40px_80px_-24px_rgb(0_0_0/0.65),inset_0_0_0_1px_rgb(var(--j-console-line))]",
          )}
        >
          {/* Notch */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-j-console-3"
          />
          <div className="j-scroll h-[min(844px,calc(100vh-11rem))] overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
        <p className="j-mono text-[11px] tracking-tight text-j-console-ink-2/70">
          {brand.company} · 390 × 844
        </p>
      </div>
    </div>
  );
}
