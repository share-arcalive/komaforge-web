import { useCallback } from "react";
import { DockviewReact, themeDark } from "dockview";
import type { DockviewReadyEvent } from "dockview";

import "dockview/dist/styles/dockview.css";
import "../styles/dockview-theme.css";

import { PANEL_COMPONENTS } from "../panels/registry";
import { LAYOUT_KEY, buildInitialLayout, setWorkspaceApi } from "../lib/workspace";

// dockview `components` 맵 — registry kind 를 component id 로 그대로 사용(안정 참조).
const components = PANEL_COMPONENTS;

/** 도킹 워크스페이스(클라이언트 전용) — 캔버스/속성 패널을 도킹·플로팅·탭으로. */
export function DockWorkspace() {
  const onReady = useCallback((event: DockviewReadyEvent) => {
    const { api } = event;
    setWorkspaceApi(api);

    // 저장된 레이아웃 복원(실패 시 초기 레이아웃).
    let restored = false;
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) {
        api.fromJSON(JSON.parse(saved));
        restored = true;
      }
    } catch (err) {
      console.warn("레이아웃 복원 실패 → 초기 레이아웃으로 시작", err);
      try {
        api.clear();
        localStorage.removeItem(LAYOUT_KEY);
      } catch {
        // 정리 실패는 무시
      }
    }
    if (!restored) buildInitialLayout(api);

    // 레이아웃 변경마다 자동 저장.
    api.onDidLayoutChange(() => {
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(api.toJSON()));
      } catch {
        // 직렬화/저장 실패는 무시(다음 변경에서 재시도)
      }
    });
  }, []);

  return <DockviewReact components={components} theme={themeDark} onReady={onReady} />;
}
