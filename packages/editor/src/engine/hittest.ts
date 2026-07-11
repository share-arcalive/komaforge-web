import type { ComicPageData, ComicPanelData, PanelImageData, SpeechBubbleData } from "@repo/core";
import type { Point as GeoPoint } from "@repo/geometry";
import { alphaAt, assetIdFromPath, getAssetByPath } from "../assets";
import type { Selection } from "../types";

/**
 * 픽셀 알파 + 도형 히트테스트(Pixi 비의존, 단위 테스트 가능).
 * 원본: KomaForge/src/MainWindow/MainWindow.HitTest.cs · MainWindow.Interaction.cs(CollectSelectablesAt).
 */

const PANEL_OUTWARD_HIT = 8; // 칸 테두리 바깥으로 인정하는 여유(원본 PanelOutwardHitMargin).
const PANEL_BORDER_HIT = 18; // 안쪽 테두리 밴드 폭(원본 IsOnPanelBorder borderHitSize).
const ALPHA_HIT_THRESHOLD = 8; // 이 값 초과 알파만 불투명으로 본다(원본 GetPixelAlpha > 8).

// 칸 4모서리(TL,TR,BR,BL)를 CornerOffsets로 변위한 칸 로컬 좌표. CornerMode 꺼져 있으면 직사각형.
export function panelCorners(panel: ComicPanelData): GeoPoint[] {
  const w = panel.Width;
  const h = panel.Height;
  if (!panel.CornerMode) {
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
  }
  const o = panel.CornerOffsets;
  const ox = (i: number) => o[i * 2] ?? 0;
  const oy = (i: number) => o[i * 2 + 1] ?? 0;
  return [
    { x: ox(0), y: oy(0) },
    { x: w + ox(1), y: oy(1) },
    { x: w + ox(2), y: h + oy(2) },
    { x: ox(3), y: h + oy(3) },
  ];
}

// 점이 폴리곤 내부인지(ray casting). 감김 방향 무관.
export function pointInPoly(pts: GeoPoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function selEq(a: Selection, b: Selection): boolean {
  return a.kind === b.kind && a.panelId === b.panelId && a.id === b.id;
}

// 칸 테두리(바깥 PANEL_OUTWARD_HIT 여유 포함) 위인지(원본 IsOnPanelBorder). lx/ly는 칸 로컬.
export function onPanelBorder(panel: ComicPanelData, lx: number, ly: number): boolean {
  const w = panel.Width;
  const h = panel.Height;
  if (lx < -PANEL_OUTWARD_HIT || ly < -PANEL_OUTWARD_HIT || lx > w + PANEL_OUTWARD_HIT || ly > h + PANEL_OUTWARD_HIT) {
    return false;
  }
  return (
    lx < 0 || ly < 0 || lx > w || ly > h ||
    lx <= PANEL_BORDER_HIT || ly <= PANEL_BORDER_HIT ||
    lx >= w - PANEL_BORDER_HIT || ly >= h - PANEL_BORDER_HIT
  );
}

// 말풍선 컨테이너(바운딩 사각형) 안인지(원본 BubbleContainsFramePoint — 도형이 아니라 사각형).
export function bubbleContains(panel: ComicPanelData, b: SpeechBubbleData, pageX: number, pageY: number): boolean {
  const x = panel.X + b.X;
  const y = panel.Y + b.Y;
  return pageX >= x && pageY >= y && pageX <= x + b.Width && pageY <= y + b.Height;
}

// 이미지의 그 지점 픽셀이 불투명한지(원본 IsOpaqueImagePixelAtPoint). 크롭이면 칸 사변형 안만.
// 웹 렌더는 텍스처를 박스에 X/Y 독립 스케일로 직접 매핑하므로(데스크톱의 uniform-fit+여백 없음)
// 자연 픽셀 = 박스 로컬 / 스케일. 알파 맵 미준비/동영상이면 불투명(사각형) 취급.
export function imageOpaqueAt(panel: ComicPanelData, image: PanelImageData, pageX: number, pageY: number): boolean {
  const asset = getAssetByPath(image.Path);
  if (!asset) return false;
  const lx = pageX - panel.X;
  const ly = pageY - panel.Y;
  if (image.IsCropped && !pointInPoly(panelCorners(panel), lx, ly)) return false;
  const sx = image.Scale;
  const sy = image.ScaleY || image.Scale;
  const ix = lx - image.TranslateX;
  const iy = ly - image.TranslateY;
  if (ix < 0 || iy < 0 || ix > asset.width * sx || iy > asset.height * sy) return false;
  if (sx <= 0 || sy <= 0) return true;
  const a = alphaAt(assetIdFromPath(image.Path), ix / sx, iy / sy);
  return a == null ? true : a > ALPHA_HIT_THRESHOLD;
}

// 그 지점의 '활성 칸' = 점을 포함(또는 테두리 여유 안)하는 최상단 칸.
export function activePanelAt(page: ComicPageData, pageX: number, pageY: number): ComicPanelData | undefined {
  for (let i = page.Panels.length - 1; i >= 0; i--) {
    const p = page.Panels[i]!;
    const lx = pageX - p.X;
    const ly = pageY - p.Y;
    if (pointInPoly(panelCorners(p), lx, ly) || onPanelBorder(p, lx, ly)) return p;
  }
  return undefined;
}

// 그 지점에서 선택 가능한 후보를 z-순(위→아래)으로(원본 CollectSelectablesAt).
// 테두리=칸 최상단 → 말풍선(위부터) → 이미지(웹 렌더 순서=배열 역순, 불투명 픽셀만) → 칸 몸체(맨 아래).
export function collectSelectables(panel: ComicPanelData, pageX: number, pageY: number): Selection[] {
  const stack: Selection[] = [];
  const lx = pageX - panel.X;
  const ly = pageY - panel.Y;
  if (onPanelBorder(panel, lx, ly)) stack.push({ kind: "panel", id: panel.Id });
  for (let i = panel.Bubbles.length - 1; i >= 0; i--) {
    const b = panel.Bubbles[i]!;
    if (!b.IsLocked && bubbleContains(panel, b, pageX, pageY)) {
      stack.push({ kind: "bubble", panelId: panel.Id, id: b.Id });
    }
  }
  for (let i = panel.Images.length - 1; i >= 0; i--) {
    const img = panel.Images[i]!;
    if (!img.IsLocked && imageOpaqueAt(panel, img, pageX, pageY)) {
      stack.push({ kind: "image", panelId: panel.Id, id: img.Id });
    }
  }
  if (!stack.some((s) => s.kind === "panel")) stack.push({ kind: "panel", id: panel.Id });
  return stack;
}

/**
 * 페이지 전역 후보 스택(z-순 위→아래). 유연 합성 모델 대응:
 *  - 말풍선은 모든 칸 위 최상위 레이어 → 칸 경계를 넘어도, 소속 칸과 무관하게 선택된다.
 *  - 이미지는 크롭을 끄면 칸 밖으로 나오므로 imageOpaqueAt(자체 경계/알파)로 칸-무관 판정.
 *  - 칸끼리 겹치면 위 칸부터 아래 칸까지 모두 후보 → 반복 클릭으로 아래 칸까지 순환 도달.
 * 순서: 말풍선(전부, 위부터) → 칸별(위 칸부터) [이미지(불투명, 위부터) → 칸 몸체/테두리].
 * 잠긴 칸의 내용물과 잠긴 오브젝트는 제외(원본: 잠긴 칸은 캔버스 선택 불가).
 */
export function collectSelectablesPage(page: ComicPageData, pageX: number, pageY: number): Selection[] {
  const stack: Selection[] = [];
  const panels = page.Panels;
  // 1) 말풍선 — 최상위 레이어, 나중에 그린 것(위)부터.
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i]!;
    if (p.IsLocked) continue;
    for (let j = p.Bubbles.length - 1; j >= 0; j--) {
      const b = p.Bubbles[j]!;
      if (!b.IsLocked && bubbleContains(p, b, pageX, pageY)) {
        stack.push({ kind: "bubble", panelId: p.Id, id: b.Id });
      }
    }
  }
  // 2) 칸: 위 칸부터. 각 칸 = [이미지(불투명, 위부터) → 칸 몸체].
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i]!;
    if (p.IsLocked) continue;
    for (let j = p.Images.length - 1; j >= 0; j--) {
      const img = p.Images[j]!;
      if (!img.IsLocked && imageOpaqueAt(p, img, pageX, pageY)) {
        stack.push({ kind: "image", panelId: p.Id, id: img.Id });
      }
    }
    const lx = pageX - p.X;
    const ly = pageY - p.Y;
    if (pointInPoly(panelCorners(p), lx, ly) || onPanelBorder(p, lx, ly)) {
      stack.push({ kind: "panel", id: p.Id });
    }
  }
  return stack;
}
