import { describe, expect, it } from "vitest";
import {
  computeBestBuys,
  DEFAULT_BUDGET_NOK,
  EUR_TO_NOK,
  MAX_RESULTS,
  type ComputeBestBuysInput,
} from "@/lib/best-buys";
import {
  sampleWantlist,
  sampleWantlistPrices,
} from "@/tests/fixtures/sample-collection";

// Sane defaults for the taste-signal inputs. Tests override just the
// fields they care about via `withOverride({...})`.
const baseInput = (): ComputeBestBuysInput => ({
  items: sampleWantlist,
  prices: sampleWantlistPrices,
  collectionMasterIds: new Set(),
  artistCounts: new Map(),
  labelCounts: new Map(),
  styleCounts: new Map(),
  pressingCounts: new Map(),
  budget: DEFAULT_BUDGET_NOK,
  sortMode: "taste",
});

const withOverride = (
  o: Partial<ComputeBestBuysInput>,
): ComputeBestBuysInput => ({ ...baseInput(), ...o });

describe("computeBestBuys — filtering", () => {
  it("skips items with no price entry", () => {
    const result = computeBestBuys(
      withOverride({
        prices: {}, // no prices at all
      }),
    );
    expect(result).toEqual([]);
  });

  it("skips items whose master is already in the collection", () => {
    // Every wantlist item in the fixture has a distinct master_id. Add
    // Meddle's (5002) to the collection set and it should be filtered out.
    const filtered = new Set(
      computeBestBuys(withOverride({})).map(
        (r) => r.item.basic_information.master_id,
      ),
    );
    expect(filtered.has(5002)).toBe(true);

    const withMasterInCollection = new Set(
      computeBestBuys(
        withOverride({ collectionMasterIds: new Set([5002]) }),
      ).map((r) => r.item.basic_information.master_id),
    );
    expect(withMasterInCollection.has(5002)).toBe(false);
  });

  it("skips items whose priceNok exceeds the budget", () => {
    // Fixture has EUR prices 22, 30, 45, 60 -> NOK ~253, 345, 518, 690.
    // A 400 NOK ceiling should keep only the two cheapest.
    const result = computeBestBuys(
      withOverride({ budget: 400, sortMode: "cheap" }),
    );
    expect(result).toHaveLength(2);
    for (const r of result) expect(r.priceNok).toBeLessThanOrEqual(400);
  });

  it("skips items with lowest_price == null", () => {
    const result = computeBestBuys(
      withOverride({
        prices: {
          ...sampleWantlistPrices,
          9001: { ...sampleWantlistPrices[9001], lowest_price: null },
        },
      }),
    );
    // The other 3 items still land, but 9001 does not.
    const ids = new Set(result.map((r) => r.item.id));
    expect(ids.has(9001)).toBe(false);
    expect(ids.size).toBe(3);
  });

  it("skips items with num_for_sale == 0", () => {
    const result = computeBestBuys(
      withOverride({
        prices: {
          ...sampleWantlistPrices,
          9002: { ...sampleWantlistPrices[9002], num_for_sale: 0 },
        },
      }),
    );
    const ids = new Set(result.map((r) => r.item.id));
    expect(ids.has(9002)).toBe(false);
  });

  it("deduplicates by master_id when multiple items share one", () => {
    const dup = { ...sampleWantlist[0], id: 9999 };
    const dupPrice = { ...sampleWantlistPrices[9001], release_id: 9999 };
    const result = computeBestBuys(
      withOverride({
        items: [...sampleWantlist, dup],
        prices: { ...sampleWantlistPrices, 9999: dupPrice },
      }),
    );
    // Original + dup share master_id 5001 — only one entry with that
    // master should survive.
    const masters = result
      .map((r) => r.item.basic_information.master_id)
      .filter((m) => m === 5001);
    expect(masters).toHaveLength(1);
  });
});

describe("computeBestBuys — priceNok conversion", () => {
  it("multiplies lowest_price by EUR_TO_NOK", () => {
    const result = computeBestBuys(withOverride({ sortMode: "cheap" }));
    for (const r of result) {
      expect(r.priceNok).toBeCloseTo(r.priceEur * EUR_TO_NOK, 5);
    }
  });
});

describe("computeBestBuys — sorting", () => {
  it("cheap sort orders ascending by priceNok", () => {
    const result = computeBestBuys(withOverride({ sortMode: "cheap" }));
    for (let i = 1; i < result.length; i++) {
      expect(result[i].priceNok).toBeGreaterThanOrEqual(result[i - 1].priceNok);
    }
  });

  it("taste sort ranks by tasteScore desc, with priceNok tiebreak asc", () => {
    // Heavy weight on Miles Davis (artist match 5, above the ★ threshold).
    // 9001 is Miles Davis; the others should tie at 0 taste score and be
    // ordered by price.
    const result = computeBestBuys(
      withOverride({
        artistCounts: new Map([["Miles Davis", 5]]),
        sortMode: "taste",
      }),
    );
    expect(result[0].item.id).toBe(9001);
    // The rest all have tasteScore 0 -> tiebreak on priceNok asc.
    const rest = result.slice(1);
    for (let i = 1; i < rest.length; i++) {
      expect(rest[i].priceNok).toBeGreaterThanOrEqual(rest[i - 1].priceNok);
    }
  });

  it("value sort ranks by tasteScore/priceNok desc", () => {
    // Aphex Twin gets a huge artist boost; but its price is 30 EUR (mid-
    // range). Miles Davis also gets a boost, at the cheapest 22 EUR.
    // Value = score/price should put Miles first.
    const result = computeBestBuys(
      withOverride({
        artistCounts: new Map([
          ["Miles Davis", 10],
          ["Aphex Twin", 10],
        ]),
        sortMode: "value",
      }),
    );
    expect(result[0].item.id).toBe(9001); // Miles Davis, cheaper
  });
});

describe("computeBestBuys — reasons", () => {
  it("adds an artist reason when artistMatch >= 3", () => {
    const result = computeBestBuys(
      withOverride({
        artistCounts: new Map([["Miles Davis", 5]]),
      }),
    );
    const miles = result.find((r) => r.item.id === 9001)!;
    expect(
      miles.reasons.some(
        (r) => r.kind === "artist" && r.name === "Miles Davis" && r.count === 5,
      ),
    ).toBe(true);
  });

  it("does not add an artist reason when artistMatch < 3", () => {
    const result = computeBestBuys(
      withOverride({
        artistCounts: new Map([["Miles Davis", 2]]),
      }),
    );
    const miles = result.find((r) => r.item.id === 9001)!;
    expect(miles.reasons.some((r) => r.kind === "artist")).toBe(false);
  });

  it("adds a pressings reason when >= 3 pressings wanted", () => {
    const result = computeBestBuys(
      withOverride({
        pressingCounts: new Map([[5001, 4]]),
      }),
    );
    const miles = result.find((r) => r.item.id === 9001)!;
    expect(
      miles.reasons.some((r) => r.kind === "pressings" && r.count === 4),
    ).toBe(true);
  });

  it("adds a style reason only when the top-style count is >= 10", () => {
    // Below the threshold — no style reason.
    const below = computeBestBuys(
      withOverride({ styleCounts: new Map([["Prog Rock", 5]]) }),
    );
    const meddle = below.find((r) => r.item.id === 9002)!;
    expect(
      meddle.reasons.some((r) => r.kind === "style" && r.name === "Prog Rock"),
    ).toBe(false);

    // Above the threshold — style reason surfaces.
    const above = computeBestBuys(
      withOverride({ styleCounts: new Map([["Prog Rock", 12]]) }),
    );
    const meddle2 = above.find((r) => r.item.id === 9002)!;
    expect(
      meddle2.reasons.some(
        (r) => r.kind === "style" && r.name === "Prog Rock" && r.count === 12,
      ),
    ).toBe(true);
  });
});

describe("computeBestBuys — result cap", () => {
  it("returns at most MAX_RESULTS items", () => {
    // Generate 50 distinct wantlist items + prices.
    const many = Array.from({ length: 50 }, (_, i) => {
      const item = structuredClone(sampleWantlist[0]);
      item.id = 20000 + i;
      item.basic_information.id = 20000 + i;
      item.basic_information.master_id = 30000 + i;
      return item;
    });
    const manyPrices = Object.fromEntries(
      many.map((it) => [
        it.id,
        {
          release_id: it.id,
          lowest_price: 20,
          currency: "EUR",
          num_for_sale: 1,
          blocked_from_sale: false,
          fetched_at: "2024-01-01T00:00:00Z",
        },
      ]),
    );
    const result = computeBestBuys(
      withOverride({ items: many, prices: manyPrices }),
    );
    expect(result.length).toBeLessThanOrEqual(MAX_RESULTS);
    expect(result.length).toBe(MAX_RESULTS);
  });
});
