import {
  applyLayout,
  createBubble,
  createImage,
  createPage,
  createProject,
  makeId,
  type ComicPanelData,
  type ComicProjectData,
  type PanelImageData,
  type SpeechBubbleData,
} from "@repo/core";
import { editorStore } from "./store";
import { assetRef, getAsset } from "./assets";
import { currentPage, findBubble, findImage, findPanel, type Selection } from "./types";

const store = editorStore;

/* ---------- 문서 / 페이지 ---------- */

export function newProject(): void {
  store.getState().setProject(createProject(), 0);
}

export function loadProject(project: ComicProjectData): void {
  store.getState().setProject(project, project.CurrentPageIndex);
}

export function setTitle(title: string): void {
  store.getState().apply((p) => {
    p.Title = title;
  });
}

export function setAutoMargin(value: number): void {
  store.getState().apply((p) => {
    p.AutoMargin = value;
  });
}

export function setAutoGutter(value: number): void {
  store.getState().apply((p) => {
    p.AutoGutter = value;
  });
}

export function applyLayoutCmd(pattern: string): void {
  const { project, pageIndex } = store.getState();
  const page = currentPage(project, pageIndex);
  if (!page) return;
  store.getState().apply((p) => {
    const pg = currentPage(p, pageIndex);
    if (pg) applyLayout(pg, pattern, p.AutoMargin, p.AutoGutter);
  }, true);
  store.getState().select({ kind: "none" });
}

export function setPageSize(width: number, height: number): void {
  const { pageIndex } = store.getState();
  store.getState().apply((p) => {
    const pg = currentPage(p, pageIndex);
    if (pg) {
      pg.PageWidth = Math.max(1, width);
      pg.PageHeight = Math.max(1, height);
    }
  }, true);
}

export function setBlackBackground(black: boolean): void {
  const { pageIndex } = store.getState();
  store.getState().apply((p) => {
    const pg = currentPage(p, pageIndex);
    if (pg) pg.BlackBackground = black;
  }, true);
}

/** 페이지 배경색(빈 문자열이면 검정/흰색 토글로 폴백). */
export function setPageBackgroundColor(color: string): void {
  const { pageIndex } = store.getState();
  store.getState().apply((p) => {
    const pg = currentPage(p, pageIndex);
    if (pg) pg.BackgroundColor = color;
  }, true);
}

export function renamePage(index: number, name: string): void {
  store.getState().apply((p) => {
    const pg = p.Pages[index];
    if (pg) pg.Name = name;
  });
}

export function addPage(): void {
  const { project } = store.getState();
  store.getState().apply((p) => {
    p.Pages.push(createPage(`Page ${p.Pages.length + 1}`));
  }, true);
  store.getState().setPageIndex(project.Pages.length); // 새 페이지로 이동
}

export function removePage(index: number): void {
  const state = store.getState();
  if (state.project.Pages.length <= 1) return;
  state.apply((p) => {
    p.Pages.splice(index, 1);
  }, true);
  store.getState().setPageIndex(Math.min(index, store.getState().project.Pages.length - 1));
}

export function movePage(index: number, direction: -1 | 1): void {
  const target = index + direction;
  store.getState().apply((p) => {
    if (target < 0 || target >= p.Pages.length) return;
    const [page] = p.Pages.splice(index, 1);
    if (page) p.Pages.splice(target, 0, page);
  }, true);
}

export function gotoPage(index: number): void {
  store.getState().setPageIndex(index);
}

/* ---------- 선택 ---------- */

export function select(selection: Selection): void {
  store.getState().select(selection);
}

export function clearSelection(): void {
  store.getState().select({ kind: "none" });
}

/* ---------- 칸 ---------- */

function targetPanelId(): string | undefined {
  const { selection, project, pageIndex } = store.getState();
  if (selection.kind === "panel") return selection.id;
  if (selection.panelId) return selection.panelId;
  return currentPage(project, pageIndex)?.Panels[0]?.Id;
}

export function updateSelectedPanel(
  patch: Partial<
    Pick<
      ComicPanelData,
      | "IsLocked"
      | "Name"
      | "CornerMode"
      | "CornerOffsets"
      | "ShowBackground"
      | "ShowBorder"
      | "BackgroundColor"
      | "BorderColor"
    >
  >,
): void {
  const { selection, pageIndex } = store.getState();
  const id = selection.kind === "panel" ? selection.id : selection.panelId;
  store.getState().apply((p) => {
    const panel = findPanel(currentPage(p, pageIndex), id);
    if (panel) Object.assign(panel, patch);
  });
}

/* ---------- 말풍선 ---------- */

export function addBubble(): void {
  const panelId = targetPanelId();
  if (!panelId) return;
  const { pageIndex } = store.getState();
  let newId = "";
  store.getState().apply((p) => {
    const panel = findPanel(currentPage(p, pageIndex), panelId);
    if (!panel) return;
    const bubble = createBubble(
      Math.max(0, (panel.Width - 170) / 2),
      Math.max(0, (panel.Height - 100) / 2),
    );
    panel.Bubbles.push(bubble);
    newId = bubble.Id;
  }, true);
  if (newId) store.getState().select({ kind: "bubble", panelId, id: newId });
}

export function updateSelectedBubble(patch: Partial<SpeechBubbleData>): void {
  const { selection, pageIndex } = store.getState();
  if (selection.kind !== "bubble") return;
  store.getState().apply((p) => {
    const bubble = findBubble(findPanel(currentPage(p, pageIndex), selection.panelId), selection.id);
    if (bubble) Object.assign(bubble, patch);
  });
}

/* ---------- 이미지 ---------- */

export function addImageFromAsset(panelId: string, assetId: string): void {
  const asset = getAsset(assetId);
  if (!asset) return;
  const { pageIndex } = store.getState();
  let newId = "";
  store.getState().apply((p) => {
    const panel = findPanel(currentPage(p, pageIndex), panelId);
    if (!panel) return;
    const image = createImage(assetRef(assetId));
    // 초기 배치: 칸을 덮도록(cover) 스케일 + 가운데 정렬.
    const cover = Math.max(panel.Width / asset.width, panel.Height / asset.height);
    image.Scale = cover;
    image.ScaleY = cover;
    image.TranslateX = (panel.Width - asset.width * cover) / 2;
    image.TranslateY = (panel.Height - asset.height * cover) / 2;
    panel.Images.push(image);
    newId = image.Id;
  }, true);
  if (newId) store.getState().select({ kind: "image", panelId, id: newId });
}

export function updateSelectedImage(patch: Partial<PanelImageData>): void {
  const { selection, pageIndex } = store.getState();
  if (selection.kind !== "image") return;
  store.getState().apply((p) => {
    const image = findImage(findPanel(currentPage(p, pageIndex), selection.panelId), selection.id);
    if (image) Object.assign(image, patch);
  });
}

/* ---------- 삭제 / 순서 ---------- */

export function deleteSelection(): void {
  const { selection, pageIndex } = store.getState();
  if (selection.kind === "none") return;
  store.getState().apply((p) => {
    const page = currentPage(p, pageIndex);
    if (!page) return;
    if (selection.kind === "panel") {
      const idx = page.Panels.findIndex((x) => x.Id === selection.id);
      if (idx >= 0) page.Panels.splice(idx, 1);
    } else if (selection.kind === "bubble") {
      const panel = findPanel(page, selection.panelId);
      const idx = panel?.Bubbles.findIndex((x) => x.Id === selection.id) ?? -1;
      if (panel && idx >= 0) panel.Bubbles.splice(idx, 1);
    } else if (selection.kind === "image") {
      const panel = findPanel(page, selection.panelId);
      const idx = panel?.Images.findIndex((x) => x.Id === selection.id) ?? -1;
      if (panel && idx >= 0) panel.Images.splice(idx, 1);
    }
  }, true);
  store.getState().select({ kind: "none" });
}

export function reorderSelected(direction: -1 | 1): void {
  const { selection, pageIndex } = store.getState();
  if (selection.kind === "none") return;
  store.getState().apply((p) => {
    const page = currentPage(p, pageIndex);
    if (!page) return;
    const move = <T>(arr: T[], from: number) => {
      const to = from + direction;
      if (from < 0 || to < 0 || to >= arr.length) return;
      const [item] = arr.splice(from, 1);
      if (item) arr.splice(to, 0, item);
    };
    if (selection.kind === "panel") {
      move(page.Panels, page.Panels.findIndex((x) => x.Id === selection.id));
      page.Panels.forEach((panel, i) => (panel.Number = i + 1));
    } else if (selection.kind === "bubble") {
      const panel = findPanel(page, selection.panelId);
      if (panel) move(panel.Bubbles, panel.Bubbles.findIndex((x) => x.Id === selection.id));
    } else if (selection.kind === "image") {
      const panel = findPanel(page, selection.panelId);
      if (panel) move(panel.Images, panel.Images.findIndex((x) => x.Id === selection.id));
    }
  }, true);
}

/* ---------- 잠금 ---------- */

// 현재 선택(칸/이미지/말풍선)의 잠금을 토글한다(원본 ToggleSelectedLock).
export function toggleSelectedLock(): void {
  const { selection, pageIndex } = store.getState();
  if (selection.kind === "none") return;
  store.getState().apply((p) => {
    const page = currentPage(p, pageIndex);
    if (!page) return;
    if (selection.kind === "panel") {
      const panel = findPanel(page, selection.id);
      if (panel) panel.IsLocked = !panel.IsLocked;
    } else if (selection.kind === "image") {
      const img = findImage(findPanel(page, selection.panelId), selection.id);
      if (img) img.IsLocked = !img.IsLocked;
    } else if (selection.kind === "bubble") {
      const b = findBubble(findPanel(page, selection.panelId), selection.id);
      if (b) b.IsLocked = !b.IsLocked;
    }
  }, true);
}

/* ---------- 클립보드(cut/copy/paste) ---------- */
// 원본 MainWindow.Clipboard.cs: 마지막으로 복사/잘라낸 대상을 깊은 복제 DTO로 보관하고,
// 붙여넣기 때 새 ID를 부여하며 같은 위치·크기가 있으면 우하단으로 24px 민다.

type ClipKind = "panel" | "image" | "bubble";
interface Clip {
  kind: ClipKind;
  panel?: ComicPanelData;
  image?: PanelImageData;
  bubble?: SpeechBubbleData;
}
let clipboard: Clip | null = null;
const PASTE_OFFSET = 24;
const POS_EPS = 0.5;
const SCALE_EPS = 0.001;

function cloneData<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);
}

/** 붙여넣을 내용이 있는지(메뉴/단축키 활성화용). */
export function hasClipboard(): boolean {
  return clipboard != null;
}

/** 선택된 칸/이미지/말풍선을 내부 클립보드로 복사(칸은 내부 이미지·말풍선 포함). */
export function copySelection(): void {
  const { selection, project, pageIndex } = store.getState();
  const page = currentPage(project, pageIndex);
  if (!page) return;
  if (selection.kind === "panel") {
    const p = findPanel(page, selection.id);
    if (p) clipboard = { kind: "panel", panel: cloneData(p) };
  } else if (selection.kind === "image") {
    const img = findImage(findPanel(page, selection.panelId), selection.id);
    if (img) clipboard = { kind: "image", image: cloneData(img) };
  } else if (selection.kind === "bubble") {
    const b = findBubble(findPanel(page, selection.panelId), selection.id);
    if (b) clipboard = { kind: "bubble", bubble: cloneData(b) };
  }
}

/** 복사 후 원본을 삭제한다. */
export function cutSelection(): void {
  if (store.getState().selection.kind === "none") return;
  copySelection();
  deleteSelection();
}

function reassignPanelIds(panel: ComicPanelData): void {
  panel.Id = makeId();
  for (const img of panel.Images) img.Id = makeId();
  for (const b of panel.Bubbles) b.Id = makeId();
}

/** 클립보드 내용을 현재 페이지/대상 칸에 붙여넣고 새 오브젝트를 선택한다. */
export function pasteClipboard(): void {
  const clip = clipboard;
  if (!clip) return;
  const { selection, pageIndex } = store.getState();
  const targetPanelId = selection.kind === "panel" ? selection.id : selection.panelId;
  let sel: Selection | null = null;
  store.getState().apply((p) => {
    const page = currentPage(p, pageIndex);
    if (!page) return;

    if (clip.kind === "panel" && clip.panel) {
      const data = cloneData(clip.panel);
      let { X: x, Y: y } = data;
      while (page.Panels.some((q) => near(q.X, x) && near(q.Y, y) && near(q.Width, data.Width) && near(q.Height, data.Height))) {
        x += PASTE_OFFSET;
        y += PASTE_OFFSET;
      }
      data.X = x;
      data.Y = y;
      data.Number = page.Panels.length + 1;
      reassignPanelIds(data);
      page.Panels.push(data);
      sel = { kind: "panel", id: data.Id };
      return;
    }

    const panel = findPanel(page, targetPanelId) ?? page.Panels[page.Panels.length - 1];
    if (!panel) return;

    if (clip.kind === "image" && clip.image) {
      const data = cloneData(clip.image);
      let { TranslateX: tx, TranslateY: ty } = data;
      while (panel.Images.some((q) => near(q.TranslateX, tx) && near(q.TranslateY, ty) && Math.abs(q.Scale - data.Scale) < SCALE_EPS)) {
        tx += PASTE_OFFSET;
        ty += PASTE_OFFSET;
      }
      data.TranslateX = tx;
      data.TranslateY = ty;
      data.Id = makeId();
      panel.Images.push(data);
      sel = { kind: "image", panelId: panel.Id, id: data.Id };
    } else if (clip.kind === "bubble" && clip.bubble) {
      const data = cloneData(clip.bubble);
      let { X: x, Y: y } = data;
      while (panel.Bubbles.some((q) => near(q.X, x) && near(q.Y, y) && near(q.Width, data.Width) && near(q.Height, data.Height))) {
        x += PASTE_OFFSET;
        y += PASTE_OFFSET;
      }
      data.X = x;
      data.Y = y;
      data.Id = makeId();
      panel.Bubbles.push(data);
      sel = { kind: "bubble", panelId: panel.Id, id: data.Id };
    }
  }, true);
  if (sel) store.getState().select(sel);
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < POS_EPS;
}

/* ---------- 실행취소/다시실행 ---------- */

export function undo(): void {
  store.getState().undo();
}

export function redo(): void {
  store.getState().redo();
}

export { makeId };
