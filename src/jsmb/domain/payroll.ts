/**
 * Employees module maths — BRD §8.4 (FR-A-09 … FR-A-12).
 *
 * Pay is on a daily-wage basis: monthly salary ÷ working-days divisor, times
 * days actually present. The divisor is BRD open item D5, so it lives in
 * settings and every figure here re-flows when it changes.
 */
import type {
  ComputePayrollFn,
  DailyWageFn,
  PayrollLine,
} from "../contracts/engines";
import type { Employee, PeriodRange } from "./types";
import { round2 } from "./format";
import { daysBetween, inRange } from "./periods";

export const dailyWage: DailyWageFn = (monthlySalary, divisor) =>
  divisor > 0 ? Math.round(monthlySalary / divisor) : 0;

/**
 * Was this person on the books at any point inside the range? Somebody who left
 * before it started or joined after it ended contributes nothing and is not
 * counted in headcount.
 */
export function employedDuring(employee: Employee, range: PeriodRange): boolean {
  if (employee.doj.slice(0, 10) > range.to) return false;
  if (employee.dot && employee.dot.slice(0, 10) < range.from) return false;
  return true;
}

/** Calendar days of the range that fall inside this person's employment. */
function daysOnBooks(employee: Employee, range: PeriodRange): number {
  const from = employee.doj.slice(0, 10) > range.from ? employee.doj.slice(0, 10) : range.from;
  const to = employee.dot && employee.dot.slice(0, 10) < range.to ? employee.dot.slice(0, 10) : range.to;
  return Math.max(0, daysBetween(from, to) + 1);
}

export const computePayroll: ComputePayrollFn = (
  employees,
  attendance,
  bonuses,
  range,
  settings,
) => {
  const eligible = employees.filter((e) => employedDuring(e, range));

  // One pass over attendance keyed by employee, rather than a filter per head.
  const presentDays = new Map<string, number>();
  for (const record of attendance) {
    if (!record.present || !inRange(record.date, range)) continue;
    presentDays.set(record.employeeId, (presentDays.get(record.employeeId) ?? 0) + 1);
  }

  const bonusByEmployee = new Map<string, number>();
  for (const bonus of bonuses) {
    // A bonus counts against the period it was actually paid in.
    if (!bonus.paidAt || !inRange(bonus.paidAt, range)) continue;
    bonusByEmployee.set(bonus.employeeId, (bonusByEmployee.get(bonus.employeeId) ?? 0) + bonus.amount);
  }

  const lines: PayrollLine[] = eligible.map((employee) => {
    const wage = dailyWage(employee.monthlySalary, settings.workingDaysDivisor);
    const daysWorked = presentDays.get(employee.id) ?? 0;
    const earned = round2(wage * daysWorked);
    const bonus = round2(bonusByEmployee.get(employee.id) ?? 0);
    return {
      employee,
      daysWorked,
      daysInRange: daysOnBooks(employee, range),
      dailyWage: wage,
      earned,
      bonus,
      total: round2(earned + bonus),
    };
  });

  const totalEarned = round2(lines.reduce((s, l) => s + l.earned, 0));
  const totalBonus = round2(lines.reduce((s, l) => s + l.bonus, 0));

  return {
    range,
    lines,
    totalEarned,
    totalBonus,
    total: round2(totalEarned + totalBonus),
    headcount: lines.length,
  };
};

/** Monthly-equivalent cost of the roster at full attendance — the ₹1,29,000 line. */
export function rosterMonthlyCost(employees: Employee[]): number {
  return employees
    .filter((e) => e.status === "active")
    .reduce((sum, e) => sum + e.monthlySalary, 0);
}
