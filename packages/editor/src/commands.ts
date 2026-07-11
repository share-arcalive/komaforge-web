import {
  applyLayout,
  clampStripWidth,
  createBubble,
  createCut,
  createImage,
  createPage,
  createPanel,
  createProject,
  createStripProject,
  defaultCutHeight,
  makeId,
  STRIP_DEFAULT_WIDTH,
  type ComicPageData,
  type ComicPanelData,
  type ComicProjectData,
  type PanelImageData,
  type SpeechBubbleData,
} from "@repo/core";
import { editorStore } from "./store";
import { assetRef, clearAssets, getAsset } from "./assets";
import { currentPage, findBubble, findImage, findPanel, type Selection } from "./types";

const store = editorStore;

/* ---------- 문서 / 페이지 ---------- */

export function newProject(): void {
  clearAssets(); // 이전 문서 자산이 다음 저장 번들에 고아로 남지 않게
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
  // 칸이 재구성됐으니 페이지 컨텍스트로(페이지 액션 패널이 유지되도록).
  store.getState().select({ kind: "cut", cutIndex: pageIndex });
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
    const page = createPage(`Page ${p.Pages.length + 1}`);
    // 스트립 문서면 전역 너비/마지막 페이지 높이를 계승 — 832 기본값이 StripWidth 불변식을 깨서
    // 다음 로드에서 조용히 너비가 바뀌는 것을 막는다.
    if (p.StripWidth > 0) {
      page.PageWidth = p.StripWidth;
      page.PageHeight = p.Pages[p.Pages.length - 1]?.PageHeight ?? defaultCutHeight(p.StripWidth);
    }
    p.Pages.push(page);
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

/* ---------- 세로 스트립 / 페이지 ---------- */
// 스트립 문서(StripWidth > 0)는 모든 페이지가 전역 너비를 공유한다.

/** 페이지 N개로 시작하는 새 세로 스트립 문서. 초기 템플릿(4/8/12/16페이지)용. */
export function newStripProject(cutCount = 4, width: number = STRIP_DEFAULT_WIDTH): void {
  clearAssets(); // 이전 문서 자산이 다음 저장 번들에 고아로 남지 않게
  store.getState().setProject(createStripProject(width, cutCount), 0);
}

/** 스트립 전역 너비(690–1500) 설정. 콘텐츠는 절대 크기 유지 — 페이지 너비만 동기화.
 *  슬라이더 드래그처럼 연속 호출되는 경로는 checkpoint=false로(히스토리 홍수 방지 —
 *  체크포인트는 pointerdown/focus에서 1회). */
export function setStripWidth(width: number, checkpoint = true): void {
  store.getState().apply((p) => {
    p.StripWidth = clampStripWidth(width);
    for (const pg of p.Pages) pg.PageWidth = p.StripWidth;
  }, checkpoint);
}

/** 페이지 활성 + 페이지 선택(스트립에서 페이지 클릭/키보드 이동). 선택을 지우지 않는 활성 전환. */
export function activateCut(index: number): void {
  const len = store.getState().project.Pages.length;
  const clamped = Math.min(Math.max(index, 0), Math.max(0, len - 1));
  store.getState().setPageIndex(clamped, { kind: "cut", cutIndex: clamped });
}

/** afterIndex(기본: 현재 페이지) 뒤에 새 페이지 삽입 — 이웃 페이지의 크기를 계승. */
export function addCut(afterIndex?: number): void {
  const state = store.getState();
  const insertAt = Math.min(
    Math.max((afterIndex ?? state.pageIndex) + 1, 0),
    state.project.Pages.length,
  );
  store.getState().apply((p) => {
    const neighbor = p.Pages[Math.max(0, insertAt - 1)];
    const width =
      p.StripWidth > 0 ? p.StripWidth : (neighbor?.PageWidth ?? STRIP_DEFAULT_WIDTH);
    const cut = createCut(width, neighbor?.PageHeight ?? defaultCutHeight(width), `페이지 ${p.Pages.length + 1}`);
    // 레거시 문서(StripWidth=0)에선 이웃 너비를 클램프 없이 그대로 계승한다.
    cut.PageWidth = width;
    p.Pages.splice(insertAt, 0, cut);
  }, true);
  store.getState().setPageIndex(insertAt, { kind: "cut", cutIndex: insertAt });
}

/** 페이지 순서 이동 + 활성/선택 추적(페이지 패널 위/아래 버튼용 — movePage는 인덱스를 따라가지 않음). */
export function moveCut(index: number, direction: -1 | 1): void {
  const to = index + direction;
  if (to < 0 || to >= store.getState().project.Pages.length) return;
  movePage(index, direction);
  store.getState().setPageIndex(to, { kind: "cut", cutIndex: to });
}

/** 페이지 삭제(최소 1개 유지) 후 이웃 페이지를 선택. */
export function removeCut(index: number): void {
  const state = store.getState();
  if (state.project.Pages.length <= 1) return;
  state.apply((p) => {
    p.Pages.splice(index, 1);
  }, true);
  const ni = Math.min(index, store.getState().project.Pages.length - 1);
  store.getState().setPageIndex(ni, { kind: "cut", cutIndex: ni });
}

/** 페이지 높이 변경. 드래그 중엔 checkpoint=false로 호출해 히스토리 홍수 방지. */
export function setCutHeight(index: number, height: number, checkpoint = true): void {
  store.getState().apply((p) => {
    const pg = p.Pages[index];
    if (pg) pg.PageHeight = Math.max(1, Math.round(height));
  }, checkpoint);
}

/** 페이지 복제(내부 칸·이미지·말풍선 ID 재발급) 후 바로 뒤에 삽입, 새 페이지 선택. */
export function duplicateCut(index: number): void {
  const src = store.getState().project.Pages[index];
  if (!src) return;
  store.getState().apply((p) => {
    const clone = cloneData(p.Pages[index]!);
    regeneratePageIds(clone);
    clone.Name = `${clone.Name || `페이지 ${index + 1}`} 사본`;
    p.Pages.splice(index + 1, 0, clone);
  }, true);
  store.getState().setPageIndex(index + 1, { kind: "cut", cutIndex: index + 1 });
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
  if (selection.kind === "cut") {
    removeCut(selection.cutIndex ?? pageIndex);
    return;
  }
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
  if (selection.kind === "cut") {
    moveCut(selection.cutIndex ?? pageIndex, direction);
    return;
  }
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
  if (selection.kind === "none" || selection.kind === "cut") return;
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
  if (!page || selection.kind === "cut") return;
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
  const kind = store.getState().selection.kind;
  // 페이지 선택은 클립보드 대상이 아니다 — copySelection이 no-op인데 deleteSelection은
  // 페이지를 통째로 지워버리므로(Ctrl+X 사고) 여기서 막는다.
  if (kind === "none" || kind === "cut") return;
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

/* ---------- 비주얼 노벨 모드 (원본 VisualNovel.cs / FlowText.cs) ---------- */

// 복제 페이지의 칸·이미지·말풍선 ID를 모두 새로 부여(원본 RegeneratePageIds).
function regeneratePageIds(page: ComicPageData): void {
  for (const panel of page.Panels) {
    panel.Id = makeId();
    for (const image of panel.Images) image.Id = makeId();
    for (const bubble of panel.Bubbles) bubble.Id = makeId();
  }
}

// '이름: 대사' → {name, narration}. 콜론(':' 또는 '：')이 없으면 name=null, narration=전체. 원본 SplitScriptLine.
function splitScriptLine(line: string): { name: string | null; narration: string } {
  const idx = (() => {
    const a = line.indexOf(":");
    const b = line.indexOf("：");
    if (a < 0) return b;
    if (b < 0) return a;
    return Math.min(a, b);
  })();
  if (idx > 0) {
    const name = line.slice(0, idx).trim();
    const narration = line.slice(idx + 1).trim();
    return { name: name.length === 0 ? null : name, narration };
  }
  return { name: null, narration: line.trim() };
}

function templateHasBubble(page: ComicPageData, marker: string): boolean {
  return page.Panels.some((p) => p.Bubbles.some((b) => (b.Text ?? "").trim() === marker));
}

/** VN 모드 ON/OFF. 켤 때 템플릿이 하나도 없으면 기본 템플릿을 만든다(원본 ToggleTextMode/EnsureDefaultVnTemplate). */
export function setVnEnabled(on: boolean): void {
  store.getState().apply((p) => {
    p.FlowText.Enabled = on;
    if (on && p.VnTemplates.length === 0) {
      p.VnTemplates.push(makeDefaultVnTemplate(p));
    }
  }, true);
}

// 기본 템플릿: '이름'·'서술' 말풍선을 가진 한 장(원본 DefaultVnTemplate.json 대응).
function makeDefaultVnTemplate(p: ComicProjectData): ComicPageData {
  const w = p.Pages[0]?.PageWidth ?? 832;
  const h = p.Pages[0]?.PageHeight ?? 1216;
  const page = createPage(`템플릿 ${p.VnTemplates.length + 1}`);
  page.PageWidth = w;
  page.PageHeight = h;
  const panel = createPanel(1, 0, 0, w, h);
  const nameB = createBubble(w * 0.1, h * 0.6);
  nameB.Text = "이름";
  nameB.Width = w * 0.3;
  nameB.Height = 60;
  const narrB = createBubble(w * 0.1, h * 0.68);
  narrB.Text = "서술";
  narrB.Width = w * 0.8;
  narrB.Height = h * 0.25;
  panel.Bubbles.push(nameB, narrB);
  page.Panels.push(panel);
  return page;
}

/** 현재 페이지(또는 편집 중 템플릿)를 복제해 템플릿 목록에 추가(원본 VnAddTemplate). */
export function addVnTemplateFromCurrentPage(): void {
  const { project, pageIndex } = store.getState();
  const src = project.Pages[pageIndex];
  if (!src) return;
  store.getState().apply((p) => {
    const clone = cloneData(src);
    regeneratePageIds(clone);
    clone.Name = `템플릿 ${p.VnTemplates.length + 1}`;
    p.VnTemplates.push(clone);
  }, true);
}

/** 기본 템플릿('이름'/'서술')을 목록에 추가. */
export function addDefaultVnTemplate(): void {
  store.getState().apply((p) => {
    p.VnTemplates.push(makeDefaultVnTemplate(p));
  }, true);
}

export function removeVnTemplate(index: number): void {
  store.getState().apply((p) => {
    if (index >= 0 && index < p.VnTemplates.length) p.VnTemplates.splice(index, 1);
  }, true);
}

/** 스크립트 각 줄마다 템플릿을 복제하고 '이름'/'서술' 말풍선을 교체해 페이지 생성(원본 VnGenerate_Click).
 *  반환: {ok, count, error}. error가 있으면 생성 안 함. */
export function generateVnPages(
  script: string,
  templateIndex: number,
): { ok: boolean; count: number; error?: string } {
  const { project } = store.getState();
  const template = project.VnTemplates[templateIndex];
  if (!template) return { ok: false, count: 0, error: "템플릿을 먼저 선택하세요." };

  const lines = script
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { ok: false, count: 0, error: "스크립트 텍스트를 입력하세요." };

  const hasName = templateHasBubble(template, "이름");
  const hasNarration = templateHasBubble(template, "서술");
  if (!hasName || !hasNarration) {
    return {
      ok: false,
      count: 0,
      error: `템플릿에 '이름'·'서술' 말풍선이 모두 필요합니다(현재: 이름 ${hasName ? "있음" : "없음"}, 서술 ${hasNarration ? "있음" : "없음"}).`,
    };
  }

  const firstNewIndex = project.Pages.length;
  store.getState().apply((p) => {
    for (const line of lines) {
      const { name, narration } = splitScriptLine(line);
      const page = cloneData(p.VnTemplates[templateIndex]!);
      regeneratePageIds(page);
      page.Name = `Page ${p.Pages.length + 1}`;
      applyScriptToPage(page, name, narration);
      p.Pages.push(page);
    }
  }, true);
  store.getState().setPageIndex(firstNewIndex);
  return { ok: true, count: lines.length };
}

// 복제 페이지의 '이름'/'서술' 말풍선을 교체. 이름 없는 줄이면 '이름' 말풍선 삭제(원본 ApplyScriptToPage).
function applyScriptToPage(page: ComicPageData, name: string | null, narration: string): void {
  for (const panel of page.Panels) {
    const kept: SpeechBubbleData[] = [];
    for (const b of panel.Bubbles) {
      const marker = (b.Text ?? "").trim();
      if (marker === "이름") {
        if (name === null) continue; // 이름 없는 줄 → 이름 말풍선 삭제.
        b.Text = name;
        b.Runs = [];
      } else if (marker === "서술") {
        b.Text = narration;
        b.Runs = [];
      }
      kept.push(b);
    }
    panel.Bubbles = kept;
  }
}

/* ---------- 실행취소/다시실행 ---------- */

export function undo(): void {
  store.getState().undo();
}

export function redo(): void {
  store.getState().redo();
}

export { makeId };
