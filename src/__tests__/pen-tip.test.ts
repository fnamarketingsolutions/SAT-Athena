import { describe, it, expect } from "vitest";
import {
  penTipForStep,
  isDiagramStep,
  resolveShapePart,
  type BoardBox,
} from "@/components/whiteboard/pen-tip";
import type { GeometryAction, WhiteboardStep } from "@/types/whiteboard";

// A 100x100 box at the origin makes local 0–100 map 1:1 to board coords.
const BOX: BoardBox = { x: 0, y: 0, width: 100, height: 100 };

function geomStep(action: WhiteboardStep["action"]): WhiteboardStep {
  return { id: 1, action } as WhiteboardStep;
}

describe("isDiagramStep", () => {
  it("flags drawn diagram types and rejects text/math", () => {
    expect(isDiagramStep(geomStep({ type: "geometry", figures: [] }))).toBe(true);
    expect(
      isDiagramStep(geomStep({ type: "coordinate_plane", xRange: [0, 1], yRange: [0, 1], elements: [] })),
    ).toBe(true);
    expect(isDiagramStep(geomStep({ type: "write_text", text: "hi" } as never))).toBe(false);
    expect(isDiagramStep(undefined)).toBe(false);
  });
});

describe("penTipForStep — geometry line tracing", () => {
  const step = geomStep({
    type: "geometry",
    figures: [{ type: "line_segment", from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }],
  });

  it("starts at the stroke origin at progress 0", () => {
    const tip = penTipForStep(step, 0, BOX);
    expect(tip).not.toBeNull();
    expect(tip!.x).toBeCloseTo(0, 5);
    expect(tip!.y).toBeCloseTo(0, 5);
  });

  it("reaches the stroke end at progress 1", () => {
    const tip = penTipForStep(step, 1, BOX)!;
    expect(tip.x).toBeCloseTo(100, 5);
    expect(tip.y).toBeCloseTo(0, 5);
  });

  it("is halfway along at progress 0.5", () => {
    const tip = penTipForStep(step, 0.5, BOX)!;
    expect(tip.x).toBeCloseTo(50, 5);
  });
});

describe("penTipForStep — picks the longest figure", () => {
  it("traces the long line, not the short one", () => {
    const step = geomStep({
      type: "geometry",
      figures: [
        { type: "line_segment", from: { x: 0, y: 0 }, to: { x: 10, y: 0 } }, // short
        { type: "line_segment", from: { x: 0, y: 50 }, to: { x: 100, y: 50 } }, // long
      ],
    });
    // At progress 1 the tip should sit at the END of the LONG line (x≈100,y≈50),
    // not the short one (x≈10,y≈0).
    const tip = penTipForStep(step, 1, BOX)!;
    expect(tip.x).toBeCloseTo(100, 5);
    expect(tip.y).toBeCloseTo(50, 5);
  });
});

describe("penTipForStep — polygon closes the loop", () => {
  it("returns to the first vertex at progress 1", () => {
    const step = geomStep({
      type: "geometry",
      figures: [
        {
          type: "polygon",
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      ],
    });
    const start = penTipForStep(step, 0, BOX)!;
    const end = penTipForStep(step, 1, BOX)!;
    // Closed loop: end coincides with start.
    expect(end.x).toBeCloseTo(start.x, 5);
    expect(end.y).toBeCloseTo(start.y, 5);
    expect(start.x).toBeCloseTo(0, 5);
    expect(start.y).toBeCloseTo(0, 5);
  });
});

describe("penTipForStep — non-geometry diagrams sweep the box", () => {
  it("sweeps left→right across a coordinate plane", () => {
    const step = geomStep({
      type: "coordinate_plane",
      xRange: [0, 10],
      yRange: [0, 10],
      elements: [],
    });
    const box: BoardBox = { x: 200, y: 300, width: 400, height: 200 };
    const start = penTipForStep(step, 0, box)!;
    const mid = penTipForStep(step, 0.5, box)!;
    const end = penTipForStep(step, 1, box)!;
    expect(start.x).toBeCloseTo(200, 5);
    expect(mid.x).toBeCloseTo(400, 5);
    expect(end.x).toBeCloseTo(600, 5);
    // Constant mid-height sweep.
    expect(start.y).toBeCloseTo(400, 5);
    expect(end.y).toBeCloseTo(400, 5);
  });
});

describe("penTipForStep — null for non-diagram steps", () => {
  it("returns null for text", () => {
    expect(penTipForStep(geomStep({ type: "write_text", text: "x" } as never), 0.5, BOX)).toBeNull();
  });
});

describe("resolveShapePart", () => {
  // Right triangle A(0,100) B(0,0) C(80,100), labeled; hypotenuse label "13".
  const tri: GeometryAction = {
    type: "geometry",
    figures: [
      {
        type: "polygon",
        vertices: [
          { x: 0, y: 100 },
          { x: 0, y: 0 },
          { x: 80, y: 100 },
        ],
        vertexLabels: ["A", "B", "C"],
      },
    ],
    labels: [{ text: "13", position: { x: 40, y: 50 } }],
    annotations: [
      { type: "right_angle", vertex: { x: 0, y: 100 } },
      { type: "dimension", from: { x: 0, y: 100 }, to: { x: 80, y: 100 }, label: "8" },
    ],
  };

  it("resolves a vertex by label", () => {
    expect(resolveShapePart(tri, "C")?.point).toEqual({ x: 80, y: 100 });
    expect(resolveShapePart(tri, "B")?.point).toEqual({ x: 0, y: 0 });
  });

  it("is case-insensitive for vertex labels", () => {
    expect(resolveShapePart(tri, "c")?.point).toEqual({ x: 80, y: 100 });
  });

  it("resolves a side (vertex pair) to the midpoint", () => {
    // A(0,100) + C(80,100) midpoint
    expect(resolveShapePart(tri, "AC")?.point).toEqual({ x: 40, y: 100 });
    // separator tolerated
    expect(resolveShapePart(tri, "A-C")?.point).toEqual({ x: 40, y: 100 });
  });

  it("resolves a label text to its position", () => {
    expect(resolveShapePart(tri, "13")?.point).toEqual({ x: 40, y: 50 });
  });

  it("resolves a dimension label to its midpoint", () => {
    expect(resolveShapePart(tri, "8")?.point).toEqual({ x: 40, y: 100 });
  });

  it("returns null for an unknown part", () => {
    expect(resolveShapePart(tri, "Z")).toBeNull();
    expect(resolveShapePart(tri, "")).toBeNull();
  });

  it("gives an outward unit vector pointing away from the centroid", () => {
    // centroid ≈ (26.7, 66.7); C is down-right of it.
    const r = resolveShapePart(tri, "C")!;
    expect(Math.hypot(r.outward.x, r.outward.y)).toBeCloseTo(1, 5);
    expect(r.outward.x).toBeGreaterThan(0); // C is right of centroid
    expect(r.outward.y).toBeGreaterThan(0); // C is below centroid
  });
});
