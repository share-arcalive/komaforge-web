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
  hasCornerWarp,
  roundRectOutline,
  tailOutline,
  thoughtTailOutlines,
  unionAll,
  warpPoint,
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

  it("blends to a uniform capsule radius at strength 50 (v0.1.4)", () => {
    // t=0.5 → rx=ry=min(w,h)/2. 짧은 변(60)의 절반=30 이 좌우 모서리 반경.
    // 좌상 모서리 중심은 (rx, ry)=(30,30) → 가장 왼쪽 점 x≈0, 가장 위 점 y≈0.
    const pts = roundRectOutline(100, 60, 50, 8);
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    expect(minX).toBeCloseTo(0, 5);
    expect(maxX).toBeCloseTo(100, 5);
    // 캡슐: 반경이 균일(30)이라 상단 직선 구간의 y 최소값은 0.
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(0, 5);
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

describe("thoughtTailOutlines (v0.1.5)", () => {
  it("returns 3 circle rings of decreasing radius", () => {
    const rings = thoughtTailOutlines({ StartX: 0, StartY: 0, MidX: 0, MidY: 60, X: 0, Y: 120, Width: 20 });
    expect(rings).toHaveLength(3);
    const radius = (ring: Point[]): number => {
      const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length;
      const cy = ring.reduce((s, p) => s + p.y, 0) / ring.length;
      return Math.hypot(ring[0]!.x - cx, ring[0]!.y - cy);
    };
    const r0 = radius(rings[0]!);
    const r1 = radius(rings[1]!);
    const r2 = radius(rings[2]!);
    expect(r0).toBeGreaterThan(r1);
    expect(r1).toBeGreaterThan(r2);
    // baseR = max(6, width*0.9) = 18, 첫 원 반지름 = 18.
    expect(r0).toBeCloseTo(18, 5);
  });
});

describe("effectLineEndpoints centered (v0.1.5)", () => {
  it("centers each line around the box center when centered=true", () => {
    const w = 120;
    const h = 80;
    const cx = w / 2;
    // strength 0 → 방향 0°(x축), irregularity 50 → 선 길이가 제각각.
    // centered면 각 선을 ±length/2로 배치하므로 길이와 무관하게 진행축(x) 중점이 항상 중앙(cx).
    const centered = effectLineEndpoints(w, h, 9, 0, 50, true);
    for (const l of centered) {
      expect(Math.abs((l.base.x + l.tip.x) / 2 - cx)).toBeCloseTo(0, 5);
    }
    // 비centered는 -half에서 시작해 길이만큼 뻗으므로 길이가 다르면 중점이 중앙을 벗어난다.
    const off = effectLineEndpoints(w, h, 9, 0, 50, false);
    expect(off.some((l) => Math.abs((l.base.x + l.tip.x) / 2 - cx) > 1)).toBe(true);
  });
});

describe("warpPoint (v0.1.2 모서리 워프)", () => {
  const noOffset = new Array(8).fill(0);
  it("is identity when all offsets are zero", () => {
    expect(hasCornerWarp(noOffset)).toBe(false);
    const p = warpPoint(30, 40, 100, 60, noOffset);
    expect(p.x).toBeCloseTo(30, 6);
    expect(p.y).toBeCloseTo(40, 6);
  });
  it("maps the four corners to the offset quad (TL,TR,BR,BL × X,Y)", () => {
    // TL +(5,7), TR +(-3,2), BR +(4,-6), BL +(1,9)
    const o = [5, 7, -3, 2, 4, -6, 1, 9];
    expect(hasCornerWarp(o)).toBe(true);
    const w = 100;
    const h = 60;
    expect(warpPoint(0, 0, w, h, o)).toEqual({ x: 0 + 5, y: 0 + 7 }); // TL
    expect(warpPoint(w, 0, w, h, o)).toEqual({ x: w - 3, y: 0 + 2 }); // TR
    expect(warpPoint(w, h, w, h, o)).toEqual({ x: w + 4, y: h - 6 }); // BR
    expect(warpPoint(0, h, w, h, o)).toEqual({ x: 0 + 1, y: h + 9 }); // BL
    // 중앙은 네 모서리 평균.
    const c = warpPoint(w / 2, h / 2, w, h, o);
    expect(c.x).toBeCloseTo((5 + (w - 3) + (w + 4) + 1) / 4, 6);
    expect(c.y).toBeCloseTo((7 + 2 + (h - 6) + (h + 9)) / 4, 6);
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
