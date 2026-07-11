import { clamp } from "./internal";

/**
 * 결정적 의사난수(0~1). 같은 seed면 항상 같은 값 → 다시 그려도, 저장 파일을 다시 열어도
 * 같은 도형이 나온다. 원본 `MainWindow.Shapes.cs` `Pseudo`의 공식을 글자 그대로 옮긴 것.
 * (이 한 줄이 `.kfjson` 시각 일치의 핵심이라 절대 바꾸지 말 것.)
 */
export function pseudo(seed: number): number {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * 불규칙도(0~100)를 흔들림/지터 배율로. 50이면 1.0(기본 흔들림), 0이면 균일, 100이면 2배.
 * 원본 `IrregularityMul`.
 */
export function irregularityMul(irregularity: number): number {
  return clamp(irregularity, 0, 100) / 50;
}
