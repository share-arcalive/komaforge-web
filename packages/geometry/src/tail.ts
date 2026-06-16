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
