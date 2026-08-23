import { describe, expect, it } from "vitest";
import { capStatus, fromKg, toKg } from "../../src/jsmb/domain/tonnage";
import {
  KG_PER_BUNDLE,
  KG_PER_LOT,
  MAX_ORDER_BUNDLES,
  MAX_ORDER_KG,
  MAX_ORDER_LOTS,
} from "../../src/jsmb/domain/constants";

describe("unit conversion — BRD §5.1", () => {
  it("converts bundles and lots to kilograms", () => {
    expect(toKg("bundle", 1)).toBe(25);
    expect(toKg("lot", 1)).toBe(500);
    expect(toKg("bundle", 20)).toBe(toKg("lot", 1));
    expect(toKg("lot", 5)).toBe(2500); // 5 lots = 100 bundles = 2.5 t
  });

  it("round-trips back from kilograms", () => {
    expect(fromKg(2500, "bundle")).toBe(100);
    expect(fromKg(2500, "lot")).toBe(5);
    expect(fromKg(toKg("lot", 7), "lot")).toBe(7);
  });

  it("agrees with the constants for the 20 t cap", () => {
    expect(MAX_ORDER_KG).toBe(20_000);
    expect(MAX_ORDER_BUNDLES).toBe(800);
    expect(MAX_ORDER_LOTS).toBe(40);
    expect(toKg("bundle", MAX_ORDER_BUNDLES)).toBe(MAX_ORDER_KG);
    expect(toKg("lot", MAX_ORDER_LOTS)).toBe(MAX_ORDER_KG);
  });
});

describe("cap status — FR-W-05", () => {
  it("allows exactly 20 t and refuses one bundle more", () => {
    expect(capStatus(MAX_ORDER_KG).withinCap).toBe(true);
    expect(capStatus(MAX_ORDER_KG + KG_PER_BUNDLE).withinCap).toBe(false);
  });

  it("reports the head-room left in both units", () => {
    const half = capStatus(MAX_ORDER_KG / 2);
    expect(half.pct).toBe(0.5);
    expect(half.remainingKg).toBe(10_000);
    expect(half.remainingBundles).toBe(400);
    expect(half.remainingLots).toBe(20);
  });

  it("never reports negative head-room once over the cap", () => {
    const over = capStatus(MAX_ORDER_KG + KG_PER_LOT);
    expect(over.pct).toBeGreaterThan(1);
    expect(over.remainingKg).toBe(0);
    expect(over.remainingBundles).toBe(0);
    expect(over.remainingLots).toBe(0);
  });

  it("rounds head-room down to whole units", () => {
    // 19,990 kg leaves 10 kg — not enough for a bundle.
    const nearlyFull = capStatus(MAX_ORDER_KG - 10);
    expect(nearlyFull.remainingKg).toBe(10);
    expect(nearlyFull.remainingBundles).toBe(0);
  });
});
