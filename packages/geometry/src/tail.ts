import { sampleQuadratic, type Point } from "./internal";

const TAIL_SEGMENTS = 12;

/** 말풍선 꼬리 입력. Mid가 없으면(구버전) 시작·끝의 중점으로 본다. 좌표는 말풍선 로컬(px). */
export interface TailLike {
  StartX: number;
  StartY: number;
  MidX?: number;
  MidY?: number;
  X: number;
  Y: number;
  Width: number;
  TailInward?: boolean;
  ThoughtTail?: boolean;
}

const THOUGHT_CIRCLE_SEGMENTS = 16;

/** 이차 베지어 곡선 위 점: (1-t)²·P0 + 2(1-t)t·P1 + t²·P2. 원본 QuadBezierPoint. */
function quadBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * 생각 말풍선 꼬리: 곡선 대신 시작→(중간 제어점)→끝 곡선을 따라 점점 작아지는 원 3개(본체 쪽이 가장 큼).
 * 원본 `CreateThoughtTailGeometry`(v0.1.5). WPF는 EllipseGeometry 3개(GeometryGroup)지만, 웹은
 * 각 원을 폴리곤 링으로 샘플링해 반환한다(엔진이 본체와 각각 Union). 좌표는 말풍선 로컬.
 */
export function thoughtTailOutlines(tail: TailLike): Point[][] {
  const start: Point = { x: tail.StartX, y: tail.StartY };
  const end: Point = { x: tail.X, y: tail.Y };
  const mid: Point = {
    x: tail.MidX ?? (tail.StartX + tail.X) / 2,
    y: tail.MidY ?? (tail.StartY + tail.Y) / 2,
  };
  const baseR = Math.max(6, tail.Width * 0.9); // 가장 큰 원 반지름(굵기 기준).
  const ts = [0.4, 0.7, 1.0]; // 시작점은 본체 안일 수 있어 살짝 바깥(0.4)부터 끝(1.0)까지.
  const rf = [1.0, 0.66, 0.42]; // 점점 작아지는 반지름 비율.

  const rings: Point[][] = [];
  for (let i = 0; i < 3; i++) {
    const c = quadBezierPoint(start, mid, end, ts[i]!);
    const r = baseR * rf[i]!;
    const ring: Point[] = [];
    for (let s = 0; s < THOUGHT_CIRCLE_SEGMENTS; s++) {
      const a = (s / THOUGHT_CIRCLE_SEGMENTS) * 2 * Math.PI;
      ring.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
    }
    rings.push(ring);
  }
  return rings;
}

/**
 * 3점 곡선 꼬리. 베이스(start)의 양 변이 중간 점(mid) 기준 ±halfWidth로 벌어진 제어점을 지나
 * 끝점(end, 꼭짓점)으로 모인다. 원본 `CreateTailGeometry`(Bubbles.cs)의 폴리곤 샘플링.
 * 반환 outline은 닫힌 외곽선 점열(말풍선 로컬 좌표).
 */
export function tailOutline(tail: TailLike): Point[] {
  const start: Point = { x: tail.StartX, y: tail.StartY };
  const end: Point = { x: tail.X, y: tail.Y };
  const mid: Point = {
    x: tail.MidX ?? (tail.StartX + tail.X) / 2,
    y: tail.MidY ?? (tail.StartY + tail.Y) / 2,
  };

  let dirX = end.x - start.x;
  let dirY = end.y - start.y;
  let len = Math.hypot(dirX, dirY);
  if (len < 1) {
    dirX = 0;
    dirY = 1;
    len = 1;
  }
  dirX /= len;
  dirY /= len;
  const normalX = -dirY;
  const normalY = dirX;
  const halfWidth = Math.max(2, tail.Width / 2);

  const startA: Point = { x: start.x + normalX * halfWidth, y: start.y + normalY * halfWidth };
  const startB: Point = { x: start.x - normalX * halfWidth, y: start.y - normalY * halfWidth };
  const controlA: Point = { x: mid.x + normalX * halfWidth, y: mid.y + normalY * halfWidth };
  const controlB: Point = { x: mid.x - normalX * halfWidth, y: mid.y - normalY * halfWidth };

  const out: Point[] = [startA];
  sampleQuadratic(startA, controlA, end, TAIL_SEGMENTS, out, false);
  sampleQuadratic(end, controlB, startB, TAIL_SEGMENTS, out, false);
  return out;
}
