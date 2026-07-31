import { describe, expect, it } from "vitest";
import path from "path";
import { safeCachePath } from "./cache";

const CACHE_DIR = path.resolve("./.next/cache/discogs-data");

describe("safeCachePath", () => {
  it("resolves a plain alphanumeric username to a path inside CACHE_DIR", () => {
    const p = safeCachePath("hansogj", "collection.json");
    expect(p).toBe(path.join(CACHE_DIR, "hansogj-collection.json"));
  });

  it("lowercases and preserves alphanumerics", () => {
    const p = safeCachePath("HansOGJ42", "wantlist.json");
    expect(p).toBe(path.join(CACHE_DIR, "hansogj42-wantlist.json"));
  });

  it("replaces every non-alphanumeric character with an underscore", () => {
    // dots, slashes, spaces, unicode BMP chars — all become _.
    // "../evil / user.名" -> "___evil___user__" (each of . . / turns to _,
    // spaces to _, trailing . and 名 each add one more _).
    const p = safeCachePath("../evil / user.名", "collection.json");
    expect(p).toBe(path.join(CACHE_DIR, "___evil___user__-collection.json"));
  });

  it("blocks a path-traversal attempt via the filename argument", () => {
    // The username is fully sanitised, but the filename argument is
    // interpolated verbatim. Two `..` segments after the username-prefixed
    // path escape CACHE_DIR (one pops the `hansogj-` segment, the next
    // walks up out of the cache dir itself). The defence-in-depth guard
    // catches it.
    expect(() => safeCachePath("hansogj", "/../../evil.json")).toThrow(
      /escape/i,
    );
  });

  it("produces the expected filename shape for a known cache key", () => {
    const p = safeCachePath("murdrejg", "folders.json");
    expect(path.basename(p)).toBe("murdrejg-folders.json");
    expect(p.startsWith(CACHE_DIR)).toBe(true);
  });
});
