import { useMemo } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, LogIn, LogOut, PackageSearch, UserRound } from "lucide-react";
import {
  AgentChip,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Section,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Td,
  Th,
  Tr,
  cn,
} from "../../ui";
import type { Tone } from "../../ui";
import { useAgentStore } from "../../store/agentStore";
import { useCartStore } from "../../store/cartStore";
import { useDataStore } from "../../store/dataStore";
import type { CustomerLedgerEntry, OrderStatus } from "../../domain";
import { REGION_LABELS, computeLedger, dateShort, inr, kg } from "../../domain";
import { ShopFrame, useShopChrome } from "./ShopFrame";
import { useAnalyticsInput, useSessionCustomer } from "./lib";

const STATUS_TONE: Record<OrderStatus, Tone> = {
  placed: "info",
  confirmed: "primary",
  dispatched: "accent",
  delivered: "success",
  cancelled: "danger",
};

/** Anything not yet delivered or cancelled is still live for the buyer. */
function isCurrent(entry: CustomerLedgerEntry): boolean {
  return entry.status !== "delivered" && entry.status !== "cancelled";
}

/**
 * FR-W-09 — profile, current orders and past orders, scoped to the signed-in
 * customer and nobody else. The ledger comes straight from `computeLedger`, so
 * what a buyer sees here reconciles to the rupee with the admin customer view.
 */
export function Account() {
  const chrome = useShopChrome();
  const session = useCartStore((s) => s.session);
  const signOut = useCartStore((s) => s.signOut);
  const orders = useDataStore((s) => s.orders);
  const pulse = useAgentStore((s) => s.pulse);
  const customer = useSessionCustomer();
  const analytics = useAnalyticsInput();

  const ledger = useMemo(() => {
    if (!customer) return null;
    return computeLedger(analytics, customer.id);
  }, [analytics, customer]);

  if (!session?.verified || !customer || !ledger) {
    return (
      <ShopFrame>
        <Section eyebrow="My account" title="Sign in to see your orders" agentId="IDN">
          <EmptyState
            kraft
            icon={<UserRound />}
            title="Your orders live behind your phone number"
            description="Pehchan signs you in with a one-time code. A buyer only ever sees their own orders — never anyone else's."
            action={
              <Button
                tone="primary"
                iconLeft={<LogIn />}
                onClick={() => chrome.openSignIn(undefined, "Sign in to see your order history.")}
              >
                Sign in with your mobile
              </Button>
            }
          />
        </Section>
      </ShopFrame>
    );
  }

  const current = ledger.entries.filter(isCurrent);
  const past = ledger.entries.filter((e) => !isCurrent(e));
  const weightAllTime = orders
    .filter((o) => o.customerId === customer.id && o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalWeightKg, 0);

  return (
    <ShopFrame width="wide">
      <div className="space-y-5">
        <Section
          eyebrow="My account"
          title={customer.company ?? customer.name}
          subtitle={`+91 ${customer.phone} · ${customer.city}, ${REGION_LABELS[customer.region]}`}
          agentId="IDN"
          actions={
            <Button
              size="sm"
              variant="ghost"
              iconLeft={<LogOut />}
              onClick={() => {
                pulse("IDN", "done", `Session closed for ${customer.name}`);
                signOut();
              }}
            >
              Sign out
            </Button>
          }
        />

        {/* ── Money ────────────────────────────────────────────────── */}
        <StatGrid columns={4}>
          <StatCell>
            <Stat label="Orders" value={ledger.entries.length} agentId="DSP" size="sm" />
          </StatCell>
          <StatCell>
            <Stat label="Ordered" value={inr(ledger.totalOrdered)} size="sm" agentId="PRC" />
          </StatCell>
          <StatCell>
            <Stat label="Paid" value={inr(ledger.totalPaid)} tone="success" size="sm" />
          </StatCell>
          <StatCell>
            <Stat
              label="Outstanding"
              value={inr(ledger.totalDue)}
              tone={ledger.totalDue > 0 ? "warn" : "neutral"}
              size="sm"
              agentId="PAY"
              hint={
                customer.creditApproved
                  ? `${inr(ledger.creditAvailable)} left on a ${inr(customer.creditLimit)} limit`
                  : undefined
              }
            />
          </StatCell>
        </StatGrid>

        {/* ── Profile (FR-W-10) ────────────────────────────────────── */}
        <Card pad="md">
          <CardHeader
            title="Profile & billing details"
            subtitle="These go on every GST invoice we raise for you."
            agentId="IDN"
            divided
          />
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Detail label="Name">{customer.name}</Detail>
            <Detail label="Company">{customer.company ?? "—"}</Detail>
            <Detail label="Delivery address">
              {customer.address ? `${customer.address}, ${customer.city}` : "Not saved yet"}
            </Detail>
            <Detail label="State">{REGION_LABELS[customer.region]}</Detail>
            <Detail label="GSTIN" mono>
              {customer.gstin ? (
                <span className="inline-flex items-center gap-1.5">
                  {customer.gstin}
                  <BadgeCheck className="h-3.5 w-3.5 text-j-success" aria-hidden="true" />
                </span>
              ) : (
                "Unregistered (B2C)"
              )}
            </Detail>
            <Detail label="Buyer type">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral" size="xs" outline>
                  {customer.segment}
                </Badge>
                {customer.creditApproved ? (
                  <Badge tone="success" size="xs" dot>
                    Credit approved · {inr(customer.creditLimit)}
                  </Badge>
                ) : (
                  <Badge tone="neutral" size="xs">
                    Prepaid only
                  </Badge>
                )}
              </span>
            </Detail>
            <Detail label="Lifetime tonnage">{kg(weightAllTime)}</Detail>
            <Detail label="Customer since">{dateShort(customer.createdAt)}</Detail>
          </dl>
        </Card>

        {/* ── Current orders ───────────────────────────────────────── */}
        <Card pad="md">
          <CardHeader
            title={`Current orders (${current.length})`}
            subtitle="Placed → Confirmed → Dispatched → Delivered."
            agentId="DSP"
            divided
          />
          {current.length === 0 ? (
            <p className="mt-4 text-[13px] text-j-ink-3">
              Nothing in flight right now.{" "}
              <Link to="/shop/catalogue" className="font-semibold text-j-primary hover:underline">
                Browse the catalogue
              </Link>
              .
            </p>
          ) : (
            <OrderTable entries={current} />
          )}
        </Card>

        {/* ── Past orders ──────────────────────────────────────────── */}
        <Card pad="md">
          <CardHeader
            title={`Order history (${past.length})`}
            subtitle="Everything delivered or closed, with what was paid and what is still due."
            agentId="PAY"
            divided
          />
          {past.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<PackageSearch />}
              title="No completed orders yet"
              description="Your first delivered order will show here with its invoice."
            />
          ) : (
            <OrderTable entries={past} />
          )}
        </Card>
      </div>
    </ShopFrame>
  );
}

function OrderTable({ entries }: { entries: CustomerLedgerEntry[] }) {
  const orders = useDataStore((s) => s.orders);
  return (
    <Table
      dense
      className="mt-3"
      caption="Your orders with status and amounts"
      wrapperClassName="-mx-1"
    >
      <thead>
        <tr>
          <Th>Order</Th>
          <Th>Date</Th>
          <Th numeric>Weight</Th>
          <Th numeric>Total</Th>
          <Th numeric>Paid</Th>
          <Th numeric>Due</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const full = orders.find((o) => o.id === entry.orderId);
          return (
            <Tr key={entry.orderId}>
              <Td mono nowrap strong>
                {entry.orderNo}
              </Td>
              <Td muted nowrap>
                {dateShort(entry.date)}
              </Td>
              <Td numeric>{kg(full?.totalWeightKg ?? 0)}</Td>
              <Td numeric strong>
                {inr(entry.total)}
              </Td>
              <Td numeric>{inr(entry.paid)}</Td>
              <Td numeric className={cn(entry.due > 0 && "text-j-danger")}>
                {inr(entry.due)}
              </Td>
              <Td nowrap>
                <span className="inline-flex items-center gap-1.5">
                  <Badge tone={STATUS_TONE[entry.status]} size="xs" dot>
                    {entry.status}
                  </Badge>
                  {entry.status === "dispatched" || entry.status === "confirmed" ? (
                    <AgentChip id="DSP" size="xs" />
                  ) : null}
                </span>
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function Detail({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-[14px] font-medium text-j-ink", mono && "j-mono text-[13px]")}>
        {children}
      </dd>
    </div>
  );
}
