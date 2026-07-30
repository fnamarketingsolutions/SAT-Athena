import { describe, expect, it, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

/**
 * The lock has to survive overlapping owners. Route transitions mount the
 * incoming screen's lock while the outgoing one is still held, and the
 * micro-lesson holds two at once (the route and the lesson component). Any
 * scheme where each owner restores the value it happened to observe leaves
 * `overflow: hidden` behind, which silently breaks scrolling on every page
 * visited afterwards.
 */

function Lock({ enabled = true }: { enabled?: boolean }) {
  useBodyScrollLock(enabled);
  return null;
}

const overflow = () => document.body.style.overflow;

beforeEach(() => {
  document.body.style.overflow = "";
});

describe("useBodyScrollLock", () => {
  it("locks while mounted and releases on unmount", () => {
    const { unmount } = render(<Lock />);
    expect(overflow()).toBe("hidden");

    unmount();
    expect(overflow()).toBe("");
  });

  it("stays locked until the last of two nested owners unmounts", () => {
    const outer = render(<Lock />);
    const inner = render(<Lock />);
    expect(overflow()).toBe("hidden");

    inner.unmount();
    expect(overflow()).toBe("hidden");

    outer.unmount();
    expect(overflow()).toBe("");
  });

  it("releases when owners hand over across a route transition", () => {
    // The incoming screen locks before the outgoing one has cleaned up.
    const outgoing = render(<Lock />);
    const incoming = render(<Lock />);
    outgoing.unmount();
    expect(overflow()).toBe("hidden");

    incoming.unmount();
    expect(overflow()).toBe("");
  });

  it("follows an owner that toggles its lock on and off", () => {
    const { rerender } = render(<Lock enabled={false} />);
    expect(overflow()).toBe("");

    rerender(<Lock enabled />);
    expect(overflow()).toBe("hidden");

    rerender(<Lock enabled={false} />);
    expect(overflow()).toBe("");
  });

  it("preserves an overflow value the page already had", () => {
    document.body.style.overflow = "clip";

    const { unmount } = render(<Lock />);
    expect(overflow()).toBe("hidden");

    unmount();
    expect(overflow()).toBe("clip");
  });
});
