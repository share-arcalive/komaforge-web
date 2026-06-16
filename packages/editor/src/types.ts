import type {
  ComicPageData,
  ComicPanelData,
  ComicProjectData,
  PanelImageData,
  SpeechBubbleData,
} from "@repo/core";

export type SelectionKind = "none" | "panel" | "image" | "bubble";

export interface Selection {
  kind: SelectionKind;
  /** 선택된 칸 id (image/bubble 선택 시엔 소속 칸). */
  panelId?: string;
  /** image/bubble 선택 시 해당 오브젝트 id. */
  id?: string;
}

export const EMPTY_SELECTION: Selection = { kind: "none" };

/** 현재 페이지 (범위 밖이면 undefined). */
export function currentPage(
  project: ComicProjectData,
  pageIndex: number,
): ComicPageData | undefined {
  return project.Pages[pageIndex];
}

export function findPanel(
  page: ComicPageData | undefined,
  id: string | undefined,
): ComicPanelData | undefined {
  if (!page || !id) return undefined;
  return page.Panels.find((p) => p.Id === id);
}

export function findBubble(
  panel: ComicPanelData | undefined,
  id: string | undefined,
): SpeechBubbleData | undefined {
  if (!panel || !id) return undefined;
  return panel.Bubbles.find((b) => b.Id === id);
}

export function findImage(
  panel: ComicPanelData | undefined,
  id: string | undefined,
): PanelImageData | undefined {
  if (!panel || !id) return undefined;
  return panel.Images.find((i) => i.Id === id);
}
