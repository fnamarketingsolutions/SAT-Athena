import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DraggableOrb } from "@/components/learning/observation/draggable-orb";

/**
 * The orb core is a button that opens the character + voice picker, so the
 * drag has to stay out of the way of a plain click: only a press that travels
 * past the threshold moves the orb, and the click that ends a real drag is
 * swallowed rather than opening the picker.
 */

beforeAll(() => {
  // jsdom implements neither of these; the component guards both, but stubbing
  // them keeps the test on the same path a browser takes.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

/** The transform lands on the next frame — motion values don't re-render. */
function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function pointer(type: string, x: number, y: number, buttons = 1) {
  return new PointerEvent(type, {
    clientX: x,
    clientY: y,
    buttons,
    pointerId: 1,
    bubbles: true,
  });
}

function setup() {
  const onOrbClick = vi.fn();
  render(
    <DraggableOrb
      orb={
        <button type="button" onClick={onOrbClick}>
          orb
        </button>
      }
      caption={<span>caption</span>}
    />,
  );
  const orb = screen.getByRole("button", { name: "orb" });
  const handle = orb.parentElement!;
  const column = handle.parentElement!;
  return { onOrbClick, orb, handle, column };
}

describe("DraggableOrb", () => {
  it("moves the column by the drag distance", async () => {
    const { handle, column } = setup();

    handle.dispatchEvent(pointer("pointerdown", 100, 100));
    handle.dispatchEvent(pointer("pointermove", 160, 140));
    handle.dispatchEvent(pointer("pointerup", 160, 140, 0));

    await waitFor(() => {
      expect(column.style.transform).toContain("translateX(60px)");
      expect(column.style.transform).toContain("translateY(40px)");
    });
  });

  it("accumulates across separate drags", async () => {
    const { handle, column } = setup();

    handle.dispatchEvent(pointer("pointerdown", 0, 0));
    handle.dispatchEvent(pointer("pointermove", 30, 0));
    handle.dispatchEvent(pointer("pointerup", 30, 0, 0));

    handle.dispatchEvent(pointer("pointerdown", 0, 0));
    handle.dispatchEvent(pointer("pointermove", 25, 0));
    handle.dispatchEvent(pointer("pointerup", 25, 0, 0));

    await waitFor(() =>
      expect(column.style.transform).toContain("translateX(55px)"),
    );
  });

  it("ignores a press that stays under the drag threshold", async () => {
    const { handle, column, orb, onOrbClick } = setup();

    handle.dispatchEvent(pointer("pointerdown", 100, 100));
    handle.dispatchEvent(pointer("pointermove", 103, 101));
    handle.dispatchEvent(pointer("pointerup", 103, 101, 0));
    orb.click();
    await nextFrame();

    expect(column.style.transform).not.toContain("translateX(3px)");
    expect(onOrbClick).toHaveBeenCalledTimes(1);
  });

  it("swallows the click that ends a real drag", () => {
    const { handle, orb, onOrbClick } = setup();

    handle.dispatchEvent(pointer("pointerdown", 100, 100));
    handle.dispatchEvent(pointer("pointermove", 160, 100));
    handle.dispatchEvent(pointer("pointerup", 160, 100, 0));
    orb.click();

    expect(onOrbClick).not.toHaveBeenCalled();

    // Only that one click is suppressed — the picker works again right after.
    orb.click();
    expect(onOrbClick).toHaveBeenCalledTimes(1);
  });

  it("drops a stale drag when the pointer returns with no button held", async () => {
    const { handle, column } = setup();

    handle.dispatchEvent(pointer("pointerdown", 100, 100));
    // pointerup missed (it landed on the picker popover), then a plain hover.
    handle.dispatchEvent(pointer("pointermove", 400, 400, 0));
    handle.dispatchEvent(pointer("pointermove", 500, 500, 0));
    await nextFrame();

    expect(column.style.transform).not.toContain("translateX(400px)");
  });
});
