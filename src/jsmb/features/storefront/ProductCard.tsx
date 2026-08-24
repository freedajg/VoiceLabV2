import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge, Card, CardInteractive, cn } from "../../ui";
import type { Product } from "../../domain";
import { inr } from "../../domain";
import { BoardSwatch } from "./BoardSwatch";
import { patternArithmetic } from "./lib";

/**
 * One catalogue tile (FR-W-01): category, sizes, pattern, price per bundle,
 * price per kg and a drawn visual. Everything the requirement asks for is on
 * the tile, so a buyer never has to open a product to compare two.
 */
export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const sizes = product.sizes;
  const arithmetic = patternArithmetic(product);

  return (
    <CardInteractive className={cn("rounded-[var(--j-radius)]", className)}>
      <Card pad="none" className="flex h-full flex-col overflow-hidden">
        <BoardSwatch product={product} size="tile" className="rounded-none" />

        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={product.pattern === "none" ? "neutral" : "primary"} size="xs">
              {product.categoryLabel}
            </Badge>
            <Badge tone="neutral" size="xs" outline>
              {product.patternLabel}
            </Badge>
          </div>

          <Link
            to={`/shop/product/${product.code}`}
            className="rounded text-[15px] font-semibold leading-snug text-j-ink hover:text-j-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-surface"
          >
            {product.name}
          </Link>

          <p className="num text-xs text-j-ink-3">
            {sizes.length} sizes · {sizes[0]}–{sizes[sizes.length - 1]} oz · HSN {product.hsn}
          </p>

          <div className="mt-auto pt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="num text-[26px] font-bold leading-none tracking-[-0.02em] text-j-ink">
                {inr(product.pricePerBundle)}
              </span>
              <span className="text-[13px] font-medium text-j-ink-3">/ bundle</span>
            </div>
            <p className="num mt-1 text-[13px] font-semibold text-j-accent">
              ₹{product.pricePerKg} / kg · 25 kg a bundle
            </p>
            {arithmetic ? (
              <p className="num mt-1 text-xs text-j-ink-3">
                {arithmetic} — base + {product.patternLabel.toLowerCase()} charge
              </p>
            ) : null}
          </div>

          <Link
            to={`/shop/product/${product.code}`}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-j-primary text-sm font-semibold text-white transition-colors hover:bg-j-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-surface"
          >
            View &amp; order
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </CardInteractive>
  );
}
