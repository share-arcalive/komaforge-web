/** 패키지 내부 공용 헬퍼. (외부로는 index.ts가 Point만 재노출한다.) */

export interface Point {
  x: number;
  y: number;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/**
 * 2차 베지어(p0→ctrl→p1)를 직선 구간으로 샘플링해 out에 덧붙인다.
 * WPF의 QuadraticBezierTo를 폴리곤으로 근사하기 위함.
 * includeStart=false면 p0(이미 직전 점)은 건너뛰고 t>0 점만 넣는다.
 */
export function sampleQuadratic(
  p0: Point,
  ctrl: Point,
  p1: Point,
  segments: number,
  out: Point[],
  includeStart = false,
): void {
  const segs = Math.max(1, segments);
  for (let i = includeStart ? 0 : 1; i <= segs; i++) {
    const t = i / segs;
    const mt = 1 - t;
    const a = mt * mt;
    const b = 2 * mt * t;
    const c = t * t;
    out.push({ x: a * p0.x + b * ctrl.x + c * p1.x, y: a * p0.y + b * ctrl.y + c * p1.y });
  }
}
