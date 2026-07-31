import { describe, expect, it } from "vitest";
// Import from lib/stats directly rather than lib/data — the latter pulls
// in server-only iron-session bindings that fail to load in vitest even
// with env stubs.
import { computeCollectionStats, getCollectionDuplicates } from "@/lib/stats";
import { sampleCollection } from "@/tests/fixtures/sample-collection";
import type { CollectionRelease } from "@/lib/types";

describe("getCollectionDuplicates", () => {
  it("returns an empty array for an empty collection", () => {
    expect(getCollectionDuplicates([])).toEqual([]);
  });

  it("groups by master_id when present", () => {
    // In the fixture, releases 2 & 3 share master_id 42.
    const groups = getCollectionDuplicates(sampleCollection);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
    expect(
      new Set(groups[0].map((r) => r.basic_information.master_id)),
    ).toEqual(new Set([42]));
  });

  it("falls back to release id when master_id is 0", () => {
    // Two entries with the same release id but master_id === 0 must be
    // treated as duplicates of each other.
    const dup: CollectionRelease = {
      ...sampleCollection[0],
      instance_id: 9999,
    };
    const groups = getCollectionDuplicates([sampleCollection[0], dup]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((r) => r.instance_id).sort()).toEqual(
      [sampleCollection[0].instance_id, 9999].sort(),
    );
  });

  it("ignores singleton groups", () => {
    // Everything with a unique key drops out — the fixture only has one
    // shared master, so only that group survives.
    const groups = getCollectionDuplicates(sampleCollection);
    expect(groups.every((g) => g.length > 1)).toBe(true);
  });
});

describe("computeCollectionStats", () => {
  it("returns zeros for an empty collection", () => {
    const s = computeCollectionStats([]);
    expect(s.totalReleases).toBe(0);
    expect(s.uniqueArtists).toBe(0);
    expect(s.uniqueLabels).toBe(0);
    expect(s.vinylPct).toBe(0);
    expect(s.styleCounts).toEqual([]);
  });

  it("counts totals from the fixture collection", () => {
    const s = computeCollectionStats(sampleCollection);
    expect(s.totalReleases).toBe(sampleCollection.length);
    // Miles Davis, Coltrane, Pink Floyd, Fleetwood Mac, Aphex Twin — five
    // named artists. "Various" is excluded on purpose.
    expect(s.uniqueArtists).toBe(5);
  });

  it("excludes 'Various' from artist aggregation", () => {
    const s = computeCollectionStats(sampleCollection);
    expect(s.artistCounts.map(([a]) => a)).not.toContain("Various");
  });

  it("sorts artistCounts and labelCounts descending by count", () => {
    const s = computeCollectionStats(sampleCollection);
    for (let i = 1; i < s.artistCounts.length; i++) {
      expect(s.artistCounts[i - 1][1]).toBeGreaterThanOrEqual(
        s.artistCounts[i][1],
      );
    }
    for (let i = 1; i < s.labelCounts.length; i++) {
      expect(s.labelCounts[i - 1][1]).toBeGreaterThanOrEqual(
        s.labelCounts[i][1],
      );
    }
  });

  it("families formats into Vinyl / CD / Annet", () => {
    const s = computeCollectionStats(sampleCollection);
    const map = new Map(s.formatCounts);
    // Fixture has vinyl variants (Vinyl, LP, 12") that all fold to Vinyl,
    // plus one CD.
    expect(map.get("Vinyl")).toBeGreaterThan(0);
    expect(map.get("CD")).toBe(1);
  });

  it("computes vinylPct from the Vinyl family total", () => {
    const s = computeCollectionStats(sampleCollection);
    const vinyl = new Map(s.formatCounts).get("Vinyl") ?? 0;
    expect(s.vinylPct).toBe(Math.round((vinyl / s.totalReleases) * 100));
  });

  it("bins years into decades", () => {
    const s = computeCollectionStats(sampleCollection);
    const decadeMap = new Map(s.decadeCounts);
    // Fixture spans 1957 → 1997 with representative releases in 1950s,
    // 1960s, 1970s, 1990s. 1997 lands in 1990s.
    expect(decadeMap.get("1950s")).toBeGreaterThan(0);
    expect(decadeMap.get("1970s")).toBeGreaterThan(0);
    expect(decadeMap.get("1990s")).toBeGreaterThan(0);
  });

  it("sorts decadeCounts ascending by decade string", () => {
    const s = computeCollectionStats(sampleCollection);
    const decades = s.decadeCounts.map(([d]) => d);
    expect(decades).toEqual([...decades].sort());
  });

  it("only records recognised media-condition notes", () => {
    const s = computeCollectionStats(sampleCollection);
    const conditions = new Set(s.conditionCounts.map(([n]) => n));
    expect(conditions.has("Near Mint (NM or M-)")).toBe(true);
    // Should not include our synthetic "0" or arbitrary strings.
    for (const [name] of s.conditionCounts) {
      expect([
        "Mint (M)",
        "Near Mint (NM or M-)",
        "Very Good Plus (VG+)",
        "Very Good (VG)",
        "Good Plus (G+)",
        "Good (G)",
        "Fair (F)",
        "Poor (P)",
      ]).toContain(name);
    }
  });

  it("records each artist's dominant style", () => {
    const s = computeCollectionStats(sampleCollection);
    const dominant = new Map(s.artistDominantStyle);
    // Miles Davis has three "Cool Jazz" tagged releases in the fixture
    // vs one "Modal" — Cool Jazz should win.
    expect(dominant.get("Miles Davis")).toBe("Cool Jazz");
    // Pink Floyd has two Prog Rock tagged releases vs one Psychedelic —
    // Prog Rock wins.
    expect(dominant.get("Pink Floyd")).toBe("Prog Rock");
  });

  it("caps artistCounts and labelCounts at 20", () => {
    // Build a synthetic collection with 25 distinct artists and 25 distinct
    // labels; the aggregation should trim to the top 20 of each.
    const big: CollectionRelease[] = Array.from({ length: 25 }, (_, i) => {
      const r = structuredClone(sampleCollection[0]);
      r.basic_information.artists[0].name = `Artist ${i}`;
      r.basic_information.labels[0].name = `Label ${i}`;
      return r;
    });
    const s = computeCollectionStats(big);
    expect(s.artistCounts.length).toBe(20);
    expect(s.labelCounts.length).toBe(20);
  });
});
