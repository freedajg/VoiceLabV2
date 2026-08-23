/**
 * Pricing and standard-cost margin — BRD §5.2, §6.1 and §6.3.
 *
 * Prices are always read from `PRODUCT_BY_CODE`; nothing here retypes a rupee
 * figure. Costs always come from the passed `CostConfig`, so editing an
 * assumption in the admin settings re-flows every margin on screen (FR-A-15).
 */
import type {
  QuoteLineFn,
  QuoteOrderFn,
  StandardCostFn,
} from "../contracts/engines";
import {
  BUNDLES_PER_LOT,
  KG_PER_BUNDLE,
  MAX_ORDER_KG,
  PRODUCT_BY_CODE,
} from "./constants";
import { round2 } from "./format";
import { toKg } from "./tonnage";

/**
 * ₹20.20/kg by default. `targetMargin` is deliberately excluded — it is the
 * profit we aim for, not a cost we incur.
 */
export const standardCostPerKg: StandardCostFn = (costConfig) =>
  round2(
    costConfig.rawMaterial +
      costConfig.labour +
      costConfig.electricity +
      costConfig.maintenance +
      costConfig.transport,
  );

/** Bundles represented by a quantity in the chosen unit. */
export function bundleCount(unit: "bundle" | "lot", qty: number): number {
  return qty * (unit === "lot" ? BUNDLES_PER_LOT : 1);
}

export const quoteLine: QuoteLineFn = (input, ctx) => {
  const product = PRODUCT_BY_CODE[input.productCode];
  const weightKg = toKg(input.unit, input.qty);
  const linePrice = round2(bundleCount(input.unit, input.qty) * product.pricePerBundle);
  const lineCost = round2(weightKg * standardCostPerKg(ctx.costConfig));
  return {
    id: `L-${input.productCode}-${input.size}-${input.unit}`,
    productCode: input.productCode,
    size: input.size,
    unit: input.unit,
    qty: input.qty,
    weightKg,
    unitPricePerBundle: product.pricePerBundle,
    linePrice,
    lineCost,
    lineMargin: round2(linePrice - lineCost),
  };
};

export const quoteOrder: QuoteOrderFn = (inputs, ctx) => {
  const lines = inputs.map((input) => quoteLine(input, ctx));

  const totalWeightKg = lines.reduce((sum, l) => sum + l.weightKg, 0);
  const subtotal = round2(lines.reduce((sum, l) => sum + l.linePrice, 0));
  const standardCost = round2(lines.reduce((sum, l) => sum + l.lineCost, 0));

  // BRD D6 is unresolved, so the threshold and the flat charge are settings.
  // An empty basket is never charged for delivery.
  const deliveryCharge =
    lines.length > 0 && totalWeightKg < ctx.settings.freeDeliveryThresholdKg
      ? ctx.settings.deliveryChargeFlat
      : 0;

  const gstRate = ctx.settings.gstRate;
  const gstAmount = round2((subtotal + deliveryCharge) * gstRate);
  const margin = round2(subtotal - standardCost);

  return {
    lines,
    totalWeightKg,
    totalBundles: totalWeightKg / KG_PER_BUNDLE,
    subtotal,
    deliveryCharge,
    gstRate,
    gstAmount,
    total: round2(subtotal + deliveryCharge + gstAmount),
    standardCost,
    margin,
    marginPct: subtotal === 0 ? 0 : margin / subtotal,
    capExceeded: totalWeightKg > MAX_ORDER_KG,
  };
};

/** Standard margin per kg for one SKU — the BRD §6.3 table, computed. */
export function marginPerKg(
  productCode: keyof typeof PRODUCT_BY_CODE,
  costConfig: Parameters<StandardCostFn>[0],
): number {
  return round2(PRODUCT_BY_CODE[productCode].pricePerKg - standardCostPerKg(costConfig));
}

/** Standard margin per 25 kg bundle for one SKU. */
export function marginPerBundle(
  productCode: keyof typeof PRODUCT_BY_CODE,
  costConfig: Parameters<StandardCostFn>[0],
): number {
  return round2(marginPerKg(productCode, costConfig) * KG_PER_BUNDLE);
}
