import { clamp, sampleQuadratic, type Point } from "./internal";
import { irregularityMul, pseudo } from "./noise";

/**
 * 원본 `MainWindow.Shapes.cs` 의 말풍선 도형 생성기 포팅.
 * WPF는 StreamGeometry(직선/2차 베지어)를 만들지만, Pixi는 폴리곤만 채우므로
 * 모든 도형을 외곽선 점열(Point[])로 샘플링해 돌려준다. 베지어는 `sampleQuadratic`로 근사.
 * 의사난수(pseudo)·각종 계수는 원본과 1:1이라 같은 `.kfjson`이 같은 모양으로 렌더된다.
 */

const QUAD_SEGMENTS = 10; // 베지어 한 구간을 몇 직선으로 쪼갤지.

/** 기준 타원 둘레의 점들 사이를 바깥(볼록)/안쪽(오목)으로 휜다(곡선). 원본 `CreateLobedGeometry`(angular=false). */
function lobedOutline(
  width: number,
  height: number,
  count: number,
  baseRadiusFactor: number,
  pushFactor: number,
  irregularity: number,
  widthVariation: number,
): Point[] {
  const n = Math.max(3, Math.floor(count));
  const m = irregularityMul(irregularity);
  const cornerBias = clamp(widthVariation, 0, 100) / 100;
  const cx = width / 2;
  const cy = height / 2;
  const start = -Math.PI / 2 + Math.PI / 4;
  const minDist = Math.min(width, height) * 0.05;
  const uniformChord = 2 * baseRadiusFactor * (Math.min(width, height) / 2) * Math.sin(Math.PI / n);

  const warpTowardCorner = (a: number): number => {
    if (cornerBias <= 0) return a;
    const quad = Math.floor(a / (Math.PI / 2));
    const baseA = quad * (Math.PI / 2);
    const x = (a - baseA) / (Math.PI / 4) - 1;
    const warped = (1 - cornerBias) * x + cornerBias * x * x * x;
    return baseA + (warped + 1) * (Math.PI / 4);
  };

  const step = (2 * Math.PI) / n;
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const angle = warpTowardCorner(start + i * step) + (pseudo(i * 1.7 + 0.3) - 0.5) * step * 0.4 * m;
    const wobble = Math.max(0.2, 1 - 0.4 * m * pseudo(i * 2.9 + 0.6));
    const rx = (width / 2) * baseRadiusFactor * wobble;
    const ry = (height / 2) * baseRadiusFactor * wobble;
    points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }

  const controlBetween = (a: Point, b: Point): Point => {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dx = mid.x - cx;
    const dy = mid.y - cy;
    const len = Math.max(0.0001, Math.hypot(dx, dy));
    const dist = Math.max(minDist, len + uniformChord * pushFactor);
    return { x: cx + (dx / len) * dist, y: cy + (dy / len) * dist };
  };

  const out: Point[] = [points[0]!];
  for (let i = 0; i < n; i++) {
    const cur = points[i]!;
    const next = points[(i + 1) % n]!;
    const control = controlBetween(cur, next);
    sampleQuadratic(cur, control, next, QUAD_SEGMENTS, out, false);
  }
  return out;
}

/** 구름/폭발: 강도 0이면 완전 볼록(구름), 100이면 완전 오목(폭발). 원본 `CreateCloudExplosionGeometry`. */
export function cloudExplosionOutline(
  width: number,
  height: number,
  count: number,
  strength: number,
  irregularity: number,
  widthVariation: number,
): Point[] {
  const t = clamp(strength, 0, 100) / 100;
  const baseRadiusFactor = 0.55 + 0.4 * t;
  const pushFactor = 1.7 - 3.4 * t;
  return lobedOutline(width, height, count, baseRadiusFactor, pushFactor, irregularity, widthVariation);
}

/** 플래시(충격): 타원 코어 둘레에 방사형 가시. 원본 `CreateFlashGeometry`(직선이라 그대로 폴리곤). */
export function flashOutline(
  width: number,
  height: number,
  count: number,
  strength: number,
  irregularity: number,
): Point[] {
  const t = clamp(strength, 0, 100) / 100;
  const m = irregularityMul(irregularity);
  const spikes = Math.max(8, Math.floor(count));
  const cx = width / 2;
  const cy = height / 2;
  const hx = width / 2;
  const hy = height / 2;
  const coreFactor = 0.6;
  const maxSpike = t * 0.95 * Math.min(hx, hy);
  const start = -Math.PI / 2;

  const core = (angle: number): Point => ({
    x: cx + hx * coreFactor * Math.cos(angle),
    y: cy + hy * coreFactor * Math.sin(angle),
  });
  const tip = (angle: number, length: number): Point => {
    const dx = hx * Math.cos(angle);
    const dy = hy * Math.sin(angle);
    const len = Math.hypot(dx, dy);
    const c = core(angle);
    return { x: c.x + (dx / len) * length, y: c.y + (dy / len) * length };
  };

  const out: Point[] = [core(start)];
  for (let i = 0; i < spikes; i++) {
    const peakAngle = start + ((i + 0.5) * 2 * Math.PI) / spikes;
    const nextValley = start + ((i + 1) * 2 * Math.PI) / spikes;
    const rnd = pseudo(i * 12.9898 + 7.13);
    const lenFactor = clamp(1 - 0.5 * m * rnd, 0, 1);
    out.push(tip(peakAngle, maxSpike * lenFactor));
    out.push(core(nextValley));
  }
  return out;
}

/** 집중선 한 가닥: 안쪽 시작점 / 바깥 끝점 / 페이드(투명→불투명) 절대 구간. */
export interface ConcentrationLine {
  inner: Point;
  edge: Point;
  fadeStart: Point;
  fadeEnd: Point;
}

/** 집중선: 중앙을 향하는 방사형 직선들. 원본 `ConcentrationLineEndpoints`. */
export function concentrationLineEndpoints(
  width: number,
  height: number,
  count: number,
  strength: number,
  irregularity: number,
): ConcentrationLine[] {
  const t = clamp(strength, 0, 100) / 100;
  const m = irregularityMul(irregularity);
  const lines = Math.max(8, Math.floor(count) * 10);
  const cx = width / 2;
  const cy = height / 2;
  const hx = width / 2;
  const hy = height / 2;
  const minR = Math.min(hx, hy);
  const variationAmp = 0.35 * m;
  const fadeStartR = 0.62 * t * minR;
  const fadeEndR = fadeStartR + 0.45 * minR;
  const start = -Math.PI / 2;
  const step = (2 * Math.PI) / lines;

  const result: ConcentrationLine[] = [];
  for (let i = 0; i < lines; i++) {
    const angle = start + i * step + (pseudo(i * 1.7 + 0.2) - 0.5) * step * 1.4 * m;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const innerR = minR * clamp(pseudo(i + 0.3) * variationAmp, 0, 0.95);
    const inner = { x: cx + innerR * dx, y: cy + innerR * dy };
    const edgeR = Math.min(hx / Math.abs(dx), hy / Math.abs(dy));
    const edge = { x: cx + edgeR * dx, y: cy + edgeR * dy };
    const lineFadeStartR = Math.max(fadeStartR, innerR);
    const fadeStart = { x: cx + lineFadeStartR * dx, y: cy + lineFadeStartR * dy };
    const clampedEndR = Math.min(lineFadeStartR + (fadeEndR - fadeStartR), edgeR);
    const fadeEnd = { x: cx + clampedEndR * dx, y: cy + clampedEndR * dy };
    result.push({ inner, edge, fadeStart, fadeEnd });
  }
  return result;
}

/** 속도선 한 가닥: 뒤쪽(불투명) 베이스 / 앞쪽(투명) 팁. */
export interface EffectLine {
  base: Point;
  tip: Point;
}

/** 속도선(효과선): 한 방향 평행선들. 강도 0~100 → 방향 0~360°. 원본 `EffectLineEndpoints`. */
export function effectLineEndpoints(
  width: number,
  height: number,
  count: number,
  strength: number,
  irregularity: number,
  centered = false,
): EffectLine[] {
  const t = clamp(strength, 0, 100) / 100;
  const m = irregularityMul(irregularity);
  const lines = Math.max(8, Math.floor(count) * 10);
  const cx = width / 2;
  const cy = height / 2;
  const angle = t * 2 * Math.PI;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;

  const span = Math.hypot(width, height);
  const half = span / 2;
  const spacing = span / lines;

  const result: EffectLine[] = [];
  for (let i = 0; i < lines; i++) {
    const perp = -half + (i + 0.5) * spacing + (pseudo(i * 3.1 + 0.7) - 0.5) * spacing * 1.4 * m;
    const raw = 0.3 + 0.7 * pseudo(i * 5.3 + 0.9);
    const lenFrac = clamp(1 + (raw - 1) * m, 0.1, 1.5);
    const length = span * lenFrac;
    // 양쪽 페이드(centered)면 각 선을 중앙 기준 ±length/2로 배치(좌우 대칭). 아니면 한쪽 끝(-half)에서 시작.
    const a0 = centered ? -length / 2 : -half;
    const a1 = centered ? length / 2 : -half + length;
    const base = { x: cx + dx * a0 + px * perp, y: cy + dy * a0 + py * perp };
    const tip = { x: cx + dx * a1 + px * perp, y: cy + dy * a1 + py * perp };
    result.push({ base, tip });
  }
  return result;
}

/**
 * 선분 p0→p1을 [0,w]×[0,h] 박스로 클립(Liang–Barsky). 보이면 클립된 양 끝점, 안 보이면 null.
 * 원본 `ClipSegmentToBox`.
 */
export function clipSegmentToBox(
  p0: Point,
  p1: Point,
  w: number,
  h: number,
): { c0: Point; c1: Point } | null {
  let t0 = 0;
  let t1 = 1;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;

  const p = [-dx, dx, -dy, dy];
  const q = [p0.x, w - p0.x, p0.y, h - p0.y];

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]!) < 1e-9) {
      if (q[i]! < 0) return null;
      continue;
    }
    const r = q[i]! / p[i]!;
    if (p[i]! < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }

  return {
    c0: { x: p0.x + t0 * dx, y: p0.y + t0 * dy },
    c1: { x: p0.x + t1 * dx, y: p0.y + t1 * dy },
  };
}
