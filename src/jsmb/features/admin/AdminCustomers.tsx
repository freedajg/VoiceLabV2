/**
 * Module 1 — Customers database (FR-A-03, FR-A-04, FR-A-05).
 *
 * The grid answers FR-A-03 (search across name, phone, company, GSTIN, city;
 * order count, value, paid and due). Opening a row answers FR-A-05: the full
 * order-and-payment ledger from `computeLedger`, whose totals are the only
 * source for the dues shown in the grid, so the two can never disagree.
 *
 * The credit switch is FR-A-04 and it is not cosmetic: `setCreditApproval`
 * writes the flag the storefront reads at checkout, so flipping it here changes
 * whether that buyer is offered COD/credit. The panel says so out loud.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, CreditCard, Info, Phone } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataGridToolbar,
  Drawer,
  EmptyState,
  Field,
  Pill,
  ProgressMeter,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Td,
  Th,
  Toggle,
  Tr,
  TextInput,
  type SortDirection,
} from "../../ui";
import {
  REGION_LABELS,
  computeLedger,
  dateShort,
  inr,
  inrCompact,
  round2,
} from "../../domain";
import type { Customer, CustomerLedger, OrderStatus } from "../../domain/types";
import { useDataStore } from "../../store/dataStore";
import { AdminPage, ReconcileNote, paginate, useAdminData, useAgentPulse } from "./shared";

const PAGE_SIZE = 12;

type SortKey = "name" | "orders" | "ordered" | "paid" | "due";
type Flag = "all" | "credit" | "dues" | "over-limit";

interface CustomerRow {
  customer: Customer;
  orders: number;
  ordered: number;
  paid: number;
  due: number;
  lastOrderAt: string | null;
  overLimit: boolean;
}

const STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "primary" | "success" | "danger"> = {
  placed: "neutral",
  confirmed: "info",
  dispatched: "primary",
  delivered: "success",
  cancelled: "danger",
};

export function AdminCustomers() {
  const { data, input } = useAdminData();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [flag, setFlag] = useState<Flag>(() => (params.get("flag") as Flag | null) ?? "all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDirection }>({
    key: "due",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(() => params.get("customer"));

  // Deep links from the dashboard land here — ?customer=… opens the ledger,
  // ?flag=over-limit pre-filters the grid.
  useEffect(() => {
    const wanted = params.get("customer");
    if (wanted) setOpenId(wanted);
    const wantedFlag = params.get("flag") as Flag | null;
    if (wantedFlag) setFlag(wantedFlag);
  }, [params]);

  const rows = useMemo<CustomerRow[]>(() => {
    const byCustomer = new Map<string, { orders: number; ordered: number; paid: number; due: number; last: string | null }>();
    for (const order of data.orders) {
      if (order.status === "cancelled") continue;
      const acc = byCustomer.get(order.customerId) ?? {
        orders: 0,
        ordered: 0,
        paid: 0,
        due: 0,
        last: null,
      };
      acc.orders += 1;
      acc.ordered = round2(acc.ordered + order.total);
      acc.paid = round2(acc.paid + order.paidAmount);
      acc.due = round2(acc.due + order.dueAmount);
      acc.last = acc.last === null || order.placedAt > acc.last ? order.placedAt : acc.last;
      byCustomer.set(order.customerId, acc);
    }
    return data.customers.map((customer) => {
      const acc = byCustomer.get(customer.id);
      const due = acc?.due ?? 0;
      return {
        customer,
        orders: acc?.orders ?? 0,
        ordered: acc?.ordered ?? 0,
        paid: acc?.paid ?? 0,
        due,
        lastOrderAt: acc?.last ?? null,
        overLimit: due > customer.creditLimit,
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = rows.filter((row) => {
      const c = row.customer;
      const haystack = `${c.name} ${c.company ?? ""} ${c.phone} ${c.address} ${c.city} ${c.gstin ?? ""}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (flag === "credit") return c.creditApproved;
      if (flag === "dues") return row.due > 0;
      if (flag === "over-limit") return row.overLimit && row.due > 0;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.customer.name.localeCompare(b.customer.name) * dir;
        case "orders":
          return (a.orders - b.orders) * dir;
        case "ordered":
          return (a.ordered - b.ordered) * dir;
        case "paid":
          return (a.paid - b.paid) * dir;
        case "due":
          return (a.due - b.due) * dir;
      }
    });
  }, [rows, query, flag, sort]);

  const totals = useMemo(
    () => ({
      ordered: round2(filtered.reduce((s, r) => s + r.ordered, 0)),
      paid: round2(filtered.reduce((s, r) => s + r.paid, 0)),
      due: round2(filtered.reduce((s, r) => s + r.due, 0)),
      credit: filtered.filter((r) => r.customer.creditApproved).length,
    }),
    [filtered],
  );

  const pageRows = paginate(filtered, page, PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  function toggleSort(key: SortKey) {
    setPage(0);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  function openCustomer(id: string | null) {
    setOpenId(id);
    const next = new URLSearchParams(params);
    if (id) next.set("customer", id);
    else next.delete("customer");
    setParams(next, { replace: true });
  }

  const ledger = useMemo<CustomerLedger | null>(() => {
    if (!openId) return null;
    if (!data.customers.some((c) => c.id === openId)) return null;
    return computeLedger(input, openId);
  }, [openId, data.customers, input]);

  return (
    <AdminPage
      eyebrow="Module 1"
      title="Customers"
      crumb="Customers"
      subtitle="Search the book, see what each buyer has ordered and owes, and decide who may buy on credit."
      agentId="IDN"
    >
      <StatGrid columns={4}>
        <StatCell>
          <Stat label="Customers" value={filtered.length} unit={`of ${rows.length}`} agentId="IDN" />
        </StatCell>
        <StatCell>
          <Stat label="Ordered (incl. GST)" value={inrCompact(totals.ordered)} agentId="PRC" />
        </StatCell>
        <StatCell>
          <Stat label="Collected" value={inrCompact(totals.paid)} tone="success" agentId="PAY" />
        </StatCell>
        <StatCell>
          <Stat
            label="Outstanding"
            value={inrCompact(totals.due)}
            tone={totals.due > 0 ? "warn" : "neutral"}
            hint={`${totals.credit} credit-approved buyers`}
            agentId="PAY"
          />
        </StatCell>
      </StatGrid>

      <Card pad="md">
        <DataGridToolbar
          search={{
            value: query,
            onChange: (v) => {
              setQuery(v);
              setPage(0);
            },
            placeholder: "Name, phone, firm, GSTIN, city",
            label: "Search customers",
          }}
          count={{ shown: filtered.length, total: rows.length, noun: "customers" }}
          filters={
            <>
              {(
                [
                  { key: "all", label: "All" },
                  { key: "credit", label: "Credit-approved" },
                  { key: "dues", label: "Has dues" },
                  { key: "over-limit", label: "Over limit" },
                ] as { key: Flag; label: string }[]
              ).map((option) => (
                <Pill
                  key={option.key}
                  selected={flag === option.key}
                  onClick={() => {
                    setFlag(option.key);
                    setPage(0);
                  }}
                >
                  {option.label}
                </Pill>
              ))}
            </>
          }
        />

        <div className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              size="sm"
              title="No customer matches"
              description="Try a shorter search, or clear the filter."
            />
          ) : (
            <Table dense striped caption="Customer database">
              <thead>
                <tr>
                  <Th sortable sortDirection={sort.key === "name" ? sort.dir : null} onSort={() => toggleSort("name")}>
                    Customer
                  </Th>
                  <Th>Phone</Th>
                  <Th>Place</Th>
                  <Th>GSTIN</Th>
                  <Th numeric sortable sortDirection={sort.key === "orders" ? sort.dir : null} onSort={() => toggleSort("orders")}>
                    Orders
                  </Th>
                  <Th numeric sortable sortDirection={sort.key === "ordered" ? sort.dir : null} onSort={() => toggleSort("ordered")}>
                    Ordered
                  </Th>
                  <Th numeric sortable sortDirection={sort.key === "paid" ? sort.dir : null} onSort={() => toggleSort("paid")}>
                    Paid
                  </Th>
                  <Th numeric sortable sortDirection={sort.key === "due" ? sort.dir : null} onSort={() => toggleSort("due")}>
                    Due
                  </Th>
                  <Th>Credit</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <Tr
                    key={row.customer.id}
                    interactive
                    onClick={() => openCustomer(row.customer.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openCustomer(row.customer.id);
                      }
                    }}
                  >
                    <Td strong>
                      <span className="block truncate">{row.customer.name}</span>
                      {row.customer.company ? (
                        <span className="block truncate text-xs font-normal text-j-ink-3">
                          {row.customer.company}
                        </span>
                      ) : null}
                    </Td>
                    <Td mono muted nowrap>
                      {row.customer.phone}
                    </Td>
                    <Td muted nowrap>
                      {row.customer.city}
                    </Td>
                    <Td mono muted nowrap>
                      {row.customer.gstin ?? "—"}
                    </Td>
                    <Td numeric>{row.orders}</Td>
                    <Td numeric>{inr(row.ordered)}</Td>
                    <Td numeric>{inr(row.paid)}</Td>
                    <Td numeric strong className={row.overLimit ? "text-j-danger" : undefined}>
                      {row.due > 0 ? inr(row.due) : "—"}
                    </Td>
                    <Td>
                      {row.customer.creditApproved ? (
                        <Badge tone={row.overLimit ? "danger" : "success"} size="xs" dot>
                          {row.overLimit ? "Over limit" : inrCompact(row.customer.creditLimit)}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="xs">
                          Prepaid only
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {pageCount > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="num text-xs tabular-nums text-j-ink-3">
              Page {page + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <CustomerPanel ledger={ledger} onClose={() => openCustomer(null)} />
    </AdminPage>
  );
}

/* ── Detail panel — FR-A-04 + FR-A-05 ──────────────────────────────────── */

function CustomerPanel({ ledger, onClose }: { ledger: CustomerLedger | null; onClose: () => void }) {
  const setCreditApproval = useDataStore((s) => s.setCreditApproval);
  const { say, note } = useAgentPulse();
  const [limitDraft, setLimitDraft] = useState("");

  const customer = ledger?.customer;

  useEffect(() => {
    setLimitDraft(customer ? String(customer.creditLimit) : "");
  }, [customer?.id, customer?.creditLimit]);

  if (!ledger || !customer) return null;

  const live = ledger.entries.filter((e) => e.status !== "cancelled");
  const usedPct = customer.creditLimit > 0 ? ledger.totalDue / customer.creditLimit : 0;

  function applyApproval(approved: boolean, limit: number) {
    // The early return above narrows these for the render body, but not inside
    // a closure, so the guard is repeated here rather than asserted away.
    if (!ledger || !customer) return;
    setCreditApproval(customer.id, approved, limit);
    if (approved) {
      say(
        "PAY",
        `Credit approved for ${customer.name} — limit ${inr(limit)}. COD and 30-day credit now appear at checkout for this buyer.`,
      );
      note(
        "PAY",
        `Head-room after ${inr(ledger.totalDue)} outstanding: ${inr(round2(limit - ledger.totalDue))}.`,
      );
    } else {
      say(
        "PAY",
        `Credit withdrawn for ${customer.name}. Checkout will now offer online payment only; ${inr(ledger.totalDue)} stays outstanding.`,
      );
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      surface="product"
      width="w-full sm:w-[34rem]"
      title={customer.name}
      subtitle={`${customer.company ? `${customer.company} · ` : ""}${customer.city}, ${REGION_LABELS[customer.region]}`}
      headerActions={
        <Badge tone={customer.creditApproved ? "success" : "neutral"} size="sm" dot>
          {customer.creditApproved ? "Credit-approved" : "Prepaid only"}
        </Badge>
      }
    >
      <div className="space-y-5 px-4 py-4">
        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <dt className="text-xs text-j-ink-3">Phone</dt>
            <dd className="j-mono mt-0.5 flex items-center gap-1.5 text-j-ink">
              <Phone className="h-3.5 w-3.5 text-j-ink-3" aria-hidden="true" />
              {customer.phone}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-j-ink-3">Company GSTIN</dt>
            <dd className="j-mono mt-0.5 text-j-ink">{customer.gstin ?? "Not registered"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-j-ink-3">Address</dt>
            <dd className="mt-0.5 text-j-ink">{customer.address}</dd>
          </div>
          <div>
            <dt className="text-xs text-j-ink-3">Segment</dt>
            <dd className="mt-0.5 capitalize text-j-ink">{customer.segment}</dd>
          </div>
          <div>
            <dt className="text-xs text-j-ink-3">On the books since</dt>
            <dd className="mt-0.5 text-j-ink">{dateShort(customer.createdAt)}</dd>
          </div>
        </dl>

        {/* FR-A-04 — the switch with a stated consequence. */}
        <Card flat pad="sm" className="space-y-3">
          <CardHeader
            title="Credit & pay-on-delivery"
            eyebrow="FR-A-04"
            icon={<CreditCard />}
            agentId="PAY"
          />
          <Toggle
            checked={customer.creditApproved}
            onChange={(next) => applyApproval(next, next ? Number(limitDraft) || customer.creditLimit : 0)}
            label={customer.creditApproved ? "Approved for COD / credit" : "Prepaid only"}
            description={
              customer.creditApproved
                ? "Checkout shows pay-on-delivery and 30-day credit to this buyer."
                : "Checkout hides pay-on-delivery; this buyer must pay online."
            }
          />
          {customer.creditApproved ? (
            <>
              <Field
                label="Credit limit"
                hint="The ceiling the storefront checks a new basket against."
              >
                <div className="flex items-center gap-2">
                  <TextInput
                    inputSize="sm"
                    inputMode="numeric"
                    prefix="₹"
                    mono
                    value={limitDraft}
                    onChange={(e) => setLimitDraft(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                  <Button
                    size="sm"
                    tone="primary"
                    disabled={Number(limitDraft) === customer.creditLimit || limitDraft === ""}
                    onClick={() => applyApproval(true, Number(limitDraft))}
                  >
                    Save
                  </Button>
                </div>
              </Field>
              <ProgressMeter
                value={Math.min(ledger.totalDue, customer.creditLimit)}
                max={Math.max(customer.creditLimit, 1)}
                tone={usedPct >= 1 ? "danger" : usedPct > 0.75 ? "warn" : "success"}
                label="Limit used"
                valueLabel={`${inr(ledger.totalDue)} of ${inr(customer.creditLimit)}`}
                hint={
                  ledger.creditAvailable >= 0
                    ? `${inr(ledger.creditAvailable)} of head-room left.`
                    : `${inr(Math.abs(ledger.creditAvailable))} beyond the limit — new credit orders should be refused.`
                }
              />
            </>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-j-info-soft px-3 py-2 text-xs text-j-ink-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-j-info" aria-hidden="true" />
              Turning this on writes the same flag the storefront reads — the COD tile appears for
              this buyer immediately, on their next checkout.
            </p>
          )}
        </Card>

        {/* FR-A-05 — the full ledger, with dues rolling up. */}
        <div className="space-y-3">
          <CardHeader
            title="Order & payment ledger"
            eyebrow="FR-A-05"
            subtitle={`${live.length} live ${live.length === 1 ? "order" : "orders"}${
              ledger.entries.length !== live.length
                ? ` · ${ledger.entries.length - live.length} cancelled, excluded from the totals`
                : ""
            }`}
            icon={<BadgeCheck />}
            agentId="PAY"
          />

          {ledger.entries.length === 0 ? (
            <EmptyState size="sm" title="No orders yet" description="This buyer has not ordered." />
          ) : (
            <>
              <Table dense caption={`Ledger for ${customer.name}`}>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th numeric>Total</Th>
                    <Th numeric>Paid</Th>
                    <Th numeric>Due</Th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.entries.map((entry) => (
                    <tr key={entry.orderId} className={entry.status === "cancelled" ? "opacity-50" : undefined}>
                      <Td mono nowrap>
                        {entry.orderNo}
                      </Td>
                      <Td muted nowrap>
                        {dateShort(entry.date)}
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONE[entry.status]} size="xs" dot>
                          {entry.status}
                        </Badge>
                      </Td>
                      <Td numeric>{inr(entry.total)}</Td>
                      <Td numeric>{inr(entry.paid)}</Td>
                      <Td numeric strong className={entry.due > 0 ? "text-j-warn" : undefined}>
                        {entry.due > 0 ? inr(entry.due) : "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-j-surface-2">
                    <Td strong colSpan={3}>
                      Totals
                    </Td>
                    <Td numeric strong>
                      {inr(ledger.totalOrdered)}
                    </Td>
                    <Td numeric strong>
                      {inr(ledger.totalPaid)}
                    </Td>
                    <Td numeric strong className={ledger.totalDue > 0 ? "text-j-warn" : undefined}>
                      {inr(ledger.totalDue)}
                    </Td>
                  </tr>
                </tfoot>
              </Table>

              <ReconcileNote
                label="Ledger check —"
                leftLabel="paid + due"
                rightLabel="ordered"
                left={round2(ledger.totalPaid + ledger.totalDue)}
                right={ledger.totalOrdered}
              />
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
