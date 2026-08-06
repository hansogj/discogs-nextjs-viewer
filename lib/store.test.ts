import { describe, expect, it } from "vitest";
import { sanitizeUsername, syncInfoKey, userKey } from "./store";

describe("sanitizeUsername", () => {
  it("lowercases and preserves alphanumerics", () => {
    expect(sanitizeUsername("HansOGJ42")).toBe("hansogj42");
  });

  it("replaces every non-alphanumeric character with an underscore", () => {
    expect(sanitizeUsername("../evil / user.名")).toBe("___evil___user__");
  });

  it("produces stable slugs for usernames with punctuation", () => {
    expect(sanitizeUsername("Hans.O.Gjerdrum")).toBe("hans_o_gjerdrum");
  });
});

describe("userKey", () => {
  it("builds a namespaced key for each supported store key", () => {
    expect(userKey("hansogj", "collection")).toBe(
      "discogs-viewer:user:hansogj:collection",
    );
    expect(userKey("hansogj", "wantlist")).toBe(
      "discogs-viewer:user:hansogj:wantlist",
    );
    expect(userKey("hansogj", "folders")).toBe(
      "discogs-viewer:user:hansogj:folders",
    );
    expect(userKey("hansogj", "custom_fields")).toBe(
      "discogs-viewer:user:hansogj:custom_fields",
    );
    expect(userKey("hansogj", "wantlist_prices")).toBe(
      "discogs-viewer:user:hansogj:wantlist_prices",
    );
  });

  it("sanitises the username in the key", () => {
    expect(userKey("Hans.O.Gjerdrum", "collection")).toBe(
      "discogs-viewer:user:hans_o_gjerdrum:collection",
    );
  });
});

describe("syncInfoKey", () => {
  it("uses a dedicated sync_info suffix", () => {
    expect(syncInfoKey("hansogj")).toBe(
      "discogs-viewer:user:hansogj:sync_info",
    );
  });
});
