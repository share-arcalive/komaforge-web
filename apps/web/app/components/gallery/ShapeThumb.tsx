import type { BubbleShape } from "@repo/core";
import {
  cloudExplosionOutline,
  concentrationLineEndpoints,
  effectLineEndpoints,
  flashOutline,
  roundRectOutline,
  clipSegmentToBox,
} from "./geom";
import { VIEW_W, VIEW_H, type Box, boundsOf, fitter, fmt, pointsAttr } from "./fit";

/**
 * 말풍선 모양 1종을 실제 @repo/geometry 생성기로 그린 소형 SVG 썸네일(기본 64×48).
 * stroke=currentColor 라서 부모의 글자색을 그대로 따른다(테마/선택 상태 대응).
 * 생성기는 순수/결정적 → 모든 점열은 모듈 스코프에서 1회만 계산.
 */

// 생성기 좌표 공간(썸네일 종횡비와 비슷한 100×70). fitter 가 뷰박스에 맞춰 균일 스케일.
const GEN_W = 100;
const GEN_H = 70;
const GEN_BOX: Box = { minX: 0, minY: 0, maxX: GEN_W, maxY: GEN_H };

// ── 닫힌 도형(폴리곤) ── 파라미터는 스키마 기본값(ShapeCount 9, Irregularity 50) 기준.
const roundRectPts = roundRectOutline(GEN_W, GEN_H, 0); // 강도 0 = 타원(기본값)
const ROUND_RECT = pointsAttr(roundRectPts, fitter(boundsOf(roundRectPts)));

const cloudPts = cloudExplosionOutline(GEN_W, GEN_H, 9, 0, 50, 0); // 강도 0 = 구름(기본값)
const CLOUD = pointsAttr(cloudPts, fitter(boundsOf(cloudPts)));

// 플래시는 강도(가시 길이) 0이면 타원과 구분이 안 되므로 70으로 올려 그린다(생성기는 동일).
const flashPts = flashOutline(GEN_W, GEN_H, 9, 70, 50);
const FLASH = pointsAttr(flashPts, fitter(boundsOf(flashPts)));

// ── 선 효과(선분) ──
interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

const seg = (a: { x: number; y: number }, b: { x: number; y: number }, opacity: number): Seg => ({
  x1: fmt(a.x),
  y1: fmt(a.y),
  x2: fmt(b.x),
  y2: fmt(b.y),
  opacity,
});

// 집중선: 중앙 페이드 구간(연함) + 가장자리 실선 구간의 2선분으로 원본의 그라데이션을 근사.
const CONCENTRATION: Seg[] = (() => {
  const map = fitter(GEN_BOX);
  const out: Seg[] = [];
  for (const line of concentrationLineEndpoints(GEN_W, GEN_H, 3, 55, 50)) {
    out.push(seg(map(line.fadeStart), map(line.fadeEnd), 0.35));
    out.push(seg(map(line.fadeEnd), map(line.edge), 1));
  }
  return out;
})();

// 속도선: 강도 0 = 방향 0°(수평). 각 선분을 박스로 클립(엔진과 동일).
const EFFECT: Seg[] = (() => {
  const map = fitter(GEN_BOX);
  const out: Seg[] = [];
  for (const line of effectLineEndpoints(GEN_W, GEN_H, 2, 0, 50, false)) {
    const clipped = clipSegmentToBox(line.base, line.tip, GEN_W, GEN_H);
    if (!clipped) continue;
    out.push(seg(map(clipped.c0), map(clipped.c1), 0.9));
  }
  return out;
})();

function LineGroup({ segs }: { segs: Seg[] }) {
  return (
    <g strokeWidth={1}>
      {segs.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeOpacity={s.opacity} />
      ))}
    </g>
  );
}

function ShapePreview({ shape }: { shape: BubbleShape }) {
  switch (shape) {
    case "RoundRect":
      return <polygon points={ROUND_RECT} />;
    case "CloudExplosion":
      return <polygon points={CLOUD} />;
    case "Flash":
      return <polygon points={FLASH} />;
    case "ConcentrationLines":
      return <LineGroup segs={CONCENTRATION} />;
    case "EffectLines":
      return <LineGroup segs={EFFECT} />;
    case "None":
      // 테두리 없음: 점선 프레임(경계만 암시) + 맨글자.
      return (
        <g>
          <rect
            x={6}
            y={6}
            width={VIEW_W - 12}
            height={VIEW_H - 12}
            rx={5}
            strokeWidth={1}
            strokeDasharray="3 3"
            strokeOpacity={0.35}
          />
          <text x={VIEW_W / 2} y={VIEW_H / 2 + 5} fill="currentColor" stroke="none" fontSize={13} textAnchor="middle">
            가
          </text>
        </g>
      );
    default:
      return null;
  }
}

export interface ShapeThumbProps {
  shape: BubbleShape;
  /** 렌더 크기(px). 뷰박스는 64×48 고정이라 비율만 맞으면 축소/확대 자유. */
  width?: number;
  height?: number;
  className?: string;
}

/** 한 모양 변형의 SVG 썸네일. 외곽선은 currentColor. */
export function ShapeThumb({ shape, width = 64, height = 48, className }: ShapeThumbProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <ShapePreview shape={shape} />
    </svg>
  );
}
