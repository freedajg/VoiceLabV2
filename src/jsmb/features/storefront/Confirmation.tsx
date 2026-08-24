import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Printer,
  ReceiptIndianRupee,
  Truck,
} from "lucide-react";
import {
  AgentChip,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Section,
  cn,
} from "../../ui";
import { useBrand } from "../../app/brand";
import { useAgentStore } from "../../store/agentStore";
import { useCartStore } from "../../store/cartStore";
import { useDataStore } from "../../store/dataStore";
import type { BrandProfile } from "../../contracts/stores";
import type { BusinessSettings, Customer, Invoice, Order } from "../../domain";
import {
  PRODUCT_BY_CODE,
  REGION_LABELS,
  dateLong,
  groupIndian,
  inr,
  inrPaise,
  isIntraState,
  kg,
  tons,
} from "../../domain";
import { ShopFrame } from "./ShopFrame";
import { amountInWords, unitNoun } from "./lib";

/** The DLT template a real deployment would register for FR-W-14. */
function smsBody(order: Order, invoice: Invoice | undefined, brandInitials: string): string {
  const lineCount = order.lines.length;
  const money =
    order.paymentState === "paid"
      ? `Paid ${inr(order.total)}.`
      : `${inr(order.dueAmount)} due on delivery.`;
  return [
    `${brandInitials}: Order ${order.orderNo} confirmed.`,
    `${lineCount} line${lineCount === 1 ? "" : "s"}, ${kg(order.totalWeightKg)}, ${inr(order.total)}.`,
    money,
    invoice ? `GST bill ${invoice.invoiceNo}.` : "",
    "Dispatch in 2 working days. -JAGGULA",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Confirmation() {
  const brand = useBrand();
  const lastOrderId = useCartStore((s) => s.lastOrderId);
  const orders = useDataStore((s) => s.orders);
  const customers = useDataStore((s) => s.customers);
  const invoices = useDataStore((s) => s.invoices);
  const settings = useDataStore((s) => s.settings);
  const advanceOrder = useDataStore((s) => s.advanceOrder);
  const pulse = useAgentStore((s) => s.pulse);
  const emit = useAgentStore((s) => s.emit);

  const order = orders.find((o) => o.id === lastOrderId);
  const customer = customers.find((c) => c.id === order?.customerId);
  const invoice = invoices.find((i) => i.id === order?.invoiceId);

  /* Sandesh sends the confirmation, then Vahan moves the order to Confirmed. */
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (!order || !customer || announced.current === order.id) return;
    announced.current = order.id;

    const body = smsBody(order, invoice, brand.initials.toUpperCase());
    pulse("SMS", "tool", `Confirmation sent to ••••${customer.phone.slice(-4)} — ${order.orderNo}`);
    emit({
      agentId: "SMS",
      kind: "tool-result",
      level: "success",
      message: `sms.send_dlt → ${order.orderNo} confirmation delivered`,
      toolName: "sms.send_dlt",
      durationMs: 260,
      payload: {
        header: "JSMBLD",
        template: "JSMB_ORDCONF_V2",
        to: `+91 ••••${customer.phone.slice(-4)}`,
        body,
        characters: body.length,
      },
    });

    if (order.status === "placed") advanceOrder(order.id, "confirmed");
    pulse(
      "DSP",
      "done",
      `${order.orderNo} confirmed — ${groupIndian(
        order.totalWeightKg / 25,
      )} bundles, ${tons(order.totalWeightKg)} for ${customer.city}`,
    );
    emit({
      agentId: "DSP",
      kind: "tool-result",
      level: "success",
      message: `dispatch.plan → ${tons(order.totalWeightKg)} to ${customer.city}, ${
        REGION_LABELS[order.region]
      }`,
      toolName: "dispatch.plan",
      durationMs: 300,
      payload: {
        orderNo: order.orderNo,
        status: "confirmed",
        bundles: order.totalWeightKg / 25,
        weightKg: order.totalWeightKg,
        destination: `${customer.city}, ${REGION_LABELS[order.region]}`,
        tripsAtSevenTonnes: Math.ceil(order.totalWeightKg / 7000),
      },
    });
  }, [order, customer, invoice, brand.initials, advanceOrder, pulse, emit]);

  if (!order || !customer) {
    return (
      <ShopFrame>
        <EmptyState
          kraft
          icon={<ReceiptIndianRupee />}
          title="No order to show yet"
          description="Place an order and its confirmation, SMS and GST invoice appear here."
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

  const paid = order.paymentState === "paid";
  const body = smsBody(order, invoice, brand.initials.toUpperCase());

  return (
    <ShopFrame width="wide">
      <div className="space-y-5">
        {/* ── Header ───────────────────────────────────────────────── */}
        <Card pad="lg" kraft className="print:hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="success" size="sm" icon={<CheckCircle2 />}>
                  Order confirmed
                </Badge>
                <Badge tone={paid ? "success" : "warn"} size="sm" dot>
                  {paid ? "Paid in full" : `${inr(order.dueAmount)} due`}
                </Badge>
                <AgentChip id="DSP" size="xs" />
              </div>
              <h1 className="num text-[26px] font-bold leading-tight tracking-[-0.02em] text-j-ink sm:text-[32px]">
                {order.orderNo}
              </h1>
              <p className="num mt-2 text-[15px] leading-relaxed text-j-ink-2">
                {order.lines.length} line{order.lines.length === 1 ? "" : "s"} ·{" "}
                {groupIndian(order.totalWeightKg / 25)} bundles · {kg(order.totalWeightKg)} ·
                delivering to {customer.city}, {REGION_LABELS[order.region]}.
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
                Amount
              </p>
              <p className="num text-[32px] font-bold leading-none text-j-ink">{inr(order.total)}</p>
              <p className="num mt-1 text-xs text-j-ink-3">
                {order.paymentMode === "razorpay" ? "Paid online" : "30-day credit"} ·{" "}
                {dateLong(order.placedAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/shop/account"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-j-primary px-4 text-sm font-semibold text-white"
            >
              My orders
            </Link>
            <Link
              to="/shop/catalogue"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-j-line-strong px-4 text-sm font-semibold text-j-ink-2"
            >
              Keep shopping
            </Link>
          </div>
        </Card>

        {/* ── Lifecycle (FR-W-16) ──────────────────────────────────── */}
        <Card pad="md" className="print:hidden">
          <CardHeader
            title="Where your order is"
            subtitle="Placed → Confirmed → Dispatched → Delivered. Vahan moves it; you always see the same state Ajay does."
            agentId="DSP"
            divided
          />
          <ol className="mt-4 grid grid-cols-4 gap-1">
            {(["placed", "confirmed", "dispatched", "delivered"] as const).map((step, i) => {
              const steps = ["placed", "confirmed", "dispatched", "delivered"];
              const reached = steps.indexOf(order.status) >= i;
              return (
                <li key={step} className="min-w-0">
                  <div
                    className={cn(
                      "h-1.5 rounded-full",
                      reached ? "bg-j-success" : "bg-j-ink/[0.08]",
                    )}
                  />
                  <p
                    className={cn(
                      "mt-1.5 truncate text-[11px] font-semibold capitalize",
                      reached ? "text-j-ink" : "text-j-ink-3",
                    )}
                  >
                    {step}
                  </p>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          {/* ── SMS mock (FR-W-14) ─────────────────────────────────── */}
          <Card pad="md" className="print:hidden">
            <CardHeader
              title="Confirmation SMS"
              subtitle="Sent on a DLT-registered header with an approved template."
              agentId="SMS"
              divided
            />
            <div className="mt-4 flex justify-center">
              <div className="w-full max-w-[260px] rounded-[2rem] border-[8px] border-j-console-3 bg-j-console p-0 shadow-[0_18px_40px_-18px_rgb(var(--j-ink)/0.5)]">
                <div className="relative rounded-[1.4rem] bg-j-console-2 pb-4 pt-6">
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-1.5 h-4 w-16 -translate-x-1/2 rounded-b-xl bg-j-console-3"
                  />
                  <div className="border-b border-j-console-line px-3 pb-2">
                    <p className="j-mono text-center text-[11px] font-semibold text-j-console-ink">
                      JSMBLD
                    </p>
                    <p className="text-center text-[10px] text-j-console-ink-2">
                      Transactional · today
                    </p>
                  </div>
                  <div className="px-3 pt-3">
                    <p className="rounded-2xl rounded-tl-sm bg-j-console-3 px-3 py-2.5 text-[12px] leading-relaxed text-j-console-ink">
                      {body}
                    </p>
                    <p className="mt-1.5 text-[10px] text-j-console-ink-2">
                      Delivered · {body.length} characters
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral" size="xs" mono>
                JSMB_ORDCONF_V2
              </Badge>
              <Badge tone="neutral" size="xs" outline>
                to ••••{customer.phone.slice(-4)}
              </Badge>
            </div>
          </Card>

          {/* ── GST invoice (FR-W-15) ──────────────────────────────── */}
          {invoice ? (
            <GstInvoiceView
              order={order}
              customer={customer}
              invoice={invoice}
              settings={settings}
              brand={brand}
            />
          ) : (
            <Card pad="md">
              <EmptyState
                icon={<ReceiptIndianRupee />}
                size="sm"
                title="Invoice pending"
                description="Bill is raised once the payment is captured or the credit is released."
              />
            </Card>
          )}
        </div>

        {/* ── Dispatch note ────────────────────────────────────────── */}
        <Card pad="md" flat className="print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <Truck className="h-5 w-5 shrink-0 text-j-accent" aria-hidden="true" />
            <p className="num min-w-0 flex-1 text-[13px] leading-relaxed text-j-ink-2">
              Vahan has planned {Math.ceil(order.totalWeightKg / 7000)} trip
              {Math.ceil(order.totalWeightKg / 7000) === 1 ? "" : "s"} at 7 t a load for{" "}
              {customer.city}. You will get another SMS when the boards leave the floor.
            </p>
            <AgentChip id="DSP" size="xs" />
          </div>
        </Card>
      </div>
    </ShopFrame>
  );
}

/* ── The bill ──────────────────────────────────────────────────────────── */

function GstInvoiceView({
  order,
  customer,
  invoice,
  settings,
  brand,
}: {
  order: Order;
  customer: Customer;
  invoice: Invoice;
  settings: BusinessSettings;
  brand: BrandProfile;
}) {
  const intra = isIntraState(customer);
  const halfRate = (invoice.gstRate * 100) / 2;

  return (
    <Card pad="none" className="overflow-hidden print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-j-line bg-j-surface-2 px-4 py-3 print:hidden">
        <div className="flex items-center gap-2">
          <ReceiptIndianRupee className="h-4 w-4 text-j-ink-3" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-j-ink">GST invoice</span>
          <AgentChip id="GST" size="xs" />
        </div>
        <Button size="sm" variant="soft" iconLeft={<Printer />} onClick={() => window.print()}>
          Print / save
        </Button>
      </div>

      {/* The bill itself — laid out the way a printed tax invoice is. */}
      <div className="num p-4 text-[12px] leading-snug text-j-ink sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-j-ink pb-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-tight">{brand.legalName}</p>
            <p className="mt-1 text-j-ink-2">
              {brand.city}, {REGION_LABELS.telangana}, India
            </p>
            <p className="mt-1 font-semibold">
              GSTIN <span className="j-mono">{invoice.sellerGstin}</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em]">Tax Invoice</p>
            <p className="mt-1 text-j-ink-2">Original for recipient</p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-j-line pb-3 sm:grid-cols-4">
          <Meta label="Invoice no." value={invoice.invoiceNo} mono />
          <Meta label="Invoice date" value={dateLong(invoice.issuedAt)} />
          <Meta label="Order no." value={order.orderNo} mono />
          <Meta
            label="Place of supply"
            value={`${REGION_LABELS[customer.region]} (${customer.gstin?.slice(0, 2) ?? (customer.region === "andhra-pradesh" ? "37" : "36")})`}
          />
        </dl>

        <div className="mt-3 grid gap-3 border-b border-j-line pb-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Billed to
            </p>
            <p className="mt-1 text-[13px] font-semibold">{invoice.buyerName}</p>
            <p className="mt-0.5 text-j-ink-2">{invoice.buyerAddress}</p>
            <p className="mt-0.5 text-j-ink-2">
              {REGION_LABELS[customer.region]} · +91 {customer.phone}
            </p>
            <p className="mt-1">
              GSTIN{" "}
              <span className="j-mono font-semibold">
                {invoice.buyerGstin ?? "Unregistered (B2C)"}
              </span>
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Shipped to
            </p>
            <p className="mt-1 text-j-ink-2">
              {customer.address}, {customer.city}
            </p>
            <p className="mt-1 text-j-ink-2">
              Reverse charge: No · Supply type: {intra ? "Intra-state" : "Inter-state"}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-j-ink/30 text-[10px] uppercase tracking-[0.1em] text-j-ink-3">
                <th className="py-1.5 pr-2 font-semibold">#</th>
                <th className="py-1.5 pr-2 font-semibold">Description of goods</th>
                <th className="py-1.5 pr-2 font-semibold">HSN</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Qty</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Rate</th>
                <th className="py-1.5 text-right font-semibold">Taxable value</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, i) => {
                const product = PRODUCT_BY_CODE[line.productCode];
                const bundles = line.weightKg / 25;
                return (
                  <tr key={line.id} className="border-b border-j-line align-top">
                    <td className="py-2 pr-2 text-j-ink-3">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <span className="font-semibold">{product.name}</span>
                      <span className="block text-j-ink-3">
                        {line.size} oz · {product.patternLabel} · {line.qty}{" "}
                        {unitNoun(line.unit, line.qty)} · {kg(line.weightKg)}
                      </span>
                    </td>
                    <td className="j-mono py-2 pr-2">{invoice.hsn}</td>
                    <td className="py-2 pr-2 text-right">{groupIndian(bundles)} bdl</td>
                    <td className="py-2 pr-2 text-right">{inrPaise(line.unitPricePerBundle)}</td>
                    <td className="py-2 text-right font-semibold">{inrPaise(line.linePrice)}</td>
                  </tr>
                );
              })}
              {order.deliveryCharge > 0 ? (
                <tr className="border-b border-j-line">
                  <td className="py-2 pr-2 text-j-ink-3">{order.lines.length + 1}</td>
                  <td className="py-2 pr-2" colSpan={4}>
                    <span className="font-semibold">Delivery &amp; handling</span>
                    <span className="block text-j-ink-3">
                      Composite supply — taxed with the goods
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {inrPaise(order.deliveryCharge)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Amount in words
            </p>
            <p className="mt-1 font-semibold">{amountInWords(invoice.total)}</p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
              Declaration
            </p>
            <p className="mt-1 max-w-[46ch] text-j-ink-2">
              We declare that this invoice shows the actual price of the goods described and that
              all particulars are true and correct. Goods once sold are not taken back.
            </p>
          </div>

          <dl className="w-full shrink-0 space-y-1.5 sm:w-[240px]">
            <InvoiceRow label="Taxable value">{inrPaise(invoice.taxableValue)}</InvoiceRow>
            {intra ? (
              <>
                <InvoiceRow label={`CGST @ ${halfRate}%`}>{inrPaise(invoice.cgst)}</InvoiceRow>
                <InvoiceRow label={`SGST @ ${halfRate}%`}>{inrPaise(invoice.sgst)}</InvoiceRow>
              </>
            ) : (
              <InvoiceRow label={`IGST @ ${invoice.gstRate * 100}%`}>
                {inrPaise(invoice.igst)}
              </InvoiceRow>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t-2 border-j-ink pt-2">
              <dt className="text-[13px] font-bold">Invoice total</dt>
              <dd className="text-[16px] font-bold">{inrPaise(invoice.total)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-j-ink-2">Paid</dt>
              <dd className="font-semibold">{inrPaise(order.paidAmount)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-j-ink-2">Balance due</dt>
              <dd
                className={cn(
                  "font-semibold",
                  order.dueAmount > 0 ? "text-j-danger" : "text-j-success",
                )}
              >
                {inrPaise(order.dueAmount)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-j-line pt-3">
          <p className="max-w-[40ch] text-[10px] leading-relaxed text-j-ink-3">
            HSN {invoice.hsn} · GST rate {invoice.gstRate * 100}% (open item D1 in the BRD — the
            rate is a setting, not a hardcoded figure). Subject to {brand.city} jurisdiction.
          </p>
          <div className="text-right">
            <p className="text-j-ink-2">For {brand.legalName}</p>
            <p className="mt-6 border-t border-j-ink pt-1 text-[11px] font-semibold">
              Authorised signatory
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
        {label}
      </dt>
      <dd className={cn("mt-0.5 truncate font-semibold", mono && "j-mono")}>{value}</dd>
    </div>
  );
}

function InvoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-j-ink-2">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
