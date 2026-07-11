import type { Point } from "./internal";

/**
 * 모서리 워프(사변형 일그러뜨림). 원본 `MainWindow.Bubbles.cs`의 `WarpPoint`/`WarpGeometry` 포팅.
 * CornerOffsets는 flat 8개 = TL,TR,BR,BL × (X,Y). 웹은 이미 도형이 점열이라 각 점만 이중선형 매핑하면 된다.
 */

/** 변위가 하나라도 0이 아니면 워프가 있는 것으로 본다(원본 HasCornerWarp). */
export function hasCornerWarp(o: number[]): boolean {
  for (let i = 0; i < 8; i++) {
    if ((o[i] ?? 0) !== 0) return true;
  }
  return false;
}

/**
 * 로컬 좌표(0..w, 0..h)의 점을 네 모서리(오프셋 반영)가 만드는 사변형으로 이중선형 매핑한다.
 * 변위가 모두 0이면 항등. 원본 WarpPoint와 1:1(오프셋 순서 TL,TR,BR,BL × X,Y).
 */
export function warpPoint(x: number, y: number, w: number, h: number, o: number[]): Point {
  const u = w > 0 ? x / w : 0;
  const v = h > 0 ? y / h : 0;
  const tlX = o[0] ?? 0;
  const tlY = o[1] ?? 0;
  const trX = w + (o[2] ?? 0);
  const trY = o[3] ?? 0;
  const brX = w + (o[4] ?? 0);
  const brY = h + (o[5] ?? 0);
  const blX = o[6] ?? 0;
  const blY = h + (o[7] ?? 0);
  const nx = (1 - u) * (1 - v) * tlX + u * (1 - v) * trX + u * v * brX + (1 - u) * v * blX;
  const ny = (1 - u) * (1 - v) * tlY + u * (1 - v) * trY + u * v * brY + (1 - u) * v * blY;
  return { x: nx, y: ny };
}

/** 점열(도형 외곽선)을 통째로 워프. 원본 WarpGeometry(이미 점열이므로 flatten 불필요). */
export function warpRing(points: Point[], w: number, h: number, o: number[]): Point[] {
  return points.map((p) => warpPoint(p.x, p.y, w, h, o));
}
