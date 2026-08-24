/**
 * Module 3 — Employees (FR-A-09 … FR-A-12).
 *
 * The chain this screen makes visible is the one the BRD cares about:
 *
 *   attendance cell → days worked → daily wage × days → payroll total →
 *   the payroll line of the period P&L.
 *
 * Nothing is stored twice. `computePayroll` is the only place a salary is
 * calculated, and `computePnl` books that same figure as its payroll cost, so
 * clicking a cell in the grid moves the profit on the P&L screen.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CheckCheck, Gift, IndianRupee, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Select,
  Stat,
  StatCell,
  StatGrid,
  Table,
  Td,
  Th,
  Toggle,
  TextInput,
  cn,
} from "../../ui";
import {
  EXPECTED_MONTHLY_PAYROLL,
  computePayroll,
  computePnl,
  dailyWage,
  dateShort,
  eachDay,
  employedDuring,
  inr,
  isWorkingDay,
  monthLong,
  pct,
  rangeFor,
  rosterMonthlyCost,
  round2,
} from "../../domain";
import type { AttendanceRecord, Bonus, Employee, PeriodRange } from "../../domain/types";
import { useDataStore } from "../../store/dataStore";
import {
  AdminPage,
  ReconcileNote,
  Split,
  TODAY,
  monthLabel,
  monthsInWindow,
  useAdminData,
  useAgentPulse,
} from "./shared";

type CellState = "present" | "absent" | "off" | "unemployed" | "future";

export function AdminEmployees() {
  const { data, input } = useAdminData();
  const setAttendance = useDataStore((s) => s.setAttendance);
  const closeAttendanceMonth = useDataStore((s) => s.closeAttendanceMonth);
  const { say, note } = useAgentPulse();

  const months = monthsInWindow();
  const [month, setMonth] = useState(TODAY.slice(0, 7));

  const view = useMemo(() => {
    const range: PeriodRange = rangeFor("monthly", `${month}-01`);
    const days = eachDay(range.from, range.to);
    const workingDays = days.filter(isWorkingDay);
    const payroll = computePayroll(data.employees, data.attendance, data.bonuses, range, data.settings);
    const pnl = computePnl(input, range);

    const attendanceIndex = new Map<string, AttendanceRecord>();
    for (const record of data.attendance) {
      if (record.date < range.from || record.date > range.to) continue;
      attendanceIndex.set(`${record.employeeId}|${record.date}`, record);
    }

    const roster = [...data.employees].sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return b.monthlySalary - a.monthlySalary;
    });

    return {
      range,
      days,
      workingDays,
      payroll,
      pnl,
      attendanceIndex,
      roster,
      activeCost: rosterMonthlyCost(data.employees),
      inMonth: roster.filter((e) => employedDuring(e, range)),
    };
  }, [data, input, month]);

  const { range, days, workingDays, payroll, pnl, attendanceIndex, roster } = view;

  function cellState(employee: Employee, date: string): CellState {
    if (!isWorkingDay(date)) return "off";
    const doj = employee.doj.slice(0, 10);
    const dot = employee.dot?.slice(0, 10);
    if (date < doj || (dot && date > dot)) return "unemployed";
    if (date > TODAY) return "future";
    return attendanceIndex.get(`${employee.id}|${date}`)?.present ? "present" : "absent";
  }

  function toggleCell(employee: Employee, date: string, state: CellState) {
    if (state !== "present" && state !== "absent") return;
    const nextPresent = state !== "present";
    setAttendance(employee.id, date, nextPresent);

    const wage = dailyWage(employee.monthlySalary, data.settings.workingDaysDivisor);
    const delta = nextPresent ? wage : -wage;
    say(
      "WRK",
      `${employee.name} marked ${nextPresent ? "present" : "absent"} on ${dateShort(date)} — ${
        nextPresent ? "+" : "−"
      }${inr(Math.abs(wage))} on ${monthLabel(month)} payroll.`,
    );
    note(
      "FIN",
      `Payroll booked into the ${monthLong(range.from)} P&L is now ${inr(round2(payroll.total + delta))}.`,
    );
  }

  function handleCloseMonth() {
    closeAttendanceMonth(month);
    say(
      "WRK",
      `Attendance closed for ${monthLong(range.from)} — every active hand marked present for all ${workingDays.length} working days.`,
    );
    note("FIN", `The ${monthLong(range.from)} payroll line in the P&L has been recomputed.`);
  }

  return (
    <AdminPage
      eyebrow="Module 3"
      title="Employees"
      crumb="Employees"
      subtitle="The roster, the attendance sheet it is paid from, and the bonus record — the three inputs to the payroll line in Profit / Loss."
      agentId="WRK"
      actions={
        <Button size="sm" variant="outline" iconLeft={<CheckCheck />} onClick={handleCloseMonth}>
          Mark full attendance
        </Button>
      }
      below={
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Attendance month" className="w-48">
            <Select
              selectSize="sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
            />
          </Field>
          <p className="pb-2 text-[13px] text-j-ink-2">
            {workingDays.length} working days · Sundays are the mill's weekly off and are never
            counted.
          </p>
        </div>
      }
    >
      <StatGrid columns={4}>
        <StatCell>
          <Stat
            label="Active headcount"
            value={data.employees.filter((e) => e.status === "active").length}
            unit="on the books"
            icon={<Users />}
            agentId="WRK"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Roster at full attendance"
            value={inr(view.activeCost)}
            unit="/month"
            icon={<IndianRupee />}
            hint="BRD §8.4 seeded roster"
            agentId="WRK"
          />
        </StatCell>
        <StatCell>
          <Stat
            label={`Payroll — ${monthLabel(month)}`}
            value={inr(payroll.total)}
            tone="primary"
            icon={<CalendarCheck />}
            hint={`${payroll.totalEarned > 0 ? inr(payroll.totalEarned) : "₹0"} wages + ${inr(payroll.totalBonus)} bonus`}
            agentId="WRK"
          />
        </StatCell>
        <StatCell>
          <Stat
            label="Booked into P&L"
            value={inr(pnl.actualCosts.payroll)}
            hint={`${pct(pnl.revenue > 0 ? pnl.actualCosts.payroll / pnl.revenue : 0)} of ${monthLabel(month)} revenue`}
            icon={<IndianRupee />}
            agentId="FIN"
          />
        </StatCell>
      </StatGrid>

      <ReconcileNote
        label="FR-A-09 check — active roster against the BRD figure:"
        leftLabel="sum of active salaries"
        rightLabel="BRD §8.4 total"
        left={view.activeCost}
        right={EXPECTED_MONTHLY_PAYROLL}
        format={(n) => inr(n)}
      />

      {/* FR-A-09 — the master */}
      <Card>
        <CardHeader
          title="Employee master"
          subtitle="FR-A-09 — name, role, joining and leaving dates, daily wage and monthly equivalent."
          agentId="WRK"
          divided
          className="mb-4"
        />
        <Table caption="Employee master">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              <Th>Left</Th>
              <Th numeric>Monthly</Th>
              <Th numeric>Daily wage</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {roster.map((employee) => (
              <tr key={employee.id} className={employee.status === "terminated" ? "opacity-55" : undefined}>
                <Td strong>{employee.name}</Td>
                <Td muted>{employee.role}</Td>
                <Td muted nowrap>
                  {dateShort(employee.doj)} {employee.doj.slice(0, 4)}
                </Td>
                <Td muted nowrap>
                  {employee.dot ? `${dateShort(employee.dot)} ${employee.dot.slice(0, 4)}` : "—"}
                </Td>
                <Td numeric>{inr(employee.monthlySalary)}</Td>
                <Td numeric strong>
                  {inr(dailyWage(employee.monthlySalary, data.settings.workingDaysDivisor))}
                </Td>
                <Td>
                  <Badge tone={employee.status === "active" ? "success" : "neutral"} size="xs" dot>
                    {employee.status}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-j-surface-2">
              <Td strong colSpan={4}>
                Active roster — {data.employees.filter((e) => e.status === "active").length} staff
              </Td>
              <Td numeric strong>
                {inr(view.activeCost)}
              </Td>
              <Td numeric muted colSpan={2}>
                ÷ {data.settings.workingDaysDivisor} working days (BRD D5)
              </Td>
            </tr>
          </tfoot>
        </Table>
      </Card>

      {/* FR-A-10 — the attendance grid */}
      <Card>
        <CardHeader
          title={`Attendance — ${monthLong(range.from)}`}
          subtitle="FR-A-10 — click any cell to switch a hand between present and absent. Working days are counted automatically."
          agentId="WRK"
          divided
          className="mb-4"
          actions={
            <div className="flex items-center gap-3 text-xs text-j-ink-2">
              <LegendSwatch tone="success" label="Present" />
              <LegendSwatch tone="danger" label="Absent" />
              <LegendSwatch tone="neutral" label="Sunday / off books" />
            </div>
          }
        />
        <div className="j-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Daily attendance for {monthLong(range.from)}</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-[10rem] border-b border-j-line bg-j-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3"
                >
                  Employee
                </th>
                {days.map((date) => (
                  <th
                    key={date}
                    scope="col"
                    className={cn(
                      "num border-b border-j-line bg-j-surface px-0 py-2 text-center text-[10px] font-semibold tabular-nums",
                      isWorkingDay(date) ? "text-j-ink-3" : "text-j-ink-3/50",
                    )}
                  >
                    {Number(date.slice(8, 10))}
                  </th>
                ))}
                <th
                  scope="col"
                  className="border-b border-j-line bg-j-surface px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-j-ink-3"
                >
                  Worked
                </th>
              </tr>
            </thead>
            <tbody>
              {view.inMonth.map((employee) => {
                const worked = days.filter((d) => cellState(employee, d) === "present").length;
                return (
                  <tr key={employee.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 truncate border-b border-j-line bg-j-surface px-3 py-1.5 text-left text-[13px] font-semibold text-j-ink"
                    >
                      {employee.name}
                      <span className="block text-[11px] font-normal text-j-ink-3">{employee.role}</span>
                    </th>
                    {days.map((date) => {
                      const state = cellState(employee, date);
                      const clickable = state === "present" || state === "absent";
                      return (
                        <td key={date} className="border-b border-j-line p-0 text-center">
                          <button
                            type="button"
                            disabled={!clickable}
                            onClick={() => toggleCell(employee, date, state)}
                            title={`${employee.name} — ${dateShort(date)}: ${CELL_LABEL[state]}`}
                            aria-label={`${employee.name}, ${dateShort(date)}: ${CELL_LABEL[state]}`}
                            className={cn(
                              "mx-auto my-1 block h-6 w-5 rounded-[4px] transition-colors",
                              CELL_CLASS[state],
                              clickable ? "cursor-pointer" : "cursor-default",
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="num border-b border-j-line px-3 py-1.5 text-right text-[13px] font-semibold tabular-nums text-j-ink">
                      {worked}
                      <span className="text-j-ink-3">/{workingDays.length}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-j-ink-3">
          Editing a cell recomputes the salary below and the payroll cost in{" "}
          <Link to="/admin/pnl" className="font-semibold text-j-primary hover:underline">
            Profit / Loss
          </Link>{" "}
          in the same keystroke — the two screens read one attendance record.
        </p>
      </Card>

      <Split ratio="2/1">
        {/* FR-A-11 — salary computation */}
        <Card className="j-print-break">
          <CardHeader
            title={`Salary — ${monthLong(range.from)}`}
            subtitle="FR-A-11 — daily wage × days worked, plus any bonus paid inside the month."
            agentId="WRK"
            divided
            className="mb-4"
          />
          <Table dense caption="Salary computation">
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th numeric>Daily wage</Th>
                <Th numeric>Days worked</Th>
                <Th numeric>Earned</Th>
                <Th numeric>Bonus</Th>
                <Th numeric>Total</Th>
              </tr>
            </thead>
            <tbody>
              {payroll.lines.map((line) => (
                <tr key={line.employee.id}>
                  <Td strong>{line.employee.name}</Td>
                  <Td numeric>{inr(line.dailyWage)}</Td>
                  <Td numeric>{line.daysWorked}</Td>
                  <Td numeric>{inr(line.earned)}</Td>
                  <Td numeric muted>
                    {line.bonus > 0 ? inr(line.bonus) : "—"}
                  </Td>
                  <Td numeric strong>
                    {inr(line.total)}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-j-surface-2">
                <Td strong colSpan={3}>
                  Payroll total — {payroll.headcount} on the books
                </Td>
                <Td numeric strong>
                  {inr(payroll.totalEarned)}
                </Td>
                <Td numeric strong>
                  {inr(payroll.totalBonus)}
                </Td>
                <Td numeric strong>
                  {inr(payroll.total)}
                </Td>
              </tr>
            </tfoot>
          </Table>
          <ReconcileNote
            className="mt-4"
            label="Feeds the P&L —"
            leftLabel="payroll computed here"
            rightLabel="payroll cost in P&L"
            left={payroll.total}
            right={pnl.actualCosts.payroll}
            format={(n) => inr(n)}
          />
        </Card>

        {/* FR-A-12 — Dussehra bonus */}
        <BonusPanel employees={roster} bonuses={data.bonuses} />
      </Split>
    </AdminPage>
  );
}

/* ── Bonus (FR-A-12) ───────────────────────────────────────────────────── */

function BonusPanel({ employees, bonuses }: { employees: Employee[]; bonuses: Bonus[] }) {
  const addBonus = useDataStore((s) => s.addBonus);
  const { say } = useAgentPulse();
  const active = employees.filter((e) => e.status === "active");

  const [employeeId, setEmployeeId] = useState(active[0]?.id ?? "");
  const [year, setYear] = useState(String(Number(TODAY.slice(0, 4))));
  const [amount, setAmount] = useState("6000");
  const [markPaid, setMarkPaid] = useState(true);

  const byYear = useMemo(() => {
    const groups = new Map<number, Bonus[]>();
    for (const bonus of bonuses) {
      groups.set(bonus.year, [...(groups.get(bonus.year) ?? []), bonus]);
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [bonuses]);

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  function submit() {
    const value = Number(amount);
    if (!employeeId || !Number.isFinite(value) || value <= 0) return;
    const y = Number(year);
    const existing = bonuses.filter((b) => b.year === y && b.employeeId === employeeId).length;
    addBonus({
      id: `bon-${y}-${employeeId}-${existing + 1}`,
      employeeId,
      year: y,
      festival: "Dussehra",
      amount: value,
      paidAt: markPaid ? TODAY : undefined,
    });
    say(
      "WRK",
      `Dussehra ${y} bonus of ${inr(value)} recorded for ${nameOf(employeeId)}${
        markPaid ? ` — paid ${dateShort(TODAY)}, so it lands in this month's payroll and P&L.` : " — accrued, not yet paid."
      }`,
    );
  }

  return (
    <Card className="j-print-break">
      <CardHeader
        title="Dussehra bonus"
        subtitle="FR-A-12 — a variable amount per employee, kept as an annual record."
        icon={<Gift />}
        agentId="WRK"
        divided
        className="mb-4"
      />

      <div className="space-y-3">
        <Field label="Employee">
          <Select
            selectSize="sm"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            options={active.map((e) => ({ value: e.id, label: `${e.name} — ${e.role}` }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Festival year">
            <Select
              selectSize="sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={[
                { value: String(Number(TODAY.slice(0, 4)) - 1), label: String(Number(TODAY.slice(0, 4)) - 1) },
                { value: TODAY.slice(0, 4), label: TODAY.slice(0, 4) },
              ]}
            />
          </Field>
          <Field label="Amount">
            <TextInput
              inputSize="sm"
              inputMode="numeric"
              prefix="₹"
              mono
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
        </div>
        <Toggle
          checked={markPaid}
          onChange={setMarkPaid}
          label={`Paid on ${dateShort(TODAY)}`}
          description="A bonus counts against the month it is actually paid in."
        />
        <Button size="sm" tone="primary" block onClick={submit} disabled={!employeeId || amount === ""}>
          Record bonus
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {byYear.length === 0 ? (
          <EmptyState size="sm" title="No bonus recorded yet" />
        ) : (
          byYear.map(([bonusYear, rows]) => (
            <div key={bonusYear}>
              <div className="mb-2 flex items-baseline justify-between">
                <h4 className="text-[13px] font-semibold text-j-ink">Dussehra {bonusYear}</h4>
                <span className="num text-[13px] font-semibold tabular-nums text-j-ink">
                  {inr(rows.reduce((s, b) => s + b.amount, 0))}
                </span>
              </div>
              <Table dense caption={`Bonus record ${bonusYear}`}>
                <thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Paid</Th>
                    <Th numeric>Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((bonus) => (
                    <tr key={bonus.id}>
                      <Td>{nameOf(bonus.employeeId)}</Td>
                      <Td muted nowrap>
                        {bonus.paidAt ? dateShort(bonus.paidAt) : "Accrued"}
                      </Td>
                      <Td numeric strong>
                        {inr(bonus.amount)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

const CELL_CLASS: Record<CellState, string> = {
  present: "bg-j-success/70 hover:bg-j-success",
  absent: "bg-j-danger/60 hover:bg-j-danger",
  off: "bg-j-ink/[0.06]",
  unemployed: "bg-transparent",
  future: "bg-j-ink/[0.03]",
};

const CELL_LABEL: Record<CellState, string> = {
  present: "present",
  absent: "absent",
  off: "weekly off",
  unemployed: "not on the books",
  future: "not yet worked",
};

function LegendSwatch({ tone, label }: { tone: "success" | "danger" | "neutral"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 rounded-[3px]",
          tone === "success" ? "bg-j-success/70" : tone === "danger" ? "bg-j-danger/60" : "bg-j-ink/[0.06]",
        )}
      />
      {label}
    </span>
  );
}
