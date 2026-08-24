import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  CreditCard,
  Info,
  Landmark,
  Lock,
  LogIn,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import {
  AgentChip,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Modal,
  Section,
  Select,
  TextInput,
  cn,
} from "../../ui";
import { useBrand } from "../../app/brand";
import { useAgentStore } from "../../store/agentStore";
import { useCartStore } from "../../store/cartStore";
import { selectAnalyticsInput, useDataStore } from "../../store/dataStore";
import type { Customer, Order, PaymentMode, Region } from "../../domain";
import {
  DEMO_TODAY,
  PRODUCT_BY_CODE,
  SEED,
  buildInvoice,
  computeLedger,
  groupIndian,
  inr,
  isIntraState,
  kg,
  pct,
  quoteOrder,
  tons,
} from "../../domain";
import { ShopFrame, useShopChrome } from "./ShopFrame";
import {
  CAP_IN_UNITS,
  MAX_ORDER_KG,
  capStatus,
  checkGstin,
  toLineInput,
  unitNoun,
  useCartQuote,
  useSessionCustomer,
} from "./lib";

/* ── Deterministic references ──────────────────────────────────────────── */

function orderRef(existingCount: number): { id: string; orderNo: string } {
  const seq = existingCount + 1;
  const padded = String(seq).padStart(4, "0");
  return { id: `ord-${padded}`, orderNo: `JSMB-${DEMO_TODAY.slice(0, 4)}-${padded}` };
}

function paymentRef(existingCount: number, mode: PaymentMode): { id: string; txnRef: string } {
  const seq = existingCount + 1;
  return {
    id: `pay-${String(seq).padStart(4, "0")}`,
    txnRef: `${mode === "razorpay" ? "pay_" : "rcpt_"}${String(SEED + seq * 977).slice(-9)}`,
  };
}

/* ── Razorpay (simulated) ──────────────────────────────────────────────── */

type GatewayMethod = "upi" | "card" | "netbanking";

const GATEWAY_METHODS: { id: GatewayMethod; label: string; hint: string; icon: typeof Smartphone }[] =
  [
    { id: "upi", label: "UPI", hint: "GPay · PhonePe · Paytm · any UPI app", icon: Smartphone },
    { id: "card", label: "Card", hint: "Credit or debit, 3-D Secure", icon: CreditCard },
    { id: "netbanking", label: "Net banking", hint: "58 banks", icon: Landmark },
  ];

const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: "telangana", label: "Telangana" },
  { value: "andhra-pradesh", label: "Andhra Pradesh" },
];

/**
 * FR-W-11 / FR-W-12 / FR-W-13 — review, address, GSTIN, taxes and payment.
 *
 * The order this screen writes is the one the admin P&L reads: it is built by
 * `quoteOrder`, billed by `buildInvoice` and pushed through `useDataStore`, so
 * placing it here moves revenue, margin and dues on Ajay's dashboard.
 */
export function Checkout() {
  const navigate = useNavigate();
  const chrome = useShopChrome();
  const brand = useBrand();

  const lines = useCartStore((s) => s.lines);
  const session = useCartStore((s) => s.session);
  const clearCart = useCartStore((s) => s.clearCart);
  const setLastOrder = useCartStore((s) => s.setLastOrder);

  const settings = useDataStore((s) => s.settings);
  const costConfig = useDataStore((s) => s.costConfig);
  const addOrder = useDataStore((s) => s.addOrder);
  const recordPayment = useDataStore((s) => s.recordPayment);
  const addInvoice = useDataStore((s) => s.addInvoice);
  const upsertCustomer = useDataStore((s) => s.upsertCustomer);

  const pulse = useAgentStore((s) => s.pulse);
  const emit = useAgentStore((s) => s.emit);

  const customer = useSessionCustomer();
  const quote = useCartQuote();
  const status = capStatus(quote.totalWeightKg);

  /* ── Delivery + GST details ─────────────────────────────────────────── */
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState<Region>("telangana");
  const [gstin, setGstin] = useState("");
  const [touched, setTouched] = useState(false);

  // Prefill from the buyer's own record the moment they sign in (FR-W-10).
  useEffect(() => {
    if (!customer) return;
    setName(customer.name);
    setCompany(customer.company ?? "");
    setAddress(customer.address);
    setCity(customer.city);
    setRegion(customer.region);
    setGstin(customer.gstin ?? "");
  }, [customer]);

  const gstinCheck = checkGstin(gstin);
  const detailsComplete =
    name.trim().length > 1 &&
    address.trim().length > 3 &&
    city.trim().length > 1 &&
    (gstinCheck.empty || gstinCheck.valid);

  /* ── Payment (FR-W-12, FR-W-13) ─────────────────────────────────────── */
  const [mode, setMode] = useState<PaymentMode>("razorpay");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [method, setMethod] = useState<GatewayMethod>("upi");
  const [phase, setPhase] = useState<"idle" | "processing">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  /* Credit head-room, so the COD/credit option can state its own limit. */
  const ledger = useMemo(() => {
    if (!customer) return null;
    return computeLedger(selectAnalyticsInput(useDataStore.getState()), customer.id);
  }, [customer]);

  const creditAvailable = ledger?.creditAvailable ?? 0;
  const creditOk = Boolean(customer?.creditApproved) && quote.total <= creditAvailable;

  /* ── Mulya narrates the totals, margin included ─────────────────────── */
  const narrated = useRef<number | null>(null);
  useEffect(() => {
    if (lines.length === 0 || narrated.current === quote.total) return;
    narrated.current = quote.total;
    pulse(
      "PRC",
      "tool",
      `pricing.quote → ${inr(quote.total)} payable · margin ${inr(quote.margin)} (${pct(
        quote.marginPct,
      )})`,
    );
    emit({
      agentId: "PRC",
      kind: "tool-result",
      level: quote.marginPct < 0.08 ? "warn" : "success",
      message: `Standard cost ₹${(quote.standardCost / Math.max(1, quote.totalWeightKg)).toFixed(
        2,
      )}/kg · margin ${inr(quote.margin)} on ${kg(quote.totalWeightKg)}`,
      toolName: "pricing.quote",
      durationMs: 260,
      payload: {
        subtotal: quote.subtotal,
        deliveryCharge: quote.deliveryCharge,
        gstRate: quote.gstRate,
        gstAmount: quote.gstAmount,
        total: quote.total,
        standardCost: quote.standardCost,
        margin: quote.margin,
        marginPct: Math.round(quote.marginPct * 1000) / 10,
        marginPerKg: Math.round((quote.margin / Math.max(1, quote.totalWeightKg)) * 100) / 100,
        targetMarginPerKg: costConfig.targetMargin,
      },
    });
  }, [lines.length, quote, costConfig.targetMargin, pulse, emit]);

  /* ── Empty / blocked states ─────────────────────────────────────────── */
  if (lines.length === 0) {
    return (
      <ShopFrame>
        <EmptyState
          kraft
          icon={<ShoppingBag />}
          title="There is nothing to check out"
          description="Add bundles or lots to the basket first."
          action={
            <Link
              to="/shop/catalogue"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-j-primary px-4 text-sm font-semibold text-white"
            >
              Browse the catalogue
            </Link>
          }
        />
      </ShopFrame>
    );
  }

  if (!status.withinCap) {
    return (
      <ShopFrame>
        <EmptyState
          tone="danger"
          icon={<Info />}
          title={`This basket is ${kg(quote.totalWeightKg - MAX_ORDER_KG)} over the online ceiling`}
          description={`Tolak caps a self-service order at ${CAP_IN_UNITS}. Sampark will quote anything larger by hand.`}
          action={
            <Link
              to="/shop/enquiry?kind=large-order"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-j-accent px-4 text-sm font-semibold text-white"
            >
              Raise a large-order enquiry
            </Link>
          }
          secondaryAction={
            <Link to="/shop/cart" className="text-[13px] font-semibold text-j-ink-2 hover:underline">
              Back to the basket
            </Link>
          }
        />
      </ShopFrame>
    );
  }

  /* ── Placing the order ──────────────────────────────────────────────── */

  function saveCustomer(): Customer | null {
    if (!customer) return null;
    const trimmedGstin = gstin.trim().toUpperCase();
    const updated: Customer = {
      ...customer,
      name: name.trim(),
      company: company.trim() ? company.trim() : undefined,
      address: address.trim(),
      city: city.trim(),
      region,
      gstin: trimmedGstin ? trimmedGstin : undefined,
      segment: company.trim() ? "trade" : customer.segment,
    };
    upsertCustomer(updated);
    pulse(
      "IDN",
      "tool",
      trimmedGstin
        ? `gstin.validate → ${trimmedGstin} accepted, state ${trimmedGstin.slice(0, 2)}`
        : `customer.upsert → ${updated.name}, ${updated.city}, billed as an individual`,
    );
    return updated;
  }

  function placeOrder(paymentMode: PaymentMode, methodLabel: string) {
    const buyer = saveCustomer();
    if (!buyer) return;

    const data = useDataStore.getState();
    const priced = quoteOrder(lines.map(toLineInput), {
      costConfig: data.costConfig,
      settings: data.settings,
      region: buyer.region,
    });
    const ref = orderRef(data.orders.length);

    const order: Order = {
      id: ref.id,
      orderNo: ref.orderNo,
      customerId: buyer.id,
      placedAt: DEMO_TODAY,
      status: "placed",
      lines: priced.lines.map((l, i) => ({ ...l, id: `${ref.id}-L${i + 1}` })),
      totalWeightKg: priced.totalWeightKg,
      subtotal: priced.subtotal,
      deliveryCharge: priced.deliveryCharge,
      gstRate: priced.gstRate,
      gstAmount: priced.gstAmount,
      total: priced.total,
      // Money is moved only by `recordPayment`, so the payments list and the
      // order's dues can never disagree.
      paidAmount: 0,
      dueAmount: priced.total,
      paymentState: paymentMode === "razorpay" ? "pending" : "due",
      paymentMode,
      margin: priced.margin,
      region: buyer.region,
      fulfillmentSource: "own-mill",
      channel: "storefront",
      handledBy: ["CAT", "TON", "IDN", "PRC", "PAY", "GST", "SMS", "DSP"],
    };
    addOrder(order);

    if (paymentMode === "razorpay") {
      const pay = paymentRef(data.payments.length, paymentMode);
      recordPayment({
        id: pay.id,
        orderId: order.id,
        amount: priced.total,
        mode: paymentMode,
        status: "success",
        txnRef: pay.txnRef,
        paidAt: DEMO_TODAY,
      });
      pulse("PAY", "done", `${methodLabel} captured — ${inr(priced.total)} · ${pay.txnRef}`);
      emit({
        agentId: "PAY",
        kind: "tool-result",
        level: "success",
        message: `payment.razorpay_charge → ${inr(priced.total)} paid by ${methodLabel}`,
        toolName: "payment.razorpay_charge",
        durationMs: 1200,
        payload: {
          orderNo: order.orderNo,
          amount: priced.total,
          method: methodLabel,
          txnRef: pay.txnRef,
          state: "captured",
        },
      });
    } else {
      pulse(
        "PAY",
        "tool",
        `credit.check → ${buyer.company ?? buyer.name} approved, ${inr(
          creditAvailable,
        )} head-room · ${inr(priced.total)} booked as due`,
      );
      emit({
        agentId: "PAY",
        kind: "tool-result",
        level: "warn",
        message: `payment.record_cod → ${inr(priced.total)} outstanding on 30-day terms`,
        toolName: "payment.record_cod",
        durationMs: 240,
        payload: {
          orderNo: order.orderNo,
          creditApproved: buyer.creditApproved,
          creditLimit: buyer.creditLimit,
          creditAvailableBefore: creditAvailable,
          dueAmount: priced.total,
        },
      });
    }

    /* GST invoice (FR-W-15) */
    const after = useDataStore.getState();
    const invoice = buildInvoice(
      after.orders.find((o) => o.id === order.id) ?? order,
      buyer,
      after.settings,
      after.invoices.length + 1,
    );
    addInvoice(invoice);
    pulse(
      "GST",
      "done",
      `${invoice.invoiceNo} raised — taxable ${inr(invoice.taxableValue)}, ${
        isIntraState(buyer) ? "CGST+SGST" : "IGST"
      } ${inr(invoice.cgst + invoice.sgst + invoice.igst)}`,
    );
    emit({
      agentId: "GST",
      kind: "tool-result",
      level: "success",
      message: `invoice.generate → ${invoice.invoiceNo}`,
      toolName: "invoice.generate",
      durationMs: 320,
      payload: {
        invoiceNo: invoice.invoiceNo,
        sellerGstin: invoice.sellerGstin,
        buyerGstin: invoice.buyerGstin ?? "unregistered",
        hsn: invoice.hsn,
        gstRate: invoice.gstRate,
        taxableValue: invoice.taxableValue,
        cgst: invoice.cgst,
        sgst: invoice.sgst,
        igst: invoice.igst,
        total: invoice.total,
      },
    });

    setLastOrder(order.id);
    clearCart();
    navigate("/shop/confirmation");
  }

  function startPayment() {
    setTouched(true);
    if (!detailsComplete) return;
    if (mode === "credit") {
      placeOrder("credit", "30-day credit");
      return;
    }
    setSheetOpen(true);
    setPhase("idle");
  }

  function confirmGatewayPayment() {
    const chosen = GATEWAY_METHODS.find((m) => m.id === method);
    const label = chosen?.label ?? "UPI";
    setPhase("processing");
    pulse("PAY", "tool", `Razorpay ${label} — authorising ${inr(quote.total)}`);
    timer.current = setTimeout(() => {
      timer.current = null;
      setSheetOpen(false);
      setPhase("idle");
      placeOrder("razorpay", label);
    }, 1400);
  }

  /* ── Not signed in (FR-W-08 gate) ───────────────────────────────────── */
  if (!session?.verified || !customer) {
    return (
      <ShopFrame>
        <Section eyebrow="Checkout" title="Sign in to finish this order" agentId="IDN">
          <Card pad="lg" kraft className="text-center">
            <p className="mx-auto max-w-[46ch] text-[15px] leading-relaxed text-j-ink-2">
              We need a phone number to send the order confirmation to, and to put the right name
              on the GST invoice. No password — Pehchan sends a one-time code.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2">
              <Button
                tone="primary"
                size="lg"
                iconLeft={<LogIn />}
                onClick={() =>
                  chrome.openSignIn(undefined, "Sign in to place this order and get your GST bill.")
                }
              >
                Sign in with your mobile
              </Button>
              <Link to="/shop/cart" className="text-[13px] font-semibold text-j-ink-2 hover:underline">
                Back to the basket
              </Link>
            </div>
          </Card>
        </Section>
      </ShopFrame>
    );
  }

  const intra = isIntraState({ ...customer, region });

  return (
    <ShopFrame width="wide">
      <div className="space-y-5">
        <Section
          eyebrow="Checkout"
          title={`${inr(quote.total)} payable`}
          subtitle={`${groupIndian(quote.totalBundles)} bundles · ${kg(quote.totalWeightKg)} · ${tons(
            quote.totalWeightKg,
          )} — inside the ${CAP_IN_UNITS} ceiling.`}
          agentId="PRC"
        />

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="space-y-4">
            {/* ── Delivery address ─────────────────────────────────── */}
            <Card pad="md">
              <CardHeader
                title="Delivery details"
                subtitle="We deliver across Telangana and Andhra Pradesh."
                agentId="IDN"
                divided
              />
              <div className="mt-4 space-y-3">
                <Field
                  label="Name"
                  required
                  error={touched && name.trim().length < 2 ? "Tell us who to deliver to." : undefined}
                >
                  <TextInput value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Company (optional)" hint="Shown as the buyer name on the GST invoice.">
                  <TextInput value={company} onChange={(e) => setCompany(e.target.value)} />
                </Field>
                <Field
                  label="Delivery address"
                  required
                  error={touched && address.trim().length < 4 ? "A street address is needed." : undefined}
                >
                  <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="City"
                    required
                    error={touched && city.trim().length < 2 ? "Which city?" : undefined}
                  >
                    <TextInput value={city} onChange={(e) => setCity(e.target.value)} />
                  </Field>
                  <Field label="State">
                    <Select
                      options={REGION_OPTIONS}
                      value={region}
                      onChange={(e) => setRegion(e.target.value as Region)}
                    />
                  </Field>
                </div>
                <Field label="Mobile" hint="Verified with a one-time code.">
                  <TextInput mono value={`+91 ${session.phone}`} readOnly disabled />
                </Field>
              </div>
            </Card>

            {/* ── GSTIN (FR-W-10) ──────────────────────────────────── */}
            <Card pad="md">
              <CardHeader
                title="GST details"
                subtitle="Registered buyers can claim input credit — we check the format before it reaches an invoice."
                agentId="IDN"
                divided
              />
              <div className="mt-4">
                <Field
                  label="GSTIN (optional)"
                  hint={gstinCheck.empty ? gstinCheck.message : undefined}
                  error={!gstinCheck.empty && !gstinCheck.valid ? gstinCheck.message : undefined}
                >
                  <TextInput
                    mono
                    maxLength={15}
                    placeholder="36AABCJ1234M1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    suffix={
                      gstinCheck.valid ? (
                        <BadgeCheck className="h-4 w-4 text-j-success" aria-hidden="true" />
                      ) : undefined
                    }
                  />
                </Field>
                {gstinCheck.valid ? (
                  <p className="num mt-2 text-[13px] font-semibold text-j-success">
                    {gstinCheck.message}
                  </p>
                ) : null}
                <p className="mt-3 text-[13px] leading-relaxed text-j-ink-3">
                  Seller GSTIN <span className="j-mono">{settings.sellerGstin}</span> · this supply
                  is {intra ? "intra-state, so it splits CGST + SGST" : "inter-state, so it carries a single IGST line"}.
                </p>
              </div>
            </Card>

            {/* ── Payment (FR-W-12 / FR-W-13) ──────────────────────── */}
            <Card pad="md">
              <CardHeader
                title="Payment"
                subtitle="Lenden takes the money or books it against an approved credit line."
                agentId="PAY"
                divided
              />
              <div className="mt-4 space-y-2.5">
                <PayOption
                  selected={mode === "razorpay"}
                  onSelect={() => setMode("razorpay")}
                  icon={<Lock />}
                  title="Pay now — UPI, card or net banking"
                  body={`Razorpay checkout. Order is marked Paid the moment the ${inr(
                    quote.total,
                  )} is captured.`}
                />

                {/* The conditional the BRD actually asks for: this option only
                    exists for a buyer Ajay has approved for credit. */}
                {customer.creditApproved ? (
                  <PayOption
                    selected={mode === "credit"}
                    onSelect={() => setMode("credit")}
                    disabled={!creditOk}
                    icon={<Banknote />}
                    title="Pay on delivery / 30-day credit"
                    body={
                      creditOk
                        ? `Approved trade buyer · limit ${inr(customer.creditLimit)} · ${inr(
                            creditAvailable,
                          )} still available. ${inr(quote.total)} is recorded as due.`
                        : `Approved, but this order (${inr(quote.total)}) exceeds the ${inr(
                            creditAvailable,
                          )} left on your ${inr(customer.creditLimit)} limit.`
                    }
                    badge={
                      <Badge tone={creditOk ? "success" : "warn"} size="xs" dot>
                        {creditOk ? "Credit approved" : "Over the limit"}
                      </Badge>
                    }
                  />
                ) : (
                  <div className="rounded-[calc(var(--j-radius)-4px)] border border-dashed border-j-line-strong bg-j-surface-2 p-3">
                    <div className="flex items-start gap-2.5">
                      <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-j-ink-3" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-j-ink">
                          Pay-on-delivery / credit is not available on this account
                        </p>
                        <p className="mt-1 text-[13px] leading-snug text-j-ink-2">
                          Credit is open to trade buyers {brand.ownerName} has approved in the admin
                          portal. Until that flag is set, Lenden will only take a prepaid order —
                          that is the guardrail, not a bug.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="neutral" size="xs" outline>
                            creditApproved = false
                          </Badge>
                          <AgentChip id="PAY" size="xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                tone="primary"
                size="lg"
                block
                className="mt-4"
                iconLeft={mode === "razorpay" ? <ShieldCheck /> : <Banknote />}
                disabled={mode === "credit" && !creditOk}
                onClick={startPayment}
              >
                {mode === "razorpay"
                  ? `Pay ${inr(quote.total)} securely`
                  : `Place order on credit · ${inr(quote.total)} due`}
              </Button>
              {touched && !detailsComplete ? (
                <p className="mt-2 text-center text-[13px] font-semibold text-j-danger">
                  Fill in the delivery details above first.
                </p>
              ) : null}
            </Card>
          </div>

          {/* ── Order summary ────────────────────────────────────────── */}
          <Card pad="md" className="lg:sticky lg:top-[7rem]">
            <CardHeader title="Order summary" agentId="PRC" divided />
            <ul className="mt-3 space-y-2.5">
              {lines.map((cartLine, index) => {
                const product = PRODUCT_BY_CODE[cartLine.productCode];
                const priced = quote.lines[index];
                return (
                  <li key={cartLine.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-j-ink">
                        {product.name}
                      </p>
                      <p className="num text-xs text-j-ink-3">
                        {cartLine.qty} {unitNoun(cartLine.unit, cartLine.qty)} · {cartLine.size} oz ·{" "}
                        {kg(priced?.weightKg ?? 0)}
                      </p>
                    </div>
                    <span className="num shrink-0 text-[13px] font-semibold text-j-ink">
                      {inr(priced?.linePrice ?? 0)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <dl className="num mt-4 space-y-2 border-t border-j-line pt-3 text-[14px]">
              <SummaryRow label="Subtotal (ex-GST)">{inr(quote.subtotal)}</SummaryRow>
              <SummaryRow
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
              </SummaryRow>
              {intra ? (
                <>
                  <SummaryRow label={`CGST @ ${(quote.gstRate * 50).toFixed(0)}%`}>
                    {inr(quote.gstAmount / 2)}
                  </SummaryRow>
                  <SummaryRow label={`SGST @ ${(quote.gstRate * 50).toFixed(0)}%`}>
                    {inr(quote.gstAmount / 2)}
                  </SummaryRow>
                </>
              ) : (
                <SummaryRow label={`IGST @ ${Math.round(quote.gstRate * 100)}%`}>
                  {inr(quote.gstAmount)}
                </SummaryRow>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-j-line pt-2.5">
                <dt className="text-[15px] font-semibold text-j-ink">Total payable</dt>
                <dd className="text-[26px] font-bold leading-none tracking-[-0.02em] text-j-ink">
                  {inr(quote.total)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs leading-relaxed text-j-ink-3">
              Total = line prices + delivery + GST. The same figures go on your invoice and into
              Ajay's sales and P&amp;L the moment you pay.
            </p>
          </Card>
        </div>
      </div>

      {/* ── Simulated Razorpay sheet ─────────────────────────────────── */}
      <Modal
        open={sheetOpen}
        onClose={() => {
          if (phase === "processing") return;
          setSheetOpen(false);
        }}
        dismissOnBackdrop={phase !== "processing"}
        size="sm"
        title="Razorpay"
        description={`${inr(quote.total)} to ${brand.company}`}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={phase === "processing"}
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              tone="primary"
              loading={phase === "processing"}
              onClick={confirmGatewayPayment}
            >
              {phase === "processing" ? "Authorising…" : `Pay ${inr(quote.total)}`}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="info" size="xs" mono>
              SIMULATED GATEWAY
            </Badge>
            <AgentChip id="PAY" size="xs" />
          </div>

          {GATEWAY_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={phase === "processing"}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-surface",
                method === m.id
                  ? "border-j-primary bg-j-primary-soft"
                  : "border-j-line hover:bg-j-ink/[0.04]",
              )}
            >
              <m.icon
                className={cn("h-5 w-5 shrink-0", method === m.id ? "text-j-primary" : "text-j-ink-3")}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-j-ink">{m.label}</span>
                <span className="block truncate text-xs text-j-ink-3">{m.hint}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-auto h-4 w-4 shrink-0 rounded-full border-2",
                  method === m.id ? "border-j-primary bg-j-primary" : "border-j-line-strong",
                )}
              />
            </button>
          ))}

          {phase === "processing" ? (
            <p className="num text-center text-[13px] font-semibold text-j-ink-2">
              Contacting the bank · authorising {inr(quote.total)}…
            </p>
          ) : (
            <p className="text-center text-xs leading-relaxed text-j-ink-3">
              No card details are collected or stored anywhere in this prototype — the gateway is
              simulated and always succeeds.
            </p>
          )}
        </div>
      </Modal>
    </ShopFrame>
  );
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

function SummaryRow({
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

function PayOption({
  selected,
  onSelect,
  icon,
  title,
  body,
  badge,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  body: string;
  badge?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-[calc(var(--j-radius)-4px)] border p-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-primary focus-visible:ring-offset-2 focus-visible:ring-offset-j-surface",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-j-primary bg-j-primary-soft" : "border-j-line hover:bg-j-ink/[0.04]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4",
          selected ? "bg-j-primary text-white" : "bg-j-ink/[0.055] text-j-ink-2",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-j-ink">{title}</span>
          {badge}
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-j-ink-2">{body}</span>
      </span>
    </button>
  );
}
