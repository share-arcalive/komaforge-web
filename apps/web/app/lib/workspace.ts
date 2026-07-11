import type { DockviewApi } from "dockview";
import { PANEL_META, type PanelKind } from "../panels/registry";

/** dockview 레이아웃 직렬화 저장 키. (v3: 패널 제목 페이지 표기 통일로 기존 레이아웃 폐기) */
export const LAYOUT_KEY = "mwm.layout.v3";

let api: DockviewApi | null = null;

export function setWorkspaceApi(a: DockviewApi | null): void {
  api = a;
}

export function getWorkspaceApi(): DockviewApi | null {
  return api;
}

/** 초기 레이아웃: 페이지(좌) · 캔버스(중앙) · 속성(우). */
export function buildInitialLayout(a: DockviewApi): void {
  a.addPanel({ id: "canvas", component: "canvas", title: PANEL_META.canvas.title });
  a.addPanel({
    id: "pages",
    component: "pages",
    title: PANEL_META.pages.title,
    position: { referencePanel: "canvas", direction: "left" },
    initialWidth: 220,
  });
  a.addPanel({
    id: "inspector",
    component: "inspector",
    title: PANEL_META.inspector.title,
    position: { referencePanel: "canvas", direction: "right" },
    initialWidth: 320,
  });
}

/** 패널을 보이게 한다 — 이미 있으면 활성화, 없으면 추가(닫았던 패널 복구용). */
export function showPanel(kind: PanelKind): void {
  if (!api) return;
  const existing = api.getPanel(kind);
  if (existing) {
    existing.api.setActive();
    return;
  }
  const onLeft = kind === "pages";
  api.addPanel({
    id: kind,
    component: kind,
    title: PANEL_META[kind].title,
    position: api.getPanel("canvas")
      ? { referencePanel: "canvas", direction: onLeft ? "left" : "right" }
      : undefined,
    initialWidth: onLeft ? 220 : 320,
  });
}

/** "사용법" 도킹 탭 열기 — 이미 있으면 활성화, 없으면 캔버스와 같은 그룹에 탭으로 추가.
 *  모달이 아니라 상주 탭이므로 편집을 옆에 두고 볼 수 있다. */
export function openHelpPanel(): void {
  if (!api) return;
  const existing = api.getPanel("help");
  if (existing) {
    existing.api.setActive();
    return;
  }
  api.addPanel({
    id: "help",
    component: "help",
    title: PANEL_META.help.title,
    // 캔버스와 같은 그룹의 탭으로 → "캔버스 | 사용법"처럼 넓게 읽힌다.
    position: api.getPanel("canvas") ? { referencePanel: "canvas", direction: "within" } : undefined,
  });
}

/** 레이아웃 초기화: 저장 삭제 + 기본 배치 재생성(닫아버린 패널 복구용). */
export function resetLayout(): void {
  if (!api) return;
  api.clear();
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {
    // 무시
  }
  buildInitialLayout(api);
}
