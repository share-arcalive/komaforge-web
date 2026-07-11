import type { Point } from "./geom";

/**
 * 썸네일 공통: 생성기 좌표(임의 크기)를 64×48 뷰박스에 맞춰 균일 스케일·중앙 배치.
 * 생성기는 순수/결정적이므로 모든 계산은 모듈 스코프에서 1회만 수행된다.
 */

export const VIEW_W = 64;
export const VIEW_H = 48;

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(points: Point[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** 박스를 (VIEW_W-2pad)×(VIEW_H-2pad) 안에 균일 스케일로 맞추는 좌표 변환을 돌려준다. */
export function fitter(b: Box, pad = 4): (p: Point) => Point {
  const w = Math.max(1e-6, b.maxX - b.minX);
  const h = Math.max(1e-6, b.maxY - b.minY);
  const s = Math.min((VIEW_W - pad * 2) / w, (VIEW_H - pad * 2) / h);
  const ox = (VIEW_W - w * s) / 2 - b.minX * s;
  const oy = (VIEW_H - h * s) / 2 - b.minY * s;
  return (p) => ({ x: p.x * s + ox, y: p.y * s + oy });
}

/** SVG 속성용 반올림(소수 2자리) — 마크업 크기 절약. */
export const fmt = (n: number): number => Math.round(n * 100) / 100;

/** Point[] → <polygon>/<polyline> points 속성 문자열. */
export function pointsAttr(points: Point[], map: (p: Point) => Point): string {
  return points
    .map((p) => {
      const q = map(p);
      return `${fmt(q.x)},${fmt(q.y)}`;
    })
    .join(" ");
}
