import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebounce } from "./use-debounce";

// tick() fires the setTimeout callback synchronously, but
// React's setDebouncedValue queues a re-render outside of any commit phase.
// Wrapping the tick in act() flushes both, so `result.current` reflects the
// post-timeout state on the very next line.
const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value synchronously on first render", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update the debounced value until the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebounce(v, 300),
      { initialProps: { v: "a" } },
    );

    rerender({ v: "b" });
    // Advance less than the delay — still holds the old value.
    tick(200);
    expect(result.current).toBe("a");

    // Push past the delay — new value lands.
    tick(150);
    expect(result.current).toBe("b");
  });

  it("collapses rapid successive changes into one commit", () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: number }) => useDebounce(v, 500),
      { initialProps: { v: 0 } },
    );

    rerender({ v: 1 });
    tick(100);
    rerender({ v: 2 });
    tick(100);
    rerender({ v: 3 });
    tick(499);
    // We're still within the last debounce window — no commit yet.
    expect(result.current).toBe(0);

    tick(2);
    expect(result.current).toBe(3);
  });

  it("respects a change in the delay parameter", () => {
    const { result, rerender } = renderHook(
      ({ v, d }: { v: string; d: number }) => useDebounce(v, d),
      { initialProps: { v: "x", d: 1000 } },
    );

    rerender({ v: "y", d: 100 });
    tick(150);
    expect(result.current).toBe("y");
  });
});
