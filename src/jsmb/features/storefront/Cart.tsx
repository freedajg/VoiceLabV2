import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import {
  AgentChip,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  IconButton,
  NumberStepper,
  ProgressMeter,
  SegmentedControl,
  Section,
  cn,
} from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { useCartStore } from "../../store/cartStore";
import { useDataStore } from "../../store/dataStore";
import type { Unit } from "../../domain";
import { PRODUCT_BY_CODE, groupIndian, inr, kg, tons } from "../../domain";
import { BoardSwatch } from "./BoardSwatch";
import { ShopFrame } from "./ShopFrame";
import {
  CAP_IN_UNITS,
  MAX_ORDER_KG,
  capSentence,
  capStatus,
  capTone,
  convertQty,
  headroomSentence,
  unitNoun,
  useCartQuote,
} from "./lib";

const UNIT_OPTIONS: { value: Unit; label: string; srLabel: string }[] = [
  { value: "bundle", label: "Bundles", srLabel: "Price this line by the bundle" },
  { value: "lot", label: "Lots", srLabel: "Price this line by the lot" },
];

/**
 * FR-W-05 / FR-W-06 — the basket, the running tonnage meter and the 20 t
 * ceiling. Exactly 20 t is allowed and checks out; one bundle more and Tolak
 * blocks the checkout button and hands the basket to Sampark.
 */
export function Cart() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const updateLine = useCartStore((s) => s.updateLine);
  const removeLine = useCartStore((s) => s.removeLine);
  const settings = useDataStore((s) => s.settings);
  const pulse = useAgentStore((s) => s.pulse);
  const emit = useAgentStore((s) => s.emit);

  const quote = useCartQuote();
  const status = capStatus(quote.totalWeightKg);
  const tone = capTone(status);

  // Narrate the basket whenever its weight actually changes — not on rerender.
  const lastWeight = useRef<number | null>(null);
  useEffect(() => {
    if (lines.length === 0 || lastWeight.current === quote.totalWeightKg) return;
    lastWeight.current = quote.totalWeightKg;
    if (!status.withinCap) {
      pulse(
        "TON",
        "error",
        `Basket at ${kg(quote.totalWeightKg)} — ${kg(
          quote.totalWeightKg - MAX_ORDER_KG,
        )} over the ${CAP_IN_UNITS} ceiling. Checkout blocked.`,
      );
      pulse("LED", "listening", `Bulk lead waiting — ${tons(quote.totalWeightKg)} basket`);
      emit({
        agentId: "TON",
        kind: "guardrail",
        level: "error",
        message: "tonnage.cap_check → checkout blocked, escalating to Sampark",
        toolName: "enquiry.route",
        targetAgentId: "LED",
        payload: {
          basketKg: quote.totalWeightKg,
          ceilingKg: MAX_ORDER_KG,
          overByKg: quote.totalWeightKg - MAX_ORDER_KG,
          bundles: quote.totalBundles,
        },
      });
      return;
    }
    pulse("TON", "tool", capSentence(quote.totalWeightKg));
  }, [lines.length, quote.totalWeightKg, quote.totalBundles, status.withinCap, pulse, emit]);

  if (lines.length === 0) {
    return (
      <ShopFrame>
        <Section eyebrow="Your basket" title="Nothing in the basket yet" agentId="TON">
          <EmptyState
            kraft
            icon={<ShoppingBag />}
            title="No boards picked yet"
            description={`Add bundles or lots from the catalogue. The website takes up to ${CAP_IN_UNITS} in one order.`}
            action={
              <Link
                to="/shop/catalogue"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-j-primary px-4 text-sm font-semibold text-white"
              >
                Browse the catalogue
              </Link>
            }
            secondaryAction={
              <Link
                to="/shop/enquiry?kind=large-order"
                className="text-[13px] font-semibold text-j-accent hover:underline"
              >
                Ordering more than 20 t?
              </Link>
            }
          />
        </Section>
      </ShopFrame>
    );
  }

  return (
    <ShopFrame width="wide">
      <div className="space-y-5">
        <Section
          eyebrow="Your basket"
          title={`${lines.length} line${lines.length === 1 ? "" : "s"} · ${kg(quote.totalWeightKg)}`}
          agentId="TON"
        >
          {/* ── Tonnage meter (FR-W-05) ─────────────────────────────── */}
          <Card pad="md" stripe={status.withinCap ? undefined : "danger"}>
            <ProgressMeter
              value={Math.min(quote.totalWeightKg, MAX_ORDER_KG)}
              max={MAX_ORDER_KG}
              tone={tone}
              size="lg"
              label="Running tonnage"
              valueLabel={`${tons(quote.totalWeightKg)} of ${tons(MAX_ORDER_KG)}`}
              hint={`${capSentence(quote.totalWeightKg)} ${headroomSentence(quote.totalWeightKg)}`}
              ticks
            />
            <div className="num mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-j-line pt-3 text-[13px]">
              <span className="text-j-ink-2">
                <strong className="font-semibold text-j-ink">
                  {groupIndian(quote.totalBundles)}
                </strong>{" "}
                bundles
              </span>
              <span className="text-j-ink-2">
                <strong className="font-semibold text-j-ink">
                  {(quote.totalWeightKg / 500).toFixed(1)}
                </strong>{" "}
                lots
              </span>
              <span className="text-j-ink-2">
                <strong className="font-semibold text-j-ink">{tons(quote.totalWeightKg)}</strong>
              </span>
              <span className="ml-auto text-j-ink-3">Ceiling {CAP_IN_UNITS}</span>
            </div>
          </Card>

          {/* ── Over the cap (FR-W-06) ──────────────────────────────── */}
          {!status.withinCap ? (
            <Card pad="md" stripe="danger" className="bg-j-danger-soft">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-j-danger" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-j-ink">
                    Over the 20 t self-service ceiling — checkout is blocked
                  </p>
                  <p className="num mt-1 text-[13px] leading-relaxed text-j-ink-2">
                    This basket weighs {kg(quote.totalWeightKg)}, which is{" "}
                    {kg(quote.totalWeightKg - MAX_ORDER_KG)} past {CAP_IN_UNITS}. Tolak will not
                    take it online; Sampark will quote it by hand the same day.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      tone="accent"
                      iconLeft={<Truck />}
                      onClick={() =>
                        navigate(
                          `/shop/enquiry?kind=large-order&t=${Math.ceil(quote.totalWeightKg / 1000)}`,
                        )
                      }
                    >
                      Send as a large-order enquiry
                    </Button>
                    <AgentChip id="LED" size="sm" />
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {/* ── Lines ───────────────────────────────────────────────── */}
          <div className="space-y-3">
            {lines.map((cartLine, index) => {
              const product = PRODUCT_BY_CODE[cartLine.productCode];
              // quoteOrder maps the basket in order, so index is an exact match.
              const priced = quote.lines[index];
              const weightKg = priced?.weightKg ?? 0;
              const linePrice = priced?.linePrice ?? 0;

              return (
                <Card key={cartLine.id} pad="sm">
                  <div className="flex gap-3">
                    <div className="w-20 shrink-0 sm:w-24">
                      <BoardSwatch product={product} size="thumb" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/shop/product/${product.code}`}
                            className="block truncate text-[14px] font-semibold text-j-ink hover:text-j-primary"
                          >
                            {product.name}
                          </Link>
                          <p className="num mt-0.5 text-xs text-j-ink-3">
                            {cartLine.size} oz · {product.patternLabel} ·{" "}
                            {inr(product.pricePerBundle)}/bundle
                          </p>
                        </div>
                        <IconButton
                          label={`Remove ${product.name}`}
                          icon={<Trash2 />}
                          size="sm"
                          tone="danger"
                          variant="ghost"
                          onClick={() => {
                            removeLine(cartLine.id);
                            pulse(
                              "TON",
                              "tool",
                              `Line removed — ${kg(weightKg)} off the basket`,
                            );
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <SegmentedControl
                          label={`Unit for ${product.name}`}
                          options={UNIT_OPTIONS}
                          value={cartLine.unit}
                          size="sm"
                          onChange={(next) => {
                            if (next === cartLine.unit) return;
                            const nextQty = convertQty(cartLine.qty, cartLine.unit, next);
                            updateLine(cartLine.id, { unit: next, qty: nextQty });
                            pulse(
                              "TON",
                              "tool",
                              `tonnage.convert → ${nextQty} ${unitNoun(next, nextQty)} = ${kg(
                                nextQty * (next === "lot" ? 500 : 25),
                              )}`,
                            );
                          }}
                        />
                        <NumberStepper
                          value={cartLine.qty}
                          min={1}
                          max={cartLine.unit === "lot" ? 60 : 1200}
                          size="sm"
                          unit={unitNoun(cartLine.unit, cartLine.qty)}
                          aria-label={`Quantity of ${product.name}`}
                          onChange={(v) => updateLine(cartLine.id, { qty: v })}
                        />
                      </div>

                      <div className="num flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-j-line pt-2 text-[13px]">
                        <span className="text-j-ink-2">
                          {kg(weightKg)} · {tons(weightKg)}
                        </span>
                        <span className="text-base font-bold text-j-ink">{inr(linePrice)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ── Totals (FR-W-11) ────────────────────────────────────── */}
          <Card pad="md">
            <CardHeader
              title="Order total"
              subtitle={`Priced by Mulya from the live cost assumptions and the ${Math.round(
                settings.gstRate * 100,
              )}% GST rate on file.`}
              agentId="PRC"
              divided
            />
            <dl className="num mt-3 space-y-2 text-[14px]">
              <Row label={`Boards (${groupIndian(quote.totalBundles)} bundles, ex-GST)`}>
                {inr(quote.subtotal)}
              </Row>
              <Row
                label="Delivery"
                hint={
                  quote.deliveryCharge === 0
                    ? `Free at or above ${tons(settings.freeDeliveryThresholdKg)}`
                    : `Flat charge below ${tons(settings.freeDeliveryThresholdKg)}`
                }
              >
                {quote.deliveryCharge === 0 ? (
                  <span className="text-j-success">Free</span>
                ) : (
                  inr(quote.deliveryCharge)
                )}
              </Row>
              <Row label={`GST @ ${Math.round(quote.gstRate * 100)}%`}>{inr(quote.gstAmount)}</Row>
              <div className="flex items-baseline justify-between gap-3 border-t border-j-line pt-2.5">
                <dt className="text-[15px] font-semibold text-j-ink">Payable</dt>
                <dd className="text-[26px] font-bold leading-none tracking-[-0.02em] text-j-ink">
                  {inr(quote.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-2">
              <Button
                tone="primary"
                size="lg"
                block
                iconRight={<ArrowRight />}
                disabled={!status.withinCap}
                onClick={() => navigate("/shop/checkout")}
              >
                {status.withinCap ? "Checkout" : "Checkout blocked — over 20 t"}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  to="/shop/catalogue"
                  className="text-[13px] font-semibold text-j-ink-2 hover:underline"
                >
                  Keep shopping
                </Link>
                <Link
                  to="/shop/enquiry?kind=large-order"
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline",
                    status.withinCap ? "text-j-accent" : "text-j-danger",
                  )}
                >
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  Bulk / more than 20 t
                </Link>
              </div>
            </div>

            {status.pct >= 0.85 && status.withinCap ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-j-warn-soft p-2.5">
                <Badge tone="warn" size="xs" dot>
                  Near the cap
                </Badge>
                <p className="num text-[12px] leading-snug text-j-ink-2">
                  {headroomSentence(quote.totalWeightKg)} Past that, the order goes to Sampark as
                  an enquiry.
                </p>
              </div>
            ) : null}
          </Card>
        </Section>
      </div>
    </ShopFrame>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 text-j-ink-2">
        {label}
        {hint ? <span className="block text-[11px] text-j-ink-3">{hint}</span> : null}
      </dt>
      <dd className="shrink-0 font-semibold text-j-ink">{children}</dd>
    </div>
  );
}
