import { cn } from "../ui/cn";
import { useBrand } from "./brand";

export interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  /** Hide the wordmark and show only the initials tile. */
  markOnly?: boolean;
  /** Dark chrome (the app frame) vs light product surfaces. */
  surface?: "product" | "console";
  className?: string;
}

const TILE = {
  sm: "h-7 w-7 text-[11px] rounded-md",
  md: "h-9 w-9 text-[13px] rounded-lg",
  lg: "h-12 w-12 text-base rounded-xl",
} as const;

/**
 * Initials tile plus the company name. Both come from the active brand
 * profile, so the white-label toggle renames the whole app in one place.
 *
 * The tile is a stamped square rather than a logo: this is a mill, and a
 * stencilled mark on kraft is the right vernacular.
 */
export function BrandMark({ size = "md", markOnly = false, surface = "console", className }: BrandMarkProps) {
  const brand = useBrand();
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-j-primary font-extrabold tracking-[0.02em] text-white",
          "shadow-[inset_0_-2px_0_rgb(var(--j-ink)/0.18)]",
          TILE[size],
        )}
      >
        {brand.initials}
      </span>
      {markOnly ? (
        <span className="sr-only">{brand.legalName}</span>
      ) : (
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-[13px] font-bold leading-tight tracking-[-0.01em] sm:text-sm",
              surface === "console" ? "text-j-console-ink" : "text-j-ink",
            )}
          >
            {brand.company}
          </span>
          <span
            className={cn(
              "block truncate text-[11px] leading-tight",
              surface === "console" ? "text-j-console-ink-2" : "text-j-ink-3",
            )}
          >
            {brand.tagline}
          </span>
        </span>
      )}
    </span>
  );
}
