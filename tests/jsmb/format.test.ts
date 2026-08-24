import { describe, expect, it } from "vitest";
import {
  bundles,
  dateLong,
  dateShort,
  groupIndian,
  inr,
  inrCompact,
  inrPaise,
  kg,
  monthLong,
  pct,
  round2,
  tons,
} from "../../src/jsmb/domain/format";

describe("Indian digit grouping", () => {
  it("groups the last three digits, then in pairs", () => {
    expect(groupIndian(1)).toBe("1");
    expect(groupIndian(999)).toBe("999");
    expect(groupIndian(1000)).toBe("1,000");
    expect(groupIndian(99999)).toBe("99,999");
    expect(groupIndian(129000)).toBe("1,29,000");
    expect(groupIndian(1000000)).toBe("10,00,000");
    expect(groupIndian(12345678)).toBe("1,23,45,678");
  });

  it("keeps the sign in front", () => {
    expect(groupIndian(-129000)).toBe("-1,29,000");
  });
});

describe("inr", () => {
  it("renders whole rupees the Indian way", () => {
    expect(inr(129000)).toBe("₹1,29,000");
    expect(inr(570)).toBe("₹570");
    expect(inr(0)).toBe("₹0");
    expect(inr(-45250)).toBe("-₹45,250");
  });

  it("never falls back to Western grouping", () => {
    expect(inr(129000)).not.toBe("₹129,000");
  });
});

describe("inrPaise", () => {
  it("keeps two decimals for invoice lines", () => {
    expect(inrPaise(1234.5)).toBe("₹1,234.50");
    expect(inrPaise(129000)).toBe("₹1,29,000.00");
  });
});

describe("inrCompact", () => {
  it("uses lakhs and crores for tiles", () => {
    expect(inrCompact(129000)).toBe("₹1.29L");
    expect(inrCompact(42000000)).toBe("₹4.2Cr");
    expect(inrCompact(10000000)).toBe("₹1Cr");
    expect(inrCompact(85000)).toBe("₹85,000");
    expect(inrCompact(640)).toBe("₹640");
  });
});

describe("weights and ratios", () => {
  it("formats kilograms and tonnes", () => {
    expect(kg(12500)).toBe("12,500 kg");
    expect(tons(12500)).toBe("12.5 t"); // takes kilograms
    expect(tons(20000)).toBe("20.0 t");
    expect(bundles(1)).toBe("1 bundle");
    expect(bundles(800)).toBe("800 bundles");
  });

  it("formats a fraction as a percentage", () => {
    expect(pct(0.125)).toBe("12.5%");
    expect(pct(0.5)).toBe("50%");
    expect(pct(0)).toBe("0%");
  });
});

describe("dates", () => {
  it("renders short and long forms without a locale", () => {
    expect(dateShort("2026-07-03")).toBe("3 Jul");
    expect(dateLong("2026-07-03")).toBe("3 July 2026");
    expect(dateLong("2026-01-06")).toBe("6 January 2026");
    expect(monthLong("2026-06-15")).toBe("June 2026");
  });
});

describe("round2", () => {
  it("rounds money to the paisa without floating-point drift", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(20.200000000000003)).toBe(20.2);
  });
});
