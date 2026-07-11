import { BUBBLE_SHAPES, type BubbleShape } from "@repo/core";
import { cn } from "@repo/ui";
import { GalleryCell } from "./cell";
import { ShapeThumb } from "./ShapeThumb";

/** Inspector 의 SHAPE_OPTIONS 와 동일한 한글 라벨(스키마 값 → 라벨). */
export const SHAPE_LABELS: Record<BubbleShape, string> = {
  RoundRect: "원/사각",
  CloudExplosion: "구름/폭발",
  Flash: "플래시",
  ConcentrationLines: "집중선",
  EffectLines: "속도선",
  None: "테두리 없음",
};

export interface BubbleShapeGalleryProps {
  /** 현재 선택된 모양(스키마 BubbleShape 값 그대로). */
  value: BubbleShape;
  /** 변형 클릭 시 스키마 값으로 호출. (checkpoint 등은 호출부 책임) */
  onSelect: (v: BubbleShape) => void;
  className?: string;
}

/**
 * 말풍선 모양 6종을 실제 지오메트리 썸네일 그리드로 보여 주는 선택기.
 * 기존 <Select value={bubble.Shape} onChange={...}> 자리에
 * <BubbleShapeGallery value={bubble.Shape} onSelect={...}/> 로 교체 가능.
 */
export function BubbleShapeGallery({ value, onSelect, className }: BubbleShapeGalleryProps) {
  return (
    <div role="radiogroup" aria-label="말풍선 모양" className={cn("grid w-full grid-cols-3 gap-1", className)}>
      {BUBBLE_SHAPES.map((shape) => (
        <GalleryCell
          key={shape}
          label={SHAPE_LABELS[shape]}
          selected={shape === value}
          onClick={() => onSelect(shape)}
        >
          <ShapeThumb shape={shape} width={56} height={42} />
        </GalleryCell>
      ))}
    </div>
  );
}
