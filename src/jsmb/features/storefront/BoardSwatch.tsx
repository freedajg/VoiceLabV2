import { useId } from "react";
import { cn } from "../../ui";
import type { PatternKey, Product } from "../../domain";

/**
 * There are no photographs of the boards, so the storefront draws them.
 *
 * Each variant renders as a short stack of sheets in its own swatch colours
 * with a pattern treatment that differs per `PatternKey` — a lattice for sweet
 * boxes, a cap grid for caps, ruled margins for file size, folded panels for
 * portfolio, die-lines for cutting. The two hex values come from
 * `Product.swatch`, which is catalogue data; every other colour on the page is
 * a `j-*` token.
 */

export interface BoardSwatchProps {
  product: Product;
  /** Taller crop for the product page hero. */
  size?: "tile" | "hero" | "thumb";
  className?: string;
}

const BOX: Record<NonNullable<BoardSwatchProps["size"]>, string> = {
  thumb: "aspect-[4/3]",
  tile: "aspect-[5/3]",
  hero: "aspect-[4/3] sm:aspect-[3/2]",
};

/** The repeating motif drawn over the top sheet, one per pattern. */
function PatternTile({ pattern, accent, id }: { pattern: PatternKey; accent: string; id: string }) {
  switch (pattern) {
    case "sweet-box":
      // Confectionery lattice — the diagonal cross-hatch of a mithai carton.
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 L14 0 M-2 2 L2 -2 M12 16 L16 12" stroke={accent} strokeWidth="1.1" fill="none" />
          <path d="M0 0 L14 14 M-2 12 L2 16 M12 -2 L16 2" stroke={accent} strokeWidth="1.1" fill="none" />
          <circle cx="7" cy="7" r="1.4" fill={accent} opacity="0.55" />
        </pattern>
      );
    case "caps":
      // Cap and closure stock — a nested-circle blanking grid.
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="5.6" stroke={accent} strokeWidth="1.2" fill="none" />
          <circle cx="8" cy="8" r="2.2" stroke={accent} strokeWidth="0.9" fill="none" opacity="0.7" />
        </pattern>
      );
    case "file":
      // File size — ruled margins the way a stationery converter receives it.
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 0 L0 10" stroke={accent} strokeWidth="1" opacity="0.75" />
          <path d="M5 0 L5 10" stroke={accent} strokeWidth="0.5" opacity="0.4" />
        </pattern>
      );
    case "portfolio":
      // Portfolio — broad folded panels for covers and presentation folders.
      return (
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 22 L22 0" stroke={accent} strokeWidth="6" opacity="0.35" />
          <path d="M0 11 L11 0 M11 22 L22 11" stroke={accent} strokeWidth="1.4" opacity="0.75" />
        </pattern>
      );
    case "cutting":
      // Cutting size — dashed die-lines showing where the blade will drop.
      return (
        <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 9 H18 M9 0 V18" stroke={accent} strokeWidth="1.1" strokeDasharray="3 3" fill="none" />
          <path d="M0 0 H18 M0 0 V18" stroke={accent} strokeWidth="0.6" opacity="0.45" />
        </pattern>
      );
    case "none":
    default:
      // Plain board — pressed pulp fibre, no print.
      return (
        <pattern id={id} width="9" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3 H9" stroke={accent} strokeWidth="0.7" opacity="0.4" />
          <path d="M4 0 H7" stroke={accent} strokeWidth="0.5" opacity="0.25" />
        </pattern>
      );
  }
}

export function BoardSwatch({ product, size = "tile", className }: BoardSwatchProps) {
  const uid = useId().replace(/:/g, "");
  const patternId = `bs-p-${uid}`;
  const gradId = `bs-g-${uid}`;
  const { base, accent } = product.swatch;
  // Thick board is drawn as a visibly deeper stack than thin — the same cue a
  // buyer uses on the mill floor.
  const deck = product.thickness === "thick" ? 4.5 : 2.6;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[calc(var(--j-radius)-4px)] bg-j-surface-2",
        BOX[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 120 78"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`${product.name} — ${product.patternLabel} finish`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <PatternTile pattern={product.pattern} accent={accent} id={patternId} />
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Sheets behind, so the tile reads as a bundle rather than one board. */}
        <g>
          <rect x="16" y={12} width="92" height="52" rx="3" fill={accent} opacity="0.35" />
          <rect x={13} y={12 + deck} width="92" height="52" rx="3" fill={accent} opacity="0.55" />
          <rect x={10} y={12 + deck * 2} width="92" height="52" rx="3" fill={base} />
          <rect x={10} y={12 + deck * 2} width="92" height="52" rx="3" fill={`url(#${patternId})`} opacity="0.9" />
          <rect x={10} y={12 + deck * 2} width="92" height="52" rx="3" fill={`url(#${gradId})`} />
          <rect
            x={10}
            y={12 + deck * 2}
            width="92"
            height="52"
            rx="3"
            fill="none"
            stroke={accent}
            strokeWidth="1"
            opacity="0.8"
          />
        </g>

        {/* Banding strap — how a 25 kg bundle actually leaves the mill. */}
        <rect x={34} y={10 + deck * 2} width="7" height="56" fill="#000000" opacity="0.1" />
        <rect x={78} y={10 + deck * 2} width="7" height="56" fill="#000000" opacity="0.1" />
      </svg>
    </div>
  );
}
