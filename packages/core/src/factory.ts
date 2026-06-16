import {
  ComicPageSchema,
  ComicPanelSchema,
  ComicProjectSchema,
  PanelImageSchema,
  SpeechBubbleSchema,
  type ComicPageData,
  type ComicPanelData,
  type ComicProjectData,
  type PanelImageData,
  type SpeechBubbleData,
} from "./schema";

/** 세션 내 안정적 고유 ID (원본 ComicPanel/PanelImage/SpeechBubble.Id 대응). */
export function makeId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function createPanel(
  number: number,
  x: number,
  y: number,
  width: number,
  height: number,
): ComicPanelData {
  return ComicPanelSchema.parse({
    Number: number,
    Id: makeId(),
    X: x,
    Y: y,
    Width: width,
    Height: height,
  });
}

/** 기본 말풍선 (원본 CreateSpeechBubble 기본값과 동일: 170×100, 18pt). */
export function createBubble(x: number, y: number): SpeechBubbleData {
  return SpeechBubbleSchema.parse({
    Id: makeId(),
    Text: "",
    X: x,
    Y: y,
  });
}

export function createImage(path: string): PanelImageData {
  return PanelImageSchema.parse({ Id: makeId(), Path: path });
}

export function createPage(name = "Page"): ComicPageData {
  return ComicPageSchema.parse({ Name: name });
}

export function createProject(): ComicProjectData {
  return ComicProjectSchema.parse({ Pages: [createPage("Page 1")] });
}
