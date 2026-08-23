/**
 * Calendar windows for the daily / weekly / monthly / yearly rollups the admin
 * portal offers (FR-A-06, FR-A-14).
 *
 * All date maths runs in UTC on `YYYY-MM-DD` strings. The prototype must give
 * the same answer on a laptop in Hyderabad and one in London, so no local-time
 * Date methods are used anywhere.
 */
import type { PeriodKey, PeriodRange } from "./types";
import type { RangeForFn } from "../contracts/engines";
import { dateLong, dateShort, monthLong } from "./format";

const DAY_MS = 86_400_000;

/** Parses `YYYY-MM-DD` into a UTC-midnight epoch. */
export function toEpoch(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Formats a UTC epoch back to `YYYY-MM-DD`. */
export function toISO(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

/** Shifts an ISO date by whole days. */
export function addDays(iso: string, days: number): string {
  return toISO(toEpoch(iso) + days * DAY_MS);
}

/** Inclusive day count between two ISO dates. */
export function daysBetween(fromISO: string, toISODate: string): number {
  return Math.round((toEpoch(toISODate) - toEpoch(fromISO)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday, in UTC. */
export function dayOfWeek(iso: string): number {
  return new Date(toEpoch(iso)).getUTCDay();
}

/** Sunday is the mill's weekly off — the working-day rule used by attendance. */
export function isWorkingDay(iso: string): boolean {
  return dayOfWeek(iso) !== 0;
}

/** First day of the month containing `iso`. */
export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Last day of the month containing `iso`. */
export function endOfMonth(iso: string): string {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  return toISO(Date.UTC(y, m, 0));
}

/** Monday-anchored week start, matching how the mill reads a week. */
export function startOfWeek(iso: string): string {
  const dow = dayOfWeek(iso);
  const backToMonday = (dow + 6) % 7;
  return addDays(iso, -backToMonday);
}

/** Every ISO date from `from` to `to`, inclusive. Empty when `to` precedes `from`. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const last = toEpoch(to);
  for (let t = toEpoch(from); t <= last; t += DAY_MS) out.push(toISO(t));
  return out;
}

/** True when `iso` falls inside an inclusive range. */
export function inRange(iso: string, range: { from: string; to: string }): boolean {
  const d = iso.slice(0, 10);
  return d >= range.from && d <= range.to;
}

export const rangeFor: RangeForFn = (key, anchorISO) => {
  const anchor = anchorISO.slice(0, 10);
  switch (key) {
    case "daily":
      return { key, label: dateLong(anchor), from: anchor, to: anchor };
    case "weekly": {
      const from = startOfWeek(anchor);
      const to = addDays(from, 6);
      return { key, label: `${dateShort(from)} – ${dateLong(to)}`, from, to };
    }
    case "monthly": {
      const from = startOfMonth(anchor);
      return { key, label: monthLong(anchor), from, to: endOfMonth(anchor) };
    }
    case "yearly": {
      const year = anchor.slice(0, 4);
      return { key, label: year, from: `${year}-01-01`, to: `${year}-12-31` };
    }
  }
};

/** Convenience for callers that hold a key in state. */
export const PERIOD_KEYS: PeriodKey[] = ["daily", "weekly", "monthly", "yearly"];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};
