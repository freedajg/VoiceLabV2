import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  CreditCard,
  PackageCheck,
  ReceiptIndianRupee,
  Truck,
  Weight,
} from "lucide-react";
import { AgentChip, Badge, Button, Card, Section, cn } from "../../ui";
import { useBrand } from "../../app/brand";
import { useAgentStore } from "../../store/agentStore";
import { PRODUCTS, tons } from "../../domain";
import { useDataStore } from "../../store/dataStore";
import { BoardSwatch } from "./BoardSwatch";
import { ProductCard } from "./ProductCard";
import { ShopFrame } from "./ShopFrame";
import {
  CAP_IN_UNITS,
  CATEGORY_TILES,
  MAX_ORDER_KG,
  cheapestPerKg,
  productsInCategory,
} from "./lib";

const TRUST = [
  {
    icon: ReceiptIndianRupee,
    title: "GST invoice every time",
    body: "Seller GSTIN, HSN, CGST/SGST split — raised the moment payment lands.",
  },
  {
    icon: PackageCheck,
    title: "20 tonnes, same day",
    body: "Up to 800 bundles off our own floor. Bigger than that, we quote it by hand.",
  },
  {
    icon: CreditCard,
    title: "UPI, cards, credit",
    body: "Pay online, or on 30-day terms once Ajay has approved your firm.",
  },
] as const;

/** The three SKUs the mill actually moves most of — a shortcut off the hero. */
const POPULAR = ["PT-SB", "P-PT", "PK-PF"] as const;

export function ShopHome() {
  const brand = useBrand();
  const pulse = useAgentStore((s) => s.pulse);

  useEffect(() => {
    pulse(
      "CAT",
      "listening",
      `Catalogue live — 7 variants, ₹${Math.min(...PRODUCTS.map((p) => p.pricePerKg))}–₹${Math.max(
        ...PRODUCTS.map((p) => p.pricePerKg),
      )} a kg`,
    );
  }, [pulse]);

  const settings = useDataStore((s) => s.settings);
  const cheapest = cheapestPerKg(PRODUCTS);

  return (
    <ShopFrame width="wide">
      <div className="space-y-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <Card kraft pad="lg" className="overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="primary" size="sm" dot>
                  Factory-direct · {brand.city}
                </Badge>
                <AgentChip id="CAT" size="xs" />
              </div>
              <h1 className="text-balance text-[28px] font-bold leading-[1.08] tracking-[-0.02em] text-j-ink sm:text-[38px]">
                {brand.hero}
              </h1>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-j-ink-2">
                {brand.heroSub}
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  tone="primary"
                  size="lg"
                  block
                  className="sm:w-auto"
                  iconRight={<ArrowRight />}
                  onClick={() => {
                    window.location.hash = "#/shop/catalogue";
                  }}
                >
                  Browse all 7 boards
                </Button>
                <Link
                  to="/shop/enquiry"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-j-line-strong px-6 text-base font-semibold text-j-ink-2 transition-colors hover:bg-j-ink/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-canvas"
                >
                  <Truck className="h-5 w-5" aria-hidden="true" />
                  Need 20 t+?
                </Link>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {[
                  { k: "From", v: `₹${cheapest}`, s: "per kg, ex-GST" },
                  { k: "One bundle", v: "25 kg", s: "one lot = 500 kg" },
                  { k: "Online ceiling", v: tons(MAX_ORDER_KG), s: CAP_IN_UNITS },
                ].map((f) => (
                  <div key={f.k} className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
                      {f.k}
                    </dt>
                    <dd className="num mt-0.5 text-xl font-bold leading-none text-j-ink">{f.v}</dd>
                    <dd className="num mt-1 truncate text-[11px] text-j-ink-3">{f.s}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* A drawn stack rather than a stock photograph. */}
            <div className="grid grid-cols-2 gap-3">
              {PRODUCTS.slice(0, 4).map((p) => (
                <BoardSwatch key={p.code} product={p} size="thumb" />
              ))}
            </div>
          </div>
        </Card>

        {/* ── Trust strip ──────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {TRUST.map((t) => (
            <Card key={t.title} pad="md" flat className="flex gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-j-accent-soft text-j-accent"
              >
                <t.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-tight text-j-ink">{t.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-j-ink-2">{t.body}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Category tiles ───────────────────────────────────────────── */}
        <Section
          eyebrow="Shop by range"
          title="Plain or patterned, thin or thick"
          subtitle="Four ranges, seven variants. Thick sells below thin per kilo by design — a 25 kg thick bundle holds fewer, heavier sheets."
          agentId="CAT"
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORY_TILES.map((tile) => {
              const items = productsInCategory(tile.key);
              const from = cheapestPerKg(items);
              return (
                <Link
                  key={tile.key}
                  to={`/shop/catalogue?cat=${tile.key}`}
                  className={cn(
                    "group j-card flex flex-col overflow-hidden transition-shadow",
                    "hover:shadow-[0_2px_4px_rgb(var(--j-ink)/0.06),0_14px_32px_-16px_rgb(var(--j-ink)/0.22)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-canvas",
                  )}
                >
                  <BoardSwatch product={items[0]} size="tile" className="rounded-none" />
                  <div className="flex flex-1 flex-col p-3">
                    <p className="text-[14px] font-semibold leading-tight text-j-ink">{tile.label}</p>
                    <p className="mt-1 text-[12px] leading-snug text-j-ink-3">{tile.blurb}</p>
                    <p className="num mt-2 pt-1 text-[13px] font-semibold text-j-primary">
                      {items.length} variant{items.length === 1 ? "" : "s"} · from ₹{from}/kg
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>

        {/* ── Popular ──────────────────────────────────────────────────── */}
        <Section
          eyebrow="Moving fastest"
          title="What the mill is running this week"
          actions={
            <Link
              to="/shop/catalogue"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-j-primary hover:underline"
            >
              See all 7 <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR.map((code) => {
              const product = PRODUCTS.find((p) => p.code === code);
              return product ? <ProductCard key={code} product={product} /> : null;
            })}
          </div>
        </Section>

        {/* ── Bulk band (FR-W-06) ──────────────────────────────────────── */}
        <Card pad="lg" stripe="accent" className="bg-j-accent-soft/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent" size="sm" icon={<Weight />}>
                  Above the online cap
                </Badge>
                <AgentChip id="LED" size="xs" />
              </div>
              <h2 className="text-xl font-bold leading-tight text-j-ink">
                Need more than 20 tons?
              </h2>
              <p className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-j-ink-2">
                The website takes orders up to {CAP_IN_UNITS}. Anything larger is priced by hand —
                tell us the tonnage and Sampark puts it in front of {brand.ownerName} the same day.
              </p>
            </div>
            <Link
              to="/shop/enquiry?kind=large-order"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-j-accent px-6 text-base font-semibold text-white transition-colors hover:bg-j-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-canvas"
            >
              Raise a large-order enquiry
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </Card>

        {/* ── Units explainer ──────────────────────────────────────────── */}
        <Card pad="md" flat>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BadgeIndianRupee className="h-4 w-4 text-j-ink-3" aria-hidden="true" />
              <p className="text-[13px] font-semibold text-j-ink">How we sell</p>
            </div>
            <AgentChip id="TON" size="xs" />
          </div>
          <dl className="num mt-3 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
            {[
              ["1 bundle", "25 kg"],
              ["1 lot", "20 bundles · 500 kg"],
              ["Online ceiling", CAP_IN_UNITS],
              ["Delivery", `Free at or above ${tons(settings.freeDeliveryThresholdKg)}`],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-j-ink-3">{k}</dt>
                <dd className="mt-0.5 font-semibold text-j-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-j-ink-3">
            Tolak weighs every basket in kilograms as you build it and refuses anything past{" "}
            {CAP_IN_UNITS}. That is not a soft limit — it is what one day on our floor can load.
          </p>
        </Card>
      </div>
    </ShopFrame>
  );
}
