import { afterEach, describe, expect, it } from "vitest";
import {
  getStorageBackend,
  sanitizeUsername,
  syncInfoKey,
  userKey,
} from "./store";

describe("sanitizeUsername", () => {
  it("lowercases and preserves alphanumerics", () => {
    expect(sanitizeUsername("HansOGJ42")).toBe("hansogj42");
  });

  it("replaces every non-alphanumeric character with an underscore", () => {
    expect(sanitizeUsername("../evil / user.名")).toBe("___evil___user__");
  });

  it("matches the safeCachePath slug rule so file/redis backends stay aligned", () => {
    // Same input, same slug — required during the dual-write migration
    // window so file and redis keys refer to the same user.
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

describe("getStorageBackend", () => {
  const originalBackend = process.env.STORAGE_BACKEND;

  afterEach(() => {
    if (originalBackend === undefined) {
      delete process.env.STORAGE_BACKEND;
    } else {
      process.env.STORAGE_BACKEND = originalBackend;
    }
  });

  it("defaults to file when the env var is unset", () => {
    delete process.env.STORAGE_BACKEND;
    expect(getStorageBackend()).toBe("file");
  });

  it("accepts redis", () => {
    process.env.STORAGE_BACKEND = "redis";
    expect(getStorageBackend()).toBe("redis");
  });

  it("accepts dual", () => {
    process.env.STORAGE_BACKEND = "dual";
    expect(getStorageBackend()).toBe("dual");
  });

  it("falls back to file for any other value", () => {
    process.env.STORAGE_BACKEND = "postgres";
    expect(getStorageBackend()).toBe("file");
  });

  it("is case-insensitive", () => {
    process.env.STORAGE_BACKEND = "REDIS";
    expect(getStorageBackend()).toBe("redis");
  });
});
