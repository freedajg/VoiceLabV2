/**
 * Enquiries funnel — the admin half of FR-W-17 / FR-W-18, and the funnel report
 * of BRD §11.
 *
 * Both storefront forms land in one list. Ajay moves a lead new → contacted →
 * converted → closed, and every move is written through `updateEnquiry`, so the
 * dashboard's "new enquiries" tile changes as he works.
 *
 * Converting is real: it books an offline order for the estimated tonnage
 * through the same `quoteOrder` engine the storefront uses, registers the buyer
 * if they are new, and links the enquiry to the order it became. A 20 t+ lead
 * is exactly the order the website cannot take (FR-W-05), which is why it
 * arrives here in the first place.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleSlash,
  Inbox,
  PhoneCall,
  Truck,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataGridToolbar,
  EmptyState,
  Field,
  Modal,
  NumberStepper,
  Pill,
  Select,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Td,
  Th,
  cn,
  useChartTheme,
} from "../../ui";
import {
  KG_PER_LOT,
  KG_PER_TON,
  MAX_ORDER_KG,
  PRODUCTS,
  REGION_LABELS,
  dateLong,
  dateShort,
  inr,
  quoteOrder,
  round2,
  tons,
} from "../../domain";
import type {
  Customer,
  Enquiry,
  EnquiryStatus,
  Order,
  ProductCode,
} from "../../domain/types";
import { useDataStore } from "../../store/dataStore";
import { AdminPage, TODAY, useAdminData, useAgentPulse } from "./shared";

const STAGES: { key: EnquiryStatus; label: string; blurb: string }[] = [
  { key: "new", label: "New", blurb: "Arrived, nobody has called yet" },
  { key: "contacted", label: "Contacted", blurb: "Spoken to, quote in play" },
  { key: "converted", label: "Converted", blurb: "Became a real order" },
  { key: "closed", label: "Closed", blurb: "Lapsed or declined" },
];

const STAGE_TONE: Record<EnquiryStatus, "info" | "primary" | "success" | "neutral"> = {
  new: "info",
  contacted: "primary",
  converted: "success",
  closed: "neutral",
};

export function AdminEnquiries() {
  const { data } = useAdminData();
  const updateEnquiry = useDataStore((s) => s.updateEnquiry);
  const { say } = useAgentPulse();
  const theme = useChartTheme("product");

  const [params] = useSearchParams();
  const [filter, setFilter] = useState<EnquiryStatus | "all">(() => {
    const status = params.get("status");
    return status === "new" || status === "contacted" || status === "converted" || status === "closed"
      ? status
      : "all";
  });
  const [query, setQuery] = useState("");
  const [converting, setConverting] = useState<Enquiry | null>(null);

  const counts = useMemo(() => {
    const out: Record<EnquiryStatus, number> = { new: 0, contacted: 0, converted: 0, closed: 0 };
    for (const enquiry of data.enquiries) out[enquiry.status] += 1;
    return out;
  }, [data.enquiries]);

  const pipelineTonnes = useMemo(
    () =>
      round2(
        data.enquiries
          .filter((e) => e.status === "new" || e.status === "contacted")
          .reduce((s, e) => s + (e.estTonnage ?? 0), 0),
      ),
    [data.enquiries],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.enquiries
      .filter((e) => (filter === "all" ? true : e.status === filter))
      .filter((e) =>
        q ? `${e.name} ${e.phone} ${e.address} ${e.issue}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [data.enquiries, filter, query]);

  const total = data.enquiries.length;
  const conversion = total > 0 ? counts.converted / total : 0;

  function move(enquiry: Enquiry, status: EnquiryStatus) {
    updateEnquiry(enquiry.id, { status });
    say(
      "LED",
      `${enquiry.name} moved to ${status} — ${
        enquiry.estTonnage ? `${enquiry.estTonnage} t enquiry` : enquiry.kind === "contact" ? "general enquiry" : "large-order enquiry"
      } raised ${dateShort(enquiry.createdAt)}.`,
    );
  }

  return (
    <AdminPage
      eyebrow="Leads"
      title="Enquiries"
      crumb="Enquiries"
      subtitle="Every large-order and contact form from the website, in one funnel: new → contacted → converted → closed."
      agentId="LED"
    >
      <StatGrid columns={4}>
        <StatCell>
          <Stat label="Total enquiries" value={total} icon={<Inbox />} agentId="LED" />
        </StatCell>
        <StatCell>
          <Stat
            label="Awaiting a call"
            value={counts.new}
            tone={counts.new > 0 ? "info" : "neutral"}
            icon={<PhoneCall />}
            agentId="LED"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Tonnes in the pipeline"
            value={pipelineTonnes.toFixed(0)}
            unit="t"
            hint="New and contacted leads with an estimate"
            icon={<Truck />}
            agentId="TON"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Conversion"
            value={`${(conversion * 100).toFixed(0)}%`}
            tone={conversion >= 0.25 ? "success" : "warn"}
            hint={`${counts.converted} of ${total} became orders`}
            agentId="LED"
          />
        </StatCell>
      </StatGrid>

      <Card>
        <CardHeader
          title="Funnel"
          subtitle="Where the leads currently sit. Stages are ordered, so the shade deepens along the funnel."
          agentId="LED"
          divided
          className="mb-4"
        />
        <ul className="space-y-3">
          {STAGES.map((stage, i) => {
            const count = counts[stage.key];
            const share = total > 0 ? count / total : 0;
            return (
              <li key={stage.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-j-ink">
                    {stage.label}
                    <span className="ml-2 text-xs font-normal text-j-ink-3">{stage.blurb}</span>
                  </span>
                  <span className="num text-[13px] font-semibold tabular-nums text-j-ink">
                    {count}
                    <span className="ml-1 text-xs font-normal text-j-ink-3">
                      {(share * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-j-ink/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(share * 100, count > 0 ? 2 : 0)}%`,
                      backgroundColor: theme.sequential[i + 1] ?? theme.sequential[4],
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Enquiry list"
          subtitle="Name, address, phone, requirement and estimated tonnage, with the timestamp it arrived."
          agentId="LED"
          divided
          className="mb-4"
        />
        <DataGridToolbar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Name, phone, requirement",
            label: "Search enquiries",
          }}
          count={{ shown: rows.length, total, noun: "enquiries" }}
          filters={
            <>
              <Pill selected={filter === "all"} onClick={() => setFilter("all")}>
                All
              </Pill>
              {STAGES.map((stage) => (
                <Pill
                  key={stage.key}
                  selected={filter === stage.key}
                  tone={STAGE_TONE[stage.key]}
                  count={counts[stage.key]}
                  onClick={() => setFilter(stage.key)}
                >
                  {stage.label}
                </Pill>
              ))}
            </>
          }
        />

        <div className="mt-4">
          {rows.length === 0 ? (
            <EmptyState size="sm" title="No enquiries here" description="Try another stage." />
          ) : (
            <Table caption="Enquiries">
              <thead>
                <tr>
                  <Th>Received</Th>
                  <Th>Lead</Th>
                  <Th>Requirement</Th>
                  <Th numeric>Est. tonnage</Th>
                  <Th>Status</Th>
                  <Th>Move to</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((enquiry) => {
                  const linkedOrder = enquiry.convertedOrderId
                    ? data.orders.find((o) => o.id === enquiry.convertedOrderId)
                    : undefined;
                  return (
                    <tr key={enquiry.id}>
                      <Td muted nowrap>
                        {dateLong(enquiry.createdAt)}
                        <span className="block text-xs text-j-ink-3">
                          {enquiry.kind === "large-order" ? "Large-order form" : "Contact form"}
                        </span>
                      </Td>
                      <Td>
                        <span className="block font-semibold">{enquiry.name}</span>
                        <span className="j-mono block text-xs text-j-ink-3">{enquiry.phone}</span>
                        <span className="block text-xs text-j-ink-3">
                          {enquiry.address} · {REGION_LABELS[enquiry.region]}
                        </span>
                      </Td>
                      <Td>
                        <span className="block max-w-[26rem] text-[13px]">{enquiry.issue}</span>
                        {enquiry.extraInfo ? (
                          <span className="block max-w-[26rem] text-xs text-j-ink-3">
                            {enquiry.extraInfo}
                          </span>
                        ) : null}
                      </Td>
                      <Td numeric strong>
                        {enquiry.estTonnage ? `${enquiry.estTonnage} t` : "—"}
                      </Td>
                      <Td>
                        <Badge tone={STAGE_TONE[enquiry.status]} size="sm" dot>
                          {enquiry.status}
                        </Badge>
                        {linkedOrder ? (
                          <span className="j-mono mt-1 block text-xs text-j-ink-3">
                            {linkedOrder.orderNo}
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          {enquiry.status === "new" ? (
                            <Button
                              size="xs"
                              variant="soft"
                              tone="primary"
                              iconLeft={<PhoneCall />}
                              onClick={() => move(enquiry, "contacted")}
                            >
                              Contacted
                            </Button>
                          ) : null}
                          {enquiry.status !== "converted" ? (
                            <Button
                              size="xs"
                              variant="soft"
                              tone="success"
                              iconLeft={<CheckCircle2 />}
                              onClick={() => setConverting(enquiry)}
                            >
                              Convert
                            </Button>
                          ) : null}
                          {enquiry.status !== "closed" && enquiry.status !== "converted" ? (
                            <Button
                              size="xs"
                              variant="ghost"
                              iconLeft={<CircleSlash />}
                              onClick={() => move(enquiry, "closed")}
                            >
                              Close
                            </Button>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <ConvertModal
        key={converting?.id ?? "no-enquiry"}
        enquiry={converting}
        onClose={() => setConverting(null)}
      />
    </AdminPage>
  );
}

/* ── Conversion ────────────────────────────────────────────────────────── */

function ConvertModal({ enquiry, onClose }: { enquiry: Enquiry | null; onClose: () => void }) {
  const { data } = useAdminData();
  const addOrder = useDataStore((s) => s.addOrder);
  const upsertCustomer = useDataStore((s) => s.upsertCustomer);
  const convertEnquiry = useDataStore((s) => s.convertEnquiry);
  const { say, note } = useAgentPulse();

  const [productCode, setProductCode] = useState<ProductCode>("P-PT");
  const [lots, setLots] = useState(0);
  const [onCredit, setOnCredit] = useState(true);

  // Reset the form each time a different enquiry is opened.
  const seedLots = enquiry?.estTonnage
    ? Math.max(1, Math.round((enquiry.estTonnage * KG_PER_TON) / KG_PER_LOT))
    : 10;
  const effectiveLots = lots > 0 ? lots : seedLots;

  const product = PRODUCTS.find((p) => p.code === productCode) ?? PRODUCTS[0];
  const quote = useMemo(
    () =>
      quoteOrder(
        [{ productCode: product.code, size: product.sizes[0], unit: "lot", qty: effectiveLots }],
        { costConfig: data.costConfig, settings: data.settings, region: enquiry?.region },
      ),
    [product, effectiveLots, data.costConfig, data.settings, enquiry?.region],
  );

  if (!enquiry) return null;

  const existing: Customer | undefined = data.customers.find((c) => c.phone === enquiry.phone);

  function confirm() {
    if (!enquiry) return;
    const seq = data.enquiries.findIndex((e) => e.id === enquiry.id) + 1;
    const customerId = existing?.id ?? `cus-enq-${String(seq).padStart(3, "0")}`;

    if (!existing) {
      upsertCustomer({
        id: customerId,
        name: enquiry.name,
        phone: enquiry.phone,
        address: enquiry.address,
        city: enquiry.address.split(",").slice(-1)[0]?.trim() || enquiry.address,
        region: enquiry.region,
        segment: "trade",
        creditApproved: onCredit,
        creditLimit: onCredit ? Math.ceil(quote.total / 100000) * 100000 : 0,
        createdAt: TODAY,
        notes: `Converted from enquiry ${enquiry.id} on ${TODAY}.`,
      });
    }

    const orderId = `ord-cnv-${String(seq).padStart(3, "0")}`;
    const order: Order = {
      id: orderId,
      orderNo: `JSMB-2026-C${String(seq).padStart(3, "0")}`,
      customerId,
      placedAt: TODAY,
      status: "confirmed",
      lines: quote.lines.map((line, i) => ({ ...line, id: `${orderId}-L${i + 1}` })),
      totalWeightKg: quote.totalWeightKg,
      subtotal: quote.subtotal,
      deliveryCharge: quote.deliveryCharge,
      gstRate: quote.gstRate,
      gstAmount: quote.gstAmount,
      total: quote.total,
      paidAmount: 0,
      dueAmount: quote.total,
      paymentState: onCredit ? "due" : "pending",
      paymentMode: onCredit ? "credit" : "razorpay",
      margin: quote.margin,
      region: enquiry.region,
      fulfillmentSource: "own-mill",
      channel: "enquiry",
      handledBy: ["LED", "TON", "PRC", "PAY"],
    };

    addOrder(order);
    convertEnquiry(enquiry.id, orderId);

    say(
      "LED",
      `${enquiry.name} converted — ${order.orderNo} booked for ${tons(order.totalWeightKg)} at ${inr(order.total)} inclusive of GST.`,
    );
    note(
      "PRC",
      `Standard margin on ${order.orderNo}: ${inr(order.margin)} (${inr(round2(order.margin / order.totalWeightKg))}/kg).`,
    );
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Convert ${enquiry.name} into an order`}
      description={`${enquiry.issue} — raised ${dateLong(enquiry.createdAt)}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" iconRight={<ArrowRight />} onClick={confirm}>
            Book {tons(quote.totalWeightKg)} order
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product" hint="Priced through the same engine as the storefront cart.">
            <Select
              value={productCode}
              onChange={(e) => setProductCode(e.target.value as ProductCode)}
              options={PRODUCTS.map((p) => ({ value: p.code, label: `${p.name} — ₹${p.pricePerBundle}/bundle` }))}
            />
          </Field>
          <Field
            label="Quantity in lots"
            hint={`1 lot = 20 bundles = ${KG_PER_LOT} kg. The enquiry estimated ${enquiry.estTonnage ?? "—"} t.`}
          >
            <NumberStepper
              value={effectiveLots}
              onChange={setLots}
              min={1}
              max={400}
              unit="lots"
              aria-label="Quantity in lots"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-j-line bg-j-surface-2 px-4 py-3">
          <dl className="space-y-1.5 text-[13px]">
            <Row label="Weight" value={`${tons(quote.totalWeightKg)} · ${quote.totalBundles} bundles`} />
            <Row label="Subtotal (ex-GST)" value={inr(quote.subtotal)} />
            <Row label="Delivery" value={quote.deliveryCharge > 0 ? inr(quote.deliveryCharge) : "Free (over threshold)"} />
            <Row label={`GST @ ${(quote.gstRate * 100).toFixed(0)}%`} value={inr(quote.gstAmount)} />
            <Row label="Order total" value={inr(quote.total)} strong />
            <Row label="Standard margin" value={`${inr(quote.margin)} · ${(quote.marginPct * 100).toFixed(1)}%`} />
          </dl>
        </div>

        <label className="flex items-start gap-2 text-[13px] text-j-ink-2">
          <input
            type="checkbox"
            checked={onCredit}
            onChange={(e) => setOnCredit(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-j-line text-j-primary"
          />
          <span>
            Book on 30-day credit and approve this buyer for COD.{" "}
            {existing ? (
              <span className="text-j-ink-3">
                {existing.name} is already on the books
                {existing.creditApproved ? " and credit-approved." : " on prepaid terms."}
              </span>
            ) : (
              <span className="text-j-ink-3">
                A new customer record will be created from the enquiry details.
              </span>
            )}
          </span>
        </label>

        <p className="text-xs text-j-ink-3">
          This is above the {MAX_ORDER_KG / KG_PER_TON} t self-service cap, which is why it arrived as an
          enquiry rather than a website order. Booking it here puts it into the same order book the
          Sales and P&L modules read.
        </p>
      </div>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-j-ink-2">{label}</dt>
      <dd className={cn("num tabular-nums", strong ? "font-semibold text-j-ink" : "text-j-ink")}>
        {value}
      </dd>
    </div>
  );
}
