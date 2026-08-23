import { describe, expect, it } from "vitest";
import type { AttendanceRecord, Employee, PeriodRange } from "../../src/jsmb/domain/types";
import { computePayroll, dailyWage, rosterMonthlyCost } from "../../src/jsmb/domain/payroll";
import { eachDay } from "../../src/jsmb/domain/periods";
import { buildSeed } from "../../src/jsmb/domain/seed/dataset";
import {
  DEFAULT_BUSINESS_SETTINGS,
  EXPECTED_MONTHLY_PAYROLL,
  ROSTER_TEMPLATE,
} from "../../src/jsmb/domain/constants";

const seed = buildSeed();
const activeRoster = seed.employees.filter((e) => e.status === "active");

/** Exactly 26 working days — the divisor the BRD leaves open as D5. */
const FULL_MONTH: PeriodRange = { key: "monthly", label: "26-day month", from: "2026-06-01", to: "2026-06-26" };

function fullAttendance(employees: Employee[], range: PeriodRange): AttendanceRecord[] {
  return employees.flatMap((e) =>
    eachDay(range.from, range.to).map((date) => ({
      employeeId: e.id,
      date,
      present: true,
      source: "manual" as const,
    })),
  );
}

describe("daily wage — BRD D5", () => {
  it("divides the monthly salary by the working-days divisor", () => {
    expect(dailyWage(23_000, 26)).toBe(885); // 884.6 → ₹885
    expect(dailyWage(18_000, 26)).toBe(692);
    expect(dailyWage(14_000, 26)).toBe(538);
  });

  it("re-flows when the divisor changes", () => {
    expect(dailyWage(23_000, 30)).toBe(767);
    expect(dailyWage(23_000, 24)).toBe(958);
  });
});

describe("seeded roster — BRD §8.4", () => {
  it("matches ROSTER_TEMPLATE and totals ₹1,29,000 a month", () => {
    expect(EXPECTED_MONTHLY_PAYROLL).toBe(129_000);
    expect(rosterMonthlyCost(seed.employees)).toBe(EXPECTED_MONTHLY_PAYROLL);

    for (const row of ROSTER_TEMPLATE) {
      const matching = activeRoster.filter((e) => e.role === row.role);
      expect(matching).toHaveLength(row.count);
      for (const e of matching) expect(e.monthlySalary).toBe(row.monthlySalary);
    }
  });

  it("includes a leaver inside the demo window", () => {
    const leavers = seed.employees.filter((e) => e.status === "terminated");
    expect(leavers).toHaveLength(1);
    expect(leavers[0].dot).toBeDefined();
    expect(leavers[0].dot! > "2026-01-01" && leavers[0].dot! < "2026-07-03").toBe(true);
  });
});

describe("computePayroll", () => {
  it("pays ₹1,29,000 for a full 26-day month, within rounding", () => {
    const result = computePayroll(
      activeRoster,
      fullAttendance(activeRoster, FULL_MONTH),
      [],
      FULL_MONTH,
      DEFAULT_BUSINESS_SETTINGS,
    );
    expect(result.headcount).toBe(activeRoster.length);
    // Each daily wage is rounded to the rupee, so 26 days can drift by at most
    // half a rupee per person per day.
    const tolerance = activeRoster.length * 26 * 0.5;
    expect(Math.abs(result.total - EXPECTED_MONTHLY_PAYROLL)).toBeLessThanOrEqual(tolerance);
  });

  it("flows the divisor straight through to the total", () => {
    const attendance = fullAttendance(activeRoster, FULL_MONTH);
    const at26 = computePayroll(activeRoster, attendance, [], FULL_MONTH, DEFAULT_BUSINESS_SETTINGS);
    const at30 = computePayroll(activeRoster, attendance, [], FULL_MONTH, {
      ...DEFAULT_BUSINESS_SETTINGS,
      workingDaysDivisor: 30,
    });
    expect(at30.total).toBeLessThan(at26.total);
    const expected = activeRoster.reduce((s, e) => s + dailyWage(e.monthlySalary, 30) * 26, 0);
    expect(at30.total).toBe(expected);
  });

  it("pays only for days actually present", () => {
    const attendance = fullAttendance(activeRoster, FULL_MONTH).map((a, i) =>
      i % 13 === 0 ? { ...a, present: false } : a,
    );
    const result = computePayroll(activeRoster, attendance, [], FULL_MONTH, DEFAULT_BUSINESS_SETTINGS);
    for (const line of result.lines) {
      expect(line.earned).toBe(line.dailyWage * line.daysWorked);
      expect(line.daysWorked).toBeLessThan(26);
    }
  });

  it("adds bonuses dated inside the range and ignores the rest", () => {
    const target = activeRoster[0];
    const attendance = fullAttendance(activeRoster, FULL_MONTH);
    const result = computePayroll(
      activeRoster,
      attendance,
      [
        { id: "b1", employeeId: target.id, year: 2026, festival: "Dussehra", amount: 5000, paidAt: "2026-06-10" },
        { id: "b2", employeeId: target.id, year: 2025, festival: "Dussehra", amount: 4000, paidAt: "2025-10-01" },
      ],
      FULL_MONTH,
      DEFAULT_BUSINESS_SETTINGS,
    );
    expect(result.totalBonus).toBe(5000);
    const line = result.lines.find((l) => l.employee.id === target.id)!;
    expect(line.bonus).toBe(5000);
    expect(line.total).toBe(line.earned + 5000);
  });

  it("excludes anyone who left before the range or joined after it", () => {
    const before: Employee = { ...activeRoster[0], id: "gone", dot: "2025-12-31", status: "terminated" };
    const after: Employee = { ...activeRoster[0], id: "future", doj: "2026-09-01" };
    const result = computePayroll(
      [...activeRoster, before, after],
      fullAttendance(activeRoster, FULL_MONTH),
      [],
      FULL_MONTH,
      DEFAULT_BUSINESS_SETTINGS,
    );
    expect(result.headcount).toBe(activeRoster.length);
    expect(result.lines.some((l) => l.employee.id === "gone" || l.employee.id === "future")).toBe(false);
  });
});
