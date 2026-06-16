import { describe, expect, it } from "vitest";
import {
  autoFitFontSize,
  clipSegmentToBox,
  cloudExplosionOutline,
  combineBodyAndTails,
  concentrationLineEndpoints,
  effectLineEndpoints,
  flashOutline,
  pseudo,
  roundRectOutline,
  tailOutline,
  unionAll,
  type Point,
} from "./index";

describe("roundRectOutline", () => {
  it("returns 4 corners for a rectangle (strength 100)", () => {
    expect(roundRectOutline(100, 60, 100)).toHaveLength(4);
  });

  it("stays within bounds for an oval (strength 0)", () => {
    const pts = roundRectOutline(100, 60, 0, 8);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(-0.001);
      expect(p.x).toBeLessThanOrEqual(100.001);
      expect(p.y).toBeGreaterThanOrEqual(-0.001);
      expect(p.y).toBeLessThanOrEqual(60.001);
    }
  });
});

describe("autoFitFontSize", () => {
  it("keeps max when it already fits", () => {
    const f = autoFitFontSize(18, 6, 200, 200, (font) => ({ width: font, height: font }));
    expect(f).toBe(18);
  });

  it("shrinks toward a size that fits", () => {
    // 너비 10만 허용 → 폰트가 10 이하로 줄어야 한다.
    const f = autoFitFontSize(40, 6, 10, 1000, (font) => ({ width: font, height: font }));
    expect(f).toBeLessThanOrEqual(10.5);
    expect(f).toBeGreaterThanOrEqual(6);
  });
});

// 저장 파일 시각 일치의 핵심: pseudo 공식·도형 좌표가 원본과 결정적으로 같아야 한다.
describe("pseudo (deterministic noise)", () => {
  it("sin(0) → 0 at seed 0 and stays in [0,1)", () => {
    expect(pseudo(0)).toBe(0);
    for (const s of [1, 7.13, 12.9898, 100.5]) {
      const v = pseudo(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("is repeatable for the same seed", () => {
    expect(pseudo(3.3)).toBe(pseudo(3.3));
  });
});

describe("flashOutline", () => {
  it("has 1 + 2*spikes points (spikes = max(8, count))", () => {
    expect(flashOutline(100, 60, 12, 100, 50)).toHaveLength(1 + 2 * 12);
    expect(flashOutline(100, 60, 4, 100, 50)).toHaveLength(1 + 2 * 8); // count<8 → 8 spikes
  });
  it("starts at the top of the core ellipse (golden)", () => {
    const pts = flashOutline(100, 60, 12, 100, 50);
    // core(-PI/2) = (50, 30 - 30*0.6) = (50, 12)
    expect(pts[0]!.x).toBeCloseTo(50, 6);
    expect(pts[0]!.y).toBeCloseTo(12, 6);
  });
});

describe("cloudExplosionOutline", () => {
  it("samples each lobe into a closed-ish ring (1 + n*10 points)", () => {
    expect(cloudExplosionOutline(170, 100, 9, 0, 50, 0)).toHaveLength(1 + 9 * 10);
  });
  it("is deterministic", () => {
    const a = cloudExplosionOutline(170, 100, 9, 30, 50, 20);
    const b = cloudExplosionOutline(170, 100, 9, 30, 50, 20);
    expect(a).toEqual(b);
  });
});

describe("line effects", () => {
  it("concentration: lines = max(8, count*10), endpoints inside box", () => {
    const lines = concentrationLineEndpoints(120, 80, 9, 50, 50);
    expect(lines).toHaveLength(90);
    for (const l of lines) {
      expect(l.edge.x).toBeGreaterThanOrEqual(-0.001);
      expect(l.edge.x).toBeLessThanOrEqual(120.001);
      expect(l.edge.y).toBeGreaterThanOrEqual(-0.001);
      expect(l.edge.y).toBeLessThanOrEqual(80.001);
    }
  });
  it("effect: lines = max(8, count*10)", () => {
    expect(effectLineEndpoints(120, 80, 9, 50, 50)).toHaveLength(90);
  });
});

describe("clipSegmentToBox (Liang–Barsky)", () => {
  it("keeps a segment fully inside", () => {
    const r = clipSegmentToBox({ x: 10, y: 10 }, { x: 90, y: 50 }, 100, 60);
    expect(r).not.toBeNull();
    expect(r!.c0).toEqual({ x: 10, y: 10 });
    expect(r!.c1).toEqual({ x: 90, y: 50 });
  });
  it("returns null for a segment entirely outside", () => {
    expect(clipSegmentToBox({ x: -50, y: -50 }, { x: -10, y: -10 }, 100, 60)).toBeNull();
  });
  it("clips a crossing segment to the box edge", () => {
    const r = clipSegmentToBox({ x: -50, y: 30 }, { x: 50, y: 30 }, 100, 60);
    expect(r).not.toBeNull();
    expect(r!.c0.x).toBeCloseTo(0, 6); // 왼쪽 변에서 잘림
    expect(r!.c1.x).toBeCloseTo(50, 6);
  });
});

describe("tailOutline", () => {
  it("returns a closed sampled outline (1 + 2*12 points)", () => {
    const pts = tailOutline({ StartX: 85, StartY: 50, X: 130, Y: 130, Width: 28 });
    expect(pts).toHaveLength(1 + 2 * 12);
  });
  it("infers mid as the midpoint when omitted", () => {
    const a = tailOutline({ StartX: 0, StartY: 0, X: 0, Y: 100, Width: 20 });
    const b = tailOutline({ StartX: 0, StartY: 0, MidX: 0, MidY: 50, X: 0, Y: 100, Width: 20 });
    expect(a).toEqual(b);
  });
});

describe("merge (polygon boolean ops)", () => {
  const square = (x: number, y: number, s: number): Point[] => [
    { x, y },
    { x: x + s, y },
    { x: x + s, y: y + s },
    { x, y: y + s },
  ];
  it("unions two overlapping squares into a single polygon", () => {
    const a = combineBodyAndTails(square(0, 0, 20), []);
    const b = combineBodyAndTails(square(10, 10, 20), [], 0, 0);
    const merged = unionAll([a, b]);
    expect(merged).toHaveLength(1); // 겹쳐서 하나로 이어짐
  });
  it("keeps disjoint squares as two polygons", () => {
    const a = combineBodyAndTails(square(0, 0, 10), []);
    const b = combineBodyAndTails(square(100, 100, 10), []);
    expect(unionAll([a, b])).toHaveLength(2);
  });
  it("an inward tail carves the body (exclude)", () => {
    const body = combineBodyAndTails(square(0, 0, 100), []);
    const withCarve = combineBodyAndTails(square(0, 0, 100), [
      { outline: square(40, -10, 20), inward: true },
    ]);
    // 깎인 도형의 외곽선 점 수가 원래 사각형(4)보다 많아진다(노치 생김).
    expect(withCarve[0]![0]!.length).toBeGreaterThan(body[0]![0]!.length);
  });
});
