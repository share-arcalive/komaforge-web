import { ComicProjectSchema, type ComicProjectData } from "./schema";

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/**
 * 로드 후 정규화 — 원본의 구버전 호환 규칙:
 *  - Tail.Mid 미지정/NaN → 시작·끝 중점
 *  - Image.ScaleY <= 0 → Scale 사용
 *  - CornerOffsets 길이 8 보정
 *  - CurrentPageIndex 범위 보정
 */
export function normalizeProject(project: ComicProjectData): ComicProjectData {
  for (const page of project.Pages) {
    for (const panel of page.Panels) {
      if (panel.CornerOffsets.length < 8) {
        panel.CornerOffsets = [
          ...panel.CornerOffsets,
          ...new Array(8 - panel.CornerOffsets.length).fill(0),
        ];
      }
      for (const image of panel.Images) {
        if (!(image.ScaleY > 0)) image.ScaleY = image.Scale;
      }
      for (const bubble of panel.Bubbles) {
        for (const tail of bubble.Tails) {
          if (tail.MidX === undefined || Number.isNaN(tail.MidX)) {
            tail.MidX = (tail.StartX + tail.X) / 2;
          }
          if (tail.MidY === undefined || Number.isNaN(tail.MidY)) {
            tail.MidY = (tail.StartY + tail.Y) / 2;
          }
        }
      }
    }
  }
  project.CurrentPageIndex = clamp(
    project.CurrentPageIndex,
    0,
    Math.max(0, project.Pages.length - 1),
  );
  return project;
}

/** `.kfjson` (또는 객체)을 파싱 + 정규화. 누락 필드는 스키마 기본값으로 채워진다. */
export function parseProject(input: unknown): ComicProjectData {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  return normalizeProject(ComicProjectSchema.parse(raw));
}

/** 프로젝트를 `.kfjson` 문자열로 직렬화(NaN은 제거하여 JSON 유효성 유지). */
export function serializeProject(project: ComicProjectData): string {
  return JSON.stringify(
    project,
    (_key, value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value),
    2,
  );
}

/** 깊은 복제 (스냅샷/undo 용). */
export function cloneProject(project: ComicProjectData): ComicProjectData {
  return parseProject(JSON.parse(serializeProject(project)));
}
