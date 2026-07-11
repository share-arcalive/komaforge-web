import { cn } from "@repo/ui";
import {
  combineBodyAndTails,
  roundRectOutline,
  tailOutline,
  thoughtTailOutlines,
  type MultiPoly,
  type Point,
  type TailLike,
} from "./geom";
import { VIEW_W, VIEW_H, type Box, fitter, fmt } from "./fit";
import { GalleryCell } from "./cell";

/**
 * 꼬리 종류 선택 갤러리. 스키마(BubbleTailData)에 꼬리 "종류" enum 은 없고
 * TailInward/ThoughtTail 두 불리언(+꼬리 유무)으로 표현되므로, UI 용 변형 4종을 정의한다.
 * 썸네일은 실제 엔진과 같은 경로(본체 ∪/− 꼬리, polygon-clipping)로 합성해 차이가 그대로 보인다.
 */

export const TAIL_VARIANTS = ["none", "normal", "inward", "thought"] as const;
export type TailVariant = (typeof TAIL_VARIANTS)[number];

/** Inspector 체크박스 문구와 맞춘 한글 라벨. */
export const TAIL_LABELS: Record<TailVariant, string> = {
  none: "없음",
  normal: "일반",
  inward: "안쪽(깎기)",
  thought: "생각(원 3개)",
};

/** 꼬리 데이터(또는 없음) → 갤러리 변형 값. */
export function tailVariantOf(
  tail: { TailInward?: boolean; ThoughtTail?: boolean } | null | undefined,
): TailVariant {
  if (!tail) return "none";
  if (tail.ThoughtTail) return "thought";
  if (tail.TailInward) return "inward";
  return "normal";
}

/**
 * 갤러리 변형 값 → 기존 꼬리에 덮어쓸 패치. "none" 이면 null(= 꼬리 삭제) 반환.
 * 예) const p = tailVariantPatch(v); p ? updateTail(p) : removeTail();
 */
export function tailVariantPatch(v: TailVariant): { TailInward: boolean; ThoughtTail: boolean } | null {
  switch (v) {
    case "none":
      return null;
    case "normal":
      return { TailInward: false, ThoughtTail: false };
    case "inward":
      return { TailInward: true, ThoughtTail: false };
    case "thought":
      return { TailInward: false, ThoughtTail: true };
  }
}

// ── 썸네일 지오메트리(모듈 스코프 1회 계산) ─────────────────────────────
// 생성 공간 = 말풍선 로컬 좌표. 본체는 100×52 타원, 꼬리는 좌하단으로 뻗는다.
const BODY_W = 100;
const BODY_H = 52;
const BODY: Point[] = roundRectOutline(BODY_W, BODY_H, 0);

// Inspector.addTail 기본 꼬리와 같은 구조(시작=본체 안 0.7h 부근, 끝=본체 밖).
const TAIL: TailLike = {
  StartX: 50,
  StartY: 36,
  MidX: 42,
  MidY: 56,
  X: 26,
  Y: 78,
  Width: 16,
  TailInward: false,
  ThoughtTail: false,
};
// 생각 꼬리: 원 3개(baseR = max(6, Width*0.9))가 본체와 겹치지 않고 또렷이 떨어져 보이도록
// 시작점을 본체 아래쪽 가장자리 근처로 내리고 경로를 조금 길게 잡는다.
const THOUGHT_TAIL: TailLike = {
  StartX: 50,
  StartY: 48,
  MidX: 40,
  MidY: 62,
  X: 24,
  Y: 86,
  Width: 8,
  TailInward: false,
  ThoughtTail: true,
};

// 네 변형이 같은 프레이밍(본체 위치·크기 동일)으로 비교되도록 고정 박스로 스케일.
const GEN_BOX: Box = { minX: 0, minY: 0, maxX: 100, maxY: 90 };
const MAP = fitter(GEN_BOX, 3);

function multiPolyToPath(mp: MultiPoly): string {
  const parts: string[] = [];
  for (const poly of mp) {
    for (const ring of poly) {
      if (ring.length === 0) continue;
      const cmds = ring.map((pt, i) => {
        const q = MAP({ x: pt[0], y: pt[1] });
        return `${i === 0 ? "M" : "L"}${fmt(q.x)} ${fmt(q.y)}`;
      });
      parts.push(`${cmds.join("")}Z`);
    }
  }
  return parts.join("");
}

const PATHS: Record<TailVariant, string> = {
  // 없음: 본체만.
  none: multiPolyToPath(combineBodyAndTails(BODY, [])),
  // 일반: 본체 ∪ 꼬리(엔진과 동일한 union).
  normal: multiPolyToPath(combineBodyAndTails(BODY, [{ outline: tailOutline(TAIL), inward: false }])),
  // 안쪽(깎기): 같은 꼬리를 difference 로 깎아 아랫변에 홈이 파인다(TailInward=true 의 실제 효과).
  inward: multiPolyToPath(combineBodyAndTails(BODY, [{ outline: tailOutline(TAIL), inward: true }])),
  // 생각: 곡선 대신 점점 작아지는 원 3개(각각 본체와 union — 엔진과 동일).
  thought: multiPolyToPath(
    combineBodyAndTails(
      BODY,
      thoughtTailOutlines(THOUGHT_TAIL).map((outline) => ({ outline, inward: false })),
    ),
  ),
};

export interface TailThumbProps {
  variant: TailVariant;
  width?: number;
  height?: number;
  className?: string;
}

/** 꼬리 변형 1종: 미니 말풍선 본체에 해당 꼬리를 실제 결합해 그린 썸네일. */
export function TailThumb({ variant, width = 64, height = 48, className }: TailThumbProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATHS[variant]}
        fill="none"
        fillRule="evenodd"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface TailGalleryProps {
  /** 현재 변형. 기존 꼬리 데이터에서 구하려면 tailVariantOf(tail) 사용. */
  value: TailVariant;
  /** 변형 클릭 시 호출. 데이터 패치는 tailVariantPatch(v) 참고. (checkpoint 는 호출부 책임) */
  onSelect: (v: TailVariant) => void;
  className?: string;
}

/** 꼬리 종류 4종(없음/일반/안쪽/생각)을 미니 말풍선 썸네일 그리드로 보여 주는 선택기. */
export function TailGallery({ value, onSelect, className }: TailGalleryProps) {
  return (
    <div role="radiogroup" aria-label="꼬리 종류" className={cn("grid w-full grid-cols-2 gap-1", className)}>
      {TAIL_VARIANTS.map((v) => (
        <GalleryCell key={v} label={TAIL_LABELS[v]} selected={v === value} onClick={() => onSelect(v)}>
          <TailThumb variant={v} width={56} height={42} />
        </GalleryCell>
      ))}
    </div>
  );
}
