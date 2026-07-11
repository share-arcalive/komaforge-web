import polygonClipping from "polygon-clipping";
import type { Point } from "./internal";

/**
 * 겹친 말풍선의 외곽선을 하나로 잇고, 본체+꼬리를 합치기(Union)/깎기(Exclude)로 결합한다.
 * 원본은 WPF `Geometry.Combine`을 썼지만 Pixi엔 불 연산이 없어 `polygon-clipping`으로 대체한다.
 * 좌표는 모두 동일 공간(보통 칸 로컬)에 있어야 한다 — 호출부에서 말풍선 X/Y만큼 미리 옮겨 둘 것.
 */

export type Ring = [number, number][];
export type Poly = Ring[];
export type MultiPoly = Poly[];

function ringFrom(points: Point[], dx: number, dy: number): Ring {
  return points.map((p) => [p.x + dx, p.y + dy] as [number, number]);
}

/** 한 말풍선의 본체 + 꼬리들을 결합한 도형. 바깥꼬리는 Union, 안쪽꼬리(carve)는 Exclude. */
export function combineBodyAndTails(
  body: Point[],
  tails: { outline: Point[]; inward: boolean }[],
  dx = 0,
  dy = 0,
): MultiPoly {
  let geom: MultiPoly = [[ringFrom(body, dx, dy)]];
  for (const tail of tails) {
    const tg: MultiPoly = [[ringFrom(tail.outline, dx, dy)]];
    geom = tail.inward
      ? polygonClipping.difference(geom, tg)
      : polygonClipping.union(geom, tg);
  }
  return geom;
}

/** 여러 도형을 모두 Union 한다(겹친 말풍선들의 경계선을 하나로 잇기 위함). */
export function unionAll(polys: MultiPoly[]): MultiPoly {
  const nonEmpty = polys.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) return [];
  if (nonEmpty.length === 1) return nonEmpty[0]!;
  return polygonClipping.union(nonEmpty[0]!, ...nonEmpty.slice(1));
}
