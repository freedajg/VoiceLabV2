/**
 * Unit maths — BRD §5.1. One bundle is 25 kg, one lot is 20 bundles (500 kg),
 * and a self-service order may not exceed 20 t (FR-W-05).
 */
import type { CapStatusFn, FromKgFn, ToKgFn } from "../contracts/engines";
import {
  KG_PER_BUNDLE,
  KG_PER_LOT,
  MAX_ORDER_KG,
} from "./constants";

/** Kilograms in one unit of the given kind. */
export function kgPerUnit(unit: "bundle" | "lot"): number {
  return unit === "lot" ? KG_PER_LOT : KG_PER_BUNDLE;
}

export const toKg: ToKgFn = (unit, qty) => qty * kgPerUnit(unit);

export const fromKg: FromKgFn = (kg, unit) => kg / kgPerUnit(unit);

export const capStatus: CapStatusFn = (weightKg) => {
  const remainingKg = Math.max(0, MAX_ORDER_KG - weightKg);
  return {
    weightKg,
    pct: weightKg / MAX_ORDER_KG,
    // Exactly 20 t is allowed; one bundle more is not.
    withinCap: weightKg <= MAX_ORDER_KG,
    remainingKg,
    remainingBundles: Math.floor(remainingKg / KG_PER_BUNDLE),
    remainingLots: Math.floor(remainingKg / KG_PER_LOT),
  };
};
