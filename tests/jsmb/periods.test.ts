import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  endOfMonth,
  inRange,
  isWorkingDay,
  rangeFor,
  startOfMonth,
  startOfWeek,
} from "../../src/jsmb/domain/periods";

describe("date arithmetic", () => {
  it("adds and subtracts whole days across month ends", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-01-06", "2026-07-03")).toBe(178);
  });

  it("finds month and week boundaries", () => {
    expect(startOfMonth("2026-07-03")).toBe("2026-07-01");
    expect(endOfMonth("2026-07-03")).toBe("2026-07-31");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    // 3 July 2026 is a Friday, so the week starts on Monday the 29th.
    expect(startOfWeek("2026-07-03")).toBe("2026-06-29");
    expect(startOfWeek("2026-06-29")).toBe("2026-06-29");
  });

  it("treats Sunday as the weekly off", () => {
    expect(isWorkingDay("2026-07-05")).toBe(false); // Sunday
    expect(isWorkingDay("2026-07-06")).toBe(true);
  });

  it("enumerates an inclusive span", () => {
    expect(eachDay("2026-07-01", "2026-07-03")).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(eachDay("2026-07-03", "2026-07-03")).toHaveLength(1);
    expect(eachDay("2026-07-03", "2026-07-01")).toHaveLength(0);
  });

  it("tests inclusive membership", () => {
    const range = { from: "2026-06-01", to: "2026-06-30" };
    expect(inRange("2026-06-01", range)).toBe(true);
    expect(inRange("2026-06-30", range)).toBe(true);
    expect(inRange("2026-07-01", range)).toBe(false);
  });
});

describe("rangeFor", () => {
  it("builds a single-day window", () => {
    const r = rangeFor("daily", "2026-07-03");
    expect(r).toMatchObject({ key: "daily", from: "2026-07-03", to: "2026-07-03" });
    expect(r.label).toBe("3 July 2026");
  });

  it("builds a Monday-anchored week", () => {
    const r = rangeFor("weekly", "2026-07-03");
    expect(r.from).toBe("2026-06-29");
    expect(r.to).toBe("2026-07-05");
    expect(eachDay(r.from, r.to)).toHaveLength(7);
  });

  it("builds a calendar month and year", () => {
    expect(rangeFor("monthly", "2026-07-03")).toMatchObject({ from: "2026-07-01", to: "2026-07-31", label: "July 2026" });
    expect(rangeFor("yearly", "2026-07-03")).toMatchObject({ from: "2026-01-01", to: "2026-12-31", label: "2026" });
  });
});
