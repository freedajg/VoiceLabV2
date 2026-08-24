/**
 * The ledger strip.
 *
 * The agent layer is only interesting if it is bolted to a real business, so
 * the mesh sits directly on top of the actual figures the seeded books produce.
 * Every tile is computed by a domain engine from the one in-memory store, which
 * is why a scenario that places an order moves these numbers while it plays.
 */
import { useMemo } from "react";
import { cn } from "../../ui/cn";
import { EYEBROW, Stat, StatCell, StatGrid } from "../../ui";
import { useDataStore, selectAnalyticsInput } from "../../store/dataStore";
import { DEMO_TODAY, computeDashboard, dateLong, inr, inrCompact } from "../../domain";

export function BusinessStrip({ className }: { className?: string }) {
  const revision = useDataStore((s) => s.revision);

  // Reading through `getState` inside a revision-keyed memo keeps this strip
  // off the render path of every unrelated store write.
  const snapshot = useMemo(() => {
    const state = useDataStore.getState();
    return computeDashboard(selectAnalyticsInput(state), DEMO_TODAY, state.enquiries);
  }, [revision]);

  return (
    <section className={cn("space-y-2.5", className)} aria-label="Live business figures">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={cn(EYEBROW, "text-j-console-ink-2/70")}>The books behind the mesh</h2>
        <p className="text-[11.5px] text-j-console-ink-2/60">
          Seeded ledger as of {dateLong(DEMO_TODAY)} · moves while a scenario plays
        </p>
      </div>

      <StatGrid columns={4} surface="console">
        <StatCell surface="console">
          <Stat
            surface="console"
            size="sm"
            label="Orders today"
            value={snapshot.todayOrders}
            hint={`${inr(snapshot.todayRevenue)} booked`}
            agentId="ORCH"
          />
        </StatCell>
        <StatCell surface="console">
          <Stat
            surface="console"
            size="sm"
            label="Revenue this month"
            value={inrCompact(snapshot.monthRevenue)}
            hint={`${inrCompact(snapshot.monthProfit)} actual profit`}
            agentId="FIN"
          />
        </StatCell>
        <StatCell surface="console">
          <Stat
            surface="console"
            size="sm"
            label="Dues outstanding"
            value={inrCompact(snapshot.duesOutstanding)}
            hint={`${snapshot.newEnquiries} new enquiries waiting`}
            tone={snapshot.duesOutstanding > 0 ? "warn" : "neutral"}
            agentId="PAY"
          />
        </StatCell>
        <StatCell surface="console">
          <Stat
            surface="console"
            size="sm"
            label="Tonnes this month"
            value={snapshot.tonnesThisMonth.toFixed(1)}
            unit="t"
            hint={`${snapshot.lowMarginOrders} orders under target margin`}
            agentId="TON"
          />
        </StatCell>
      </StatGrid>
    </section>
  );
}
