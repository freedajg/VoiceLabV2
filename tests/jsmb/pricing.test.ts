import { describe, expect, it } from "vitest";
import type { LineInput, PricingContext } from "../../src/jsmb/contracts/engines";
import type { ProductCode } from "../../src/jsmb/domain/types";
import {
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_COST_CONFIG,
  KG_PER_BUNDLE,
  MAX_ORDER_KG,
  PRODUCT_BY_CODE,
  STANDARD_COST_PER_KG,
} from "../../src/jsmb/domain/constants";
import {
  marginPerBundle,
  marginPerKg,
  quoteLine,
  quoteOrder,
  standardCostPerKg,
} from "../../src/jsmb/domain/pricing";
import { round2 } from "../../src/jsmb/domain/format";

const ctx: PricingContext = {
  costConfig: DEFAULT_COST_CONFIG,
  settings: DEFAULT_BUSINESS_SETTINGS,
  region: "telangana",
};

/** BRD §5.2 — the price list, verbatim. */
const PRICE_TABLE: { code: ProductCode; perBundle: number; perKg: number }[] = [
  { code: "P-PT", perBundle: 570, perKg: 22.8 },
  { code: "P-PK", perBundle: 520, perKg: 20.8 },
  { code: "PT-SB", perBundle: 690, perKg: 27.6 },
  { code: "PT-CP", perBundle: 690, perKg: 27.6 },
  { code: "PK-FL", perBundle: 560, perKg: 22.4 },
  { code: "PK-PF", perBundle: 610, perKg: 24.4 },
  { code: "PK-CT", perBundle: 560, perKg: 22.4 },
];

describe("catalogue prices — BRD §5.2", () => {
  it("prices all seven SKUs per bundle and per kg", () => {
    expect(PRICE_TABLE).toHaveLength(7);
    for (const row of PRICE_TABLE) {
      const product = PRODUCT_BY_CODE[row.code];
      expect(product.pricePerBundle).toBe(row.perBundle);
      expect(product.pricePerKg).toBe(row.perKg);
      // Per-kg is always the bundle price over 25 kg — no independent figure.
      expect(round2(product.pricePerBundle / KG_PER_BUNDLE)).toBe(row.perKg);
      expect(product.basePricePerBundle + product.patternCharge).toBe(row.perBundle);
    }
  });

  it("keeps thick below thin by design (BRD §5.2 note)", () => {
    expect(PRODUCT_BY_CODE["P-PK"].pricePerKg).toBeLessThan(PRODUCT_BY_CODE["P-PT"].pricePerKg);
  });
});

describe("standard cost — BRD §6.1", () => {
  it("builds up to ₹20.20/kg and excludes the target margin", () => {
    expect(standardCostPerKg(DEFAULT_COST_CONFIG)).toBe(20.2);
    expect(standardCostPerKg(DEFAULT_COST_CONFIG)).toBe(round2(STANDARD_COST_PER_KG));
  });

  it("re-flows when an assumption is edited (FR-A-15)", () => {
    expect(standardCostPerKg({ ...DEFAULT_COST_CONFIG, rawMaterial: 14.2 })).toBe(21.2);
  });
});

describe("per-product margin — BRD §6.3", () => {
  const TABLE: { code: ProductCode; perKg: number; perBundle: number }[] = [
    { code: "P-PT", perKg: 2.6, perBundle: 65 },
    { code: "P-PK", perKg: 0.6, perBundle: 15 },
    { code: "PT-SB", perKg: 7.4, perBundle: 185 },
    { code: "PT-CP", perKg: 7.4, perBundle: 185 },
    { code: "PK-FL", perKg: 2.2, perBundle: 55 },
    { code: "PK-CT", perKg: 2.2, perBundle: 55 },
    { code: "PK-PF", perKg: 4.2, perBundle: 105 },
  ];

  it.each(TABLE)("$code earns ₹$perKg/kg and ₹$perBundle/bundle", ({ code, perKg, perBundle }) => {
    expect(marginPerKg(code, DEFAULT_COST_CONFIG)).toBe(perKg);
    expect(marginPerBundle(code, DEFAULT_COST_CONFIG)).toBe(perBundle);
  });

  it("reproduces the table through a real quoted line", () => {
    for (const { code, perBundle } of TABLE) {
      const line = quoteLine({ productCode: code, size: PRODUCT_BY_CODE[code].sizes[0], unit: "bundle", qty: 1 }, ctx);
      expect(line.lineMargin).toBe(perBundle);
      expect(line.weightKg).toBe(25);
      expect(line.lineCost).toBe(505); // 25 kg × ₹20.20
    }
  });
});

describe("quoteLine", () => {
  it("prices a lot as twenty bundles", () => {
    const line = quoteLine({ productCode: "P-PT", size: 12, unit: "lot", qty: 3 }, ctx);
    expect(line.weightKg).toBe(1500);
    expect(line.linePrice).toBe(3 * 20 * 570);
    expect(line.lineCost).toBe(round2(1500 * 20.2));
    expect(line.lineMargin).toBe(round2(line.linePrice - line.lineCost));
    expect(line.unitPricePerBundle).toBe(570);
  });
});

describe("quoteOrder", () => {
  const bigBasket: LineInput[] = [{ productCode: "P-PT", size: 12, unit: "lot", qty: 10 }]; // 5 t

  it("charges flat delivery below the threshold and nothing above it", () => {
    const small = quoteOrder([{ productCode: "P-PT", size: 12, unit: "bundle", qty: 4 }], ctx);
    expect(small.totalWeightKg).toBe(100);
    expect(small.deliveryCharge).toBe(DEFAULT_BUSINESS_SETTINGS.deliveryChargeFlat);

    const big = quoteOrder(bigBasket, ctx);
    expect(big.totalWeightKg).toBeGreaterThanOrEqual(DEFAULT_BUSINESS_SETTINGS.freeDeliveryThresholdKg);
    expect(big.deliveryCharge).toBe(0);
  });

  it("never charges delivery on an empty basket", () => {
    const empty = quoteOrder([], ctx);
    expect(empty.deliveryCharge).toBe(0);
    expect(empty.total).toBe(0);
    expect(empty.marginPct).toBe(0);
    expect(empty.capExceeded).toBe(false);
  });

  it("adds GST to the taxable value and totals exactly", () => {
    const quote = quoteOrder(bigBasket, ctx);
    expect(quote.subtotal).toBe(10 * 20 * 570);
    expect(quote.gstRate).toBe(0.12);
    expect(quote.gstAmount).toBe(round2((quote.subtotal + quote.deliveryCharge) * 0.12));
    expect(quote.total).toBe(round2(quote.subtotal + quote.deliveryCharge + quote.gstAmount));
  });

  it("sums lines without drifting a paisa", () => {
    const quote = quoteOrder(
      [
        { productCode: "P-PT", size: 12, unit: "bundle", qty: 7 },
        { productCode: "PT-SB", size: 10, unit: "bundle", qty: 3 },
        { productCode: "PK-PF", size: 28, unit: "lot", qty: 1 },
      ],
      ctx,
    );
    expect(quote.subtotal).toBe(round2(quote.lines.reduce((s, l) => s + l.linePrice, 0)));
    expect(quote.standardCost).toBe(round2(quote.lines.reduce((s, l) => s + l.lineCost, 0)));
    expect(quote.margin).toBe(round2(quote.subtotal - quote.standardCost));
    expect(quote.totalWeightKg).toBe(7 * 25 + 3 * 25 + 500);
    expect(quote.totalBundles).toBe(quote.totalWeightKg / KG_PER_BUNDLE);
    expect(quote.marginPct).toBeCloseTo(quote.margin / quote.subtotal, 10);
  });

  it("flags the 20 t cap at the boundary, not before it", () => {
    const exactly = quoteOrder([{ productCode: "P-PT", size: 12, unit: "lot", qty: 40 }], ctx);
    expect(exactly.totalWeightKg).toBe(MAX_ORDER_KG);
    expect(exactly.capExceeded).toBe(false);

    const oneMore = quoteOrder(
      [
        { productCode: "P-PT", size: 12, unit: "lot", qty: 40 },
        { productCode: "P-PK", size: 24, unit: "bundle", qty: 1 },
      ],
      ctx,
    );
    expect(oneMore.totalWeightKg).toBe(MAX_ORDER_KG + KG_PER_BUNDLE);
    expect(oneMore.capExceeded).toBe(true);
  });
});
