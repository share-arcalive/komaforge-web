import { clamp, type Point } from "./internal";

export type { Point } from "./internal";
export {
  cloudExplosionOutline,
  flashOutline,
  concentrationLineEndpoints,
  effectLineEndpoints,
  clipSegmentToBox,
  type ConcentrationLine,
  type EffectLine,
} from "./shapes";
export { tailOutline, thoughtTailOutlines, type TailLike } from "./tail";
export {
  combineBodyAndTails,
  unionAll,
  type Ring,
  type Poly,
  type MultiPoly,
} from "./merge";
export { pseudo, irregularityMul } from "./noise";
export { hasCornerWarp, warpPoint, warpRing } from "./warp";

/**
 * 원본 CreateRoundRectGeometry (Shapes.cs) 포팅.
 * strength 0 = 완전 타원(원형/사각의 "원"), 100 = 직사각형.
 * WPF는 RectangleGeometry(rx,ry) 한 줄이지만, Pixi는 타원 모서리를 직접 지원하지 않으므로
 * 외곽선을 폴리곤으로 샘플링해 반환한다(엔진이 poly로 그린다).
 */
export function roundRectOutline(
  width: number,
  height: number,
  strength: number,
  cornerSegments = 10,
): Point[] {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const t = clamp(strength, 0, 100) / 100;
  // v0.1.4: 타원(0)→캡슐(50)→사각형(100) 블렌딩. 원본 CreateRoundRectGeometry.
  //  0~50: 타원 반경에서 '짧은 변 기준 균일 반경(캡슐)'으로 보간 → 모서리가 점점 일정.
  //  50~100: 캡슐(균일 반경)을 0으로 균일하게 줄여 사각형 → 모서리 곡선이 비율과 무관하게 일정.
  const rCapsule = Math.min(w, h) / 2;
  let rx: number;
  let ry: number;
  if (t <= 0.5) {
    const b = t / 0.5;
    rx = w / 2 + (rCapsule - w / 2) * b;
    ry = h / 2 + (rCapsule - h / 2) * b;
  } else {
    const c = (t - 0.5) / 0.5;
    rx = ry = rCapsule * (1 - c);
  }
  rx = clamp(rx, 0, w / 2);
  ry = clamp(ry, 0, h / 2);

  // 모서리가 거의 없으면(=직사각형) 네 꼭짓점만.
  if (rx < 0.01 && ry < 0.01) {
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
  }

  const seg = Math.max(2, cornerSegments);
  const pts: Point[] = [];
  // 모서리 중심: TR, BR, BL, TL
  const corners: Array<{ cx: number; cy: number; start: number }> = [
    { cx: w - rx, cy: ry, start: -Math.PI / 2 }, // 우상 (-90° → 0°)
    { cx: w - rx, cy: h - ry, start: 0 }, // 우하 (0° → 90°)
    { cx: rx, cy: h - ry, start: Math.PI / 2 }, // 좌하 (90° → 180°)
    { cx: rx, cy: ry, start: Math.PI }, // 좌상 (180° → 270°)
  ];
  for (const c of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = c.start + (Math.PI / 2) * (i / seg);
      pts.push({ x: c.cx + rx * Math.cos(a), y: c.cy + ry * Math.sin(a) });
    }
  }
  return pts;
}

/**
 * 원본 ApplyBubbleAutoFit (Bubbles.cs) 의 이분 탐색 포팅.
 * 측정은 엔진(Pixi/Canvas)이 주입한다 — geometry는 순수 함수 유지.
 */
export function autoFitFontSize(
  maxFont: number,
  minFont: number,
  availWidth: number,
  availHeight: number,
  measure: (font: number) => { width: number; height: number },
): number {
  if (availWidth <= 1 || availHeight <= 1) return Math.max(minFont, maxFont);

  const fits = (f: number): boolean => {
    const s = measure(f);
    return s.width <= availWidth + 0.5 && s.height <= availHeight + 0.5;
  };

  if (fits(maxFont)) return maxFont;

  let lo = minFont;
  let hi = maxFont;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return Math.max(minFont, lo);
}
