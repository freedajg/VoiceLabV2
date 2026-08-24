import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, SearchX } from "lucide-react";
import { AgentChip, Button, Card, EmptyState, Pill, Section, cn } from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { PRODUCTS } from "../../domain";
import { ProductCard } from "./ProductCard";
import { ShopFrame } from "./ShopFrame";
import { filterProducts, type GaugeFilter, type RangeFilter } from "./lib";

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "plain", label: "Plain" },
  { value: "patterned", label: "Patterned" },
];

const GAUGE_OPTIONS: { value: GaugeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "thin", label: "Thin" },
  { value: "thick", label: "Thick" },
];

/** `?cat=patterned-thick` from a home tile pre-sets both filters. */
function fromCategory(cat: string | null): { range: RangeFilter; gauge: GaugeFilter } {
  switch (cat) {
    case "plain-thin":
      return { range: "plain", gauge: "thin" };
    case "plain-thick":
      return { range: "plain", gauge: "thick" };
    case "patterned-thin":
      return { range: "patterned", gauge: "thin" };
    case "patterned-thick":
      return { range: "patterned", gauge: "thick" };
    default:
      return { range: "all", gauge: "all" };
  }
}

function describe(range: RangeFilter, gauge: GaugeFilter): string {
  const r = range === "all" ? "" : `${range} `;
  const g = gauge === "all" ? "" : `${gauge} `;
  return `${r}${g}`.trim() || "all";
}

/**
 * FR-W-01 — every one of the seven variants, with category, sizes, pattern,
 * price per bundle and price per kg, filterable by Plain/Patterned and
 * Thin/Thick. Kagaz narrates each filter so the agent layer stays awake while
 * a buyer is only browsing.
 */
export function Catalogue() {
  const [params, setParams] = useSearchParams();
  const preset = fromCategory(params.get("cat"));
  const [range, setRange] = useState<RangeFilter>(preset.range);
  const [gauge, setGauge] = useState<GaugeFilter>(preset.gauge);
  const pulse = useAgentStore((s) => s.pulse);

  const shown = useMemo(() => filterProducts(range, gauge), [range, gauge]);

  useEffect(() => {
    pulse(
      "CAT",
      "tool",
      `catalogue.filter → ${shown.length} of ${PRODUCTS.length} variants match ${describe(range, gauge)}`,
    );
  }, [pulse, shown.length, range, gauge]);

  function apply(next: { range?: RangeFilter; gauge?: GaugeFilter }) {
    if (next.range !== undefined) setRange(next.range);
    if (next.gauge !== undefined) setGauge(next.gauge);
    // The deep link stops describing a category once the filters are edited.
    if (params.has("cat")) {
      const copy = new URLSearchParams(params);
      copy.delete("cat");
      setParams(copy, { replace: true });
    }
  }

  const cleared = range === "all" && gauge === "all";

  return (
    <ShopFrame width="wide">
      <Section
        eyebrow="Catalogue"
        title="All seven mill-board variants"
        subtitle="Prices are per 25 kg bundle, factory-direct and ex-GST. Every patterned line shows the surcharge that has already been added."
        agentId="CAT"
        spacing="loose"
      >
        <Card pad="sm" flat className="sticky top-[6.5rem] z-20 space-y-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-j-ink-3" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Range
            </span>
            <div className="flex flex-wrap gap-1.5">
              {RANGE_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  size="xs"
                  selected={range === o.value}
                  onClick={() => apply({ range: o.value })}
                >
                  {o.label}
                </Pill>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Gauge
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GAUGE_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  size="xs"
                  tone="accent"
                  selected={gauge === o.value}
                  onClick={() => apply({ gauge: o.value })}
                >
                  {o.label}
                </Pill>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-j-line pt-2.5">
            <p className={cn("num text-[13px] font-semibold text-j-ink")}>
              {shown.length} of {PRODUCTS.length} variants
            </p>
            <div className="flex items-center gap-2">
              {!cleared ? (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setRange("all");
                    setGauge("all");
                  }}
                >
                  Clear
                </Button>
              ) : null}
              <AgentChip id="CAT" size="xs" />
            </div>
          </div>
        </Card>

        {shown.length === 0 ? (
          <EmptyState
            kraft
            icon={<SearchX />}
            title="Nothing matches those two filters"
            description="The mill runs plain thin, plain thick, patterned thin and patterned thick. Try widening one of them."
            action={
              <Button
                tone="primary"
                onClick={() => {
                  setRange("all");
                  setGauge("all");
                }}
              >
                Show all seven
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((product) => (
              <ProductCard key={product.code} product={product} />
            ))}
          </div>
        )}
      </Section>
    </ShopFrame>
  );
}
