import { createPanel } from "./factory";
import type { ComicPageData } from "./schema";

export interface Rect {
  X: number;
  Y: number;
  Width: number;
  Height: number;
}

/** 원본 ParsePattern (HitTest.cs): 1~6 사이 양수만, 쉼표 구분. */
export function parsePattern(text: string): number[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((v) => {
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    })
    .filter((count) => count > 0 && count <= 6);
}

/**
 * 원본 CreateLayoutFromPattern (Pages.cs)의 슬롯 계산 포팅.
 * 페이지를 줄 수만큼 꽉 채운다(여백·간격 적용).
 */
export function layoutSlots(
  pattern: number[],
  pageWidth: number,
  pageHeight: number,
  margin: number,
  gutter: number,
): Rect[] {
  const m = Math.max(0, margin);
  const g = Math.max(0, gutter);
  const rows = pattern.length;
  if (rows === 0) return [];

  const rowHeight = Math.max(20, (pageHeight - m * 2 - g * (rows - 1)) / rows);
  const slots: Rect[] = [];
  let y = m;
  for (const columns of pattern) {
    const panelWidth = Math.max(20, (pageWidth - m * 2 - g * (columns - 1)) / columns);
    let x = m;
    for (let column = 0; column < columns; column++) {
      slots.push({ X: x, Y: y, Width: panelWidth, Height: rowHeight });
      x += panelWidth + g;
    }
    y += rowHeight + g;
  }
  return slots;
}

/**
 * 패턴을 페이지에 적용한다(원본 CreateLayoutFromPattern 의미 유지):
 * 기존 칸은 순서대로 슬롯에 재배치(내용 유지), 부족하면 추가, 남으면 삭제, 마지막에 1..N 재번호.
 */
export function applyLayout(
  page: ComicPageData,
  patternText: string,
  margin: number,
  gutter: number,
): boolean {
  const pattern = parsePattern(patternText);
  if (pattern.length === 0) return false;

  const slots = layoutSlots(pattern, page.PageWidth, page.PageHeight, margin, gutter);
  const panels = page.Panels;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    const existing = panels[i];
    if (existing) {
      existing.X = slot.X;
      existing.Y = slot.Y;
      existing.Width = slot.Width;
      existing.Height = slot.Height;
    } else {
      panels.push(createPanel(i + 1, slot.X, slot.Y, slot.Width, slot.Height));
    }
  }
  panels.length = slots.length;
  panels.forEach((panel, index) => {
    panel.Number = index + 1;
  });
  return true;
}
