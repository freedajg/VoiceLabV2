import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, PackageX, Ruler, ShoppingCart, Truck } from "lucide-react";
import {
  AgentChip,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  NumberStepper,
  Pill,
  ProgressMeter,
  SegmentedControl,
  cn,
} from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { useCartStore } from "../../store/cartStore";
import { useDataStore } from "../../store/dataStore";
import type { Product, ProductCode, Unit } from "../../domain";
import {
  PRODUCT_BY_CODE,
  groupIndian,
  inr,
  kg,
  quoteLine,
  toKg,
  tons,
} from "../../domain";
import { BoardSwatch } from "./BoardSwatch";
import { ShopFrame } from "./ShopFrame";
import {
  CAP_IN_UNITS,
  MAX_ORDER_KG,
  capStatus,
  capTone,
  headroomSentence,
  patternArithmetic,
  unitNoun,
} from "./lib";

const UNIT_OPTIONS: { value: Unit; label: string; srLabel: string }[] = [
  { value: "bundle", label: "Bundle · 25 kg", srLabel: "Buy by the bundle, 25 kg each" },
  { value: "lot", label: "Lot · 500 kg", srLabel: "Buy by the lot, 20 bundles or 500 kg each" },
];

export function ProductDetail() {
  const { code } = useParams<{ code: string }>();
  const product = code ? PRODUCT_BY_CODE[code as ProductCode] : undefined;

  if (!product) {
    return (
      <ShopFrame>
        <EmptyState
          kraft
          icon={<PackageX />}
          title="We do not run that variant"
          description="The mill produces seven mill-board variants — plain and patterned, thin and thick."
          action={
            <Link
              to="/shop/catalogue"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-j-primary px-4 text-sm font-semibold text-white"
            >
              Back to the catalogue
            </Link>
          }
        />
      </ShopFrame>
    );
  }

  // Keyed so switching variant resets size, unit and quantity cleanly.
  return <ProductView key={product.code} product={product} />;
}

function ProductView({ product }: { product: Product }) {
  const navigate = useNavigate();
  const [size, setSize] = useState<number>(product.sizes[0]);
  const [unit, setUnit] = useState<Unit>("bundle");
  const [qty, setQty] = useState<number>(unit === "lot" ? 1 : 4);
  const [refused, setRefused] = useState<string | null>(null);

  const costConfig = useDataStore((s) => s.costConfig);
  const settings = useDataStore((s) => s.settings);
  const lines = useCartStore((s) => s.lines);
  const addLine = useCartStore((s) => s.addLine);
  const pulse = useAgentStore((s) => s.pulse);
  const emit = useAgentStore((s) => s.emit);

  const arithmetic = patternArithmetic(product);

  useEffect(() => {
    pulse(
      "CAT",
      "tool",
      `catalogue.lookup → ${product.name} · ${inr(product.pricePerBundle)}/bundle · ₹${product.pricePerKg}/kg`,
    );
    emit({
      agentId: "CAT",
      kind: "tool-result",
      level: "info",
      message: `${product.code} — ${product.sizes.length} sizes, ${product.patternLabel} finish`,
      toolName: "catalogue.lookup",
      durationMs: 140,
      payload: {
        code: product.code,
        category: product.categoryLabel,
        sizes: product.sizes,
        basePricePerBundle: product.basePricePerBundle,
        patternCharge: product.patternCharge,
        pricePerBundle: product.pricePerBundle,
        pricePerKg: product.pricePerKg,
        hsn: product.hsn,
      },
    });
  }, [pulse, emit, product]);

  /* Live figures — priced by the engine, never by the component. */
  const line = useMemo(
    () => quoteLine({ productCode: product.code, size, unit, qty }, { costConfig, settings }),
    [product.code, size, unit, qty, costConfig, settings],
  );

  const cartKg = lines.reduce((sum, l) => sum + toKg(l.unit, l.qty), 0);
  const projectedKg = cartKg + line.weightKg;
  const projected = capStatus(projectedKg);
  const bundleCount = unit === "lot" ? qty * 20 : qty;

  function handleUnit(next: Unit) {
    if (next === unit) return;
    // Keep the load roughly where it is instead of multiplying it twentyfold.
    const nextQty = next === "lot" ? Math.max(1, Math.round(qty / 20)) : qty * 20;
    setUnit(next);
    setQty(nextQty);
    setRefused(null);
    pulse(
      "TON",
      "tool",
      `tonnage.convert → ${nextQty} ${unitNoun(next, nextQty)} = ${kg(toKg(next, nextQty))}`,
    );
  }

  function handleAdd() {
    if (!projected.withinCap) {
      const over = projectedKg - MAX_ORDER_KG;
      const message = `Refused — ${kg(projectedKg)} is ${kg(over)} over the ${CAP_IN_UNITS} ceiling`;
      setRefused(message);
      pulse("TON", "error", message);
      emit({
        agentId: "TON",
        kind: "guardrail",
        level: "warn",
        message: `tonnage.cap_check blocked the basket at ${kg(projectedKg)}`,
        toolName: "tonnage.cap_check",
        payload: {
          basketKg: cartKg,
          addingKg: line.weightKg,
          projectedKg,
          ceilingKg: MAX_ORDER_KG,
          overByKg: over,
        },
      });
      pulse("TON", "handoff", `Handing ${tons(projectedKg)} to Sampark for a hand-quoted enquiry`);
      pulse("LED", "listening", `Bulk lead ready — ${tons(projectedKg)} of ${product.name}`);
      toast.warning("Over the 20 t online cap", {
        description: `Tolak refused the add. ${kg(projectedKg)} needs a hand-quoted enquiry.`,
      });
      return;
    }

    addLine({ productCode: product.code, size, unit, qty });
    setRefused(null);
    pulse(
      "TON",
      "tool",
      `${qty} ${unitNoun(unit, qty)} added — basket now ${kg(projectedKg)}, ${Math.round(
        projected.pct * 100,
      )}% of the 20 t cap`,
    );
    emit({
      agentId: "TON",
      kind: "tool-result",
      level: projected.pct >= 0.85 ? "warn" : "success",
      message:
        projected.pct >= 0.85
          ? `Approaching the ceiling — ${kg(projected.remainingKg)} of headroom left`
          : `Basket at ${kg(projectedKg)} — ${kg(projected.remainingKg)} of headroom left`,
      toolName: "tonnage.convert",
      durationMs: 120,
      payload: {
        added: `${qty} ${unitNoun(unit, qty)}`,
        addedKg: line.weightKg,
        basketKg: projectedKg,
        pctOfCap: Math.round(projected.pct * 1000) / 10,
        remainingBundles: projected.remainingBundles,
      },
    });
    toast.success(`${qty} ${unitNoun(unit, qty)} added`, {
      description: `${kg(line.weightKg)} · ${inr(line.linePrice)} — basket now ${kg(projectedKg)}.`,
      action: { label: "View cart", onClick: () => navigate("/shop/cart") },
    });
  }

  return (
    <ShopFrame width="wide">
      <div className="space-y-5">
        <nav aria-label="Breadcrumb" className="text-xs text-j-ink-3">
          <Link to="/shop/catalogue" className="hover:underline">
            Catalogue
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{product.categoryLabel}</span>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          {/* ── Visual + price build-up ──────────────────────────────── */}
          <div className="space-y-4">
            <Card pad="none" className="overflow-hidden">
              <BoardSwatch product={product} size="hero" className="rounded-none" />
            </Card>

            <Card pad="md">
              <CardHeader
                title="What you pay per bundle"
                subtitle="Every price on this site already has the pattern charge in it."
                agentId="CAT"
                divided
              />
              <dl className="num mt-3 space-y-2 text-[14px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-j-ink-2">Base board ({product.thickness})</dt>
                  <dd className="font-semibold text-j-ink">{inr(product.basePricePerBundle)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-j-ink-2">
                    {product.pattern === "none"
                      ? "Pattern charge"
                      : `${product.patternLabel} pattern charge`}
                  </dt>
                  <dd
                    className={cn(
                      "font-semibold",
                      product.patternCharge > 0 ? "text-j-primary" : "text-j-ink-3",
                    )}
                  >
                    {product.patternCharge > 0 ? `+ ${inr(product.patternCharge)}` : "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-j-line pt-2">
                  <dt className="font-semibold text-j-ink">Price per 25 kg bundle</dt>
                  <dd className="text-[20px] font-bold text-j-ink">{inr(product.pricePerBundle)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-j-ink-2">Price per kg</dt>
                  <dd className="font-semibold text-j-accent">₹{product.pricePerKg}</dd>
                </div>
              </dl>
              {arithmetic ? (
                <p className="num mt-3 rounded-lg bg-j-primary-soft px-3 py-2 text-[13px] font-semibold text-j-primary">
                  {arithmetic} per bundle
                </p>
              ) : null}
            </Card>
          </div>

          {/* ── Buy panel ────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={product.pattern === "none" ? "neutral" : "primary"} size="sm">
                  {product.categoryLabel}
                </Badge>
                <Badge tone="neutral" size="sm" outline mono>
                  {product.code}
                </Badge>
                <Badge tone="accent" size="sm" outline>
                  HSN {product.hsn}
                </Badge>
              </div>
              <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-j-ink sm:text-[30px]">
                {product.name}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-j-ink-2">{product.blurb}</p>
            </div>

            <Card pad="md" className="space-y-4">
              {/* Size (FR-W-01) */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-j-ink-3" aria-hidden="true" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
                    Ounce size
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((s) => (
                    <Pill key={s} size="sm" selected={size === s} onClick={() => setSize(s)}>
                      <span className="num">{s} oz</span>
                    </Pill>
                  ))}
                </div>
              </div>

              {/* Unit + quantity (FR-W-04) */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
                    Buying unit
                  </span>
                  <AgentChip id="TON" size="xs" />
                </div>
                <SegmentedControl
                  label="Buying unit"
                  options={UNIT_OPTIONS}
                  value={unit}
                  onChange={handleUnit}
                  fullWidth
                />
                <p className="num mt-2 text-xs text-j-ink-3">
                  1 lot = 20 bundles = 500 kg. Switching unit re-weighs and re-prices instantly.
                </p>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
                  Quantity
                </div>
                <NumberStepper
                  value={qty}
                  onChange={(v) => {
                    setQty(v);
                    setRefused(null);
                  }}
                  min={1}
                  max={unit === "lot" ? 40 : 800}
                  unit={unitNoun(unit, qty)}
                  size="lg"
                  aria-label="Quantity"
                />
              </div>

              {/* Live weight and price */}
              <dl className="num grid grid-cols-2 gap-3 rounded-[calc(var(--j-radius)-4px)] bg-j-surface-2 p-3 text-[13px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-j-ink-3">Weight</dt>
                  <dd className="mt-0.5 text-lg font-bold leading-none text-j-ink">
                    {kg(line.weightKg)}
                  </dd>
                  <dd className="mt-1 text-[11px] text-j-ink-3">
                    {tons(line.weightKg)} · {groupIndian(bundleCount)} bundles
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-j-ink-3">
                    Line price
                  </dt>
                  <dd className="mt-0.5 text-lg font-bold leading-none text-j-ink">
                    {inr(line.linePrice)}
                  </dd>
                  <dd className="mt-1 text-[11px] text-j-ink-3">
                    ₹{product.pricePerKg}/kg · {inr(product.pricePerBundle)}/bundle
                  </dd>
                </div>
              </dl>

              {/* Cap meter (FR-W-05) */}
              <ProgressMeter
                value={Math.min(projectedKg, MAX_ORDER_KG)}
                max={MAX_ORDER_KG}
                tone={capTone(projected)}
                label="Basket after this add"
                valueLabel={`${tons(projectedKg)} of ${tons(MAX_ORDER_KG)}`}
                hint={headroomSentence(projectedKg)}
                ticks
              />

              {refused ? (
                <Card pad="sm" stripe="danger" flat className="bg-j-danger-soft">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-j-danger"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-j-ink">{refused}</p>
                      <p className="mt-1 text-[13px] leading-snug text-j-ink-2">
                        Tolak will not let a self-service basket past {CAP_IN_UNITS}. Sampark can
                        take it as a hand-quoted enquiry instead.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          tone="accent"
                          iconLeft={<Truck />}
                          onClick={() =>
                            navigate(
                              `/shop/enquiry?kind=large-order&t=${Math.ceil(projectedKg / 1000)}`,
                            )
                          }
                        >
                          Raise a large-order enquiry
                        </Button>
                        <AgentChip id="LED" size="xs" />
                      </div>
                    </div>
                  </div>
                </Card>
              ) : null}

              <Button
                tone="primary"
                size="lg"
                block
                iconLeft={<ShoppingCart />}
                onClick={handleAdd}
              >
                Add {qty} {unitNoun(unit, qty)} · {inr(line.linePrice)}
              </Button>

              <p className="text-center text-xs text-j-ink-3">
                Ex-GST. Delivery and {Math.round(settings.gstRate * 100)}% GST are added at
                checkout.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </ShopFrame>
  );
}
